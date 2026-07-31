// Pipeline unit + forced-failure tests (S2). The W1 regression lives here: two
// municipios sharing idmun across states must never collide.
import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodePayload, validatePayload, REQUIRED_FIELDS } from './fetch-smn.mjs';
import { partition, writeOutput } from './partition-data.mjs';

// Template record with every required field (shape from the live payload, E3).
const rec = (over) => ({
  ides: '20',
  idmun: '54',
  nes: 'Oaxaca',
  nmun: 'Magdalena Zahuatlán',
  lat: '17.3884',
  lon: '-97.229',
  ndia: '0',
  dloc: '20260728T00',
  tmax: '23.0',
  tmin: '9.1',
  desciel: 'Despejado',
  prec: '0.1',
  probprec: '0',
  velvien: '8.7',
  dirvienc: 'Noreste',
  raf: '17.7',
  cc: '78.9',
  ...over,
});

// The W1 fixture: same idmun (54) in two different states + a third municipio.
const W1_FIXTURE = [
  rec({ ndia: '1', dloc: '20260729T00' }),
  rec(),
  rec({ ides: '14', nes: 'Jalisco', nmun: 'El Limón', lat: '19.7', lon: '-104.1', tmax: '31.0' }),
  rec({ ides: '14', idmun: '1', nes: 'Jalisco', nmun: 'Acatic' }),
];

describe('decodePayload', () => {
  it('decodes gzip and plain JSON alike', () => {
    const json = JSON.stringify([rec()]);
    expect(decodePayload(gzipSync(Buffer.from(json)))).toEqual([rec()]);
    expect(decodePayload(Buffer.from(json))).toEqual([rec()]);
  });
});

describe('validatePayload (schema guard)', () => {
  const many = Array.from({ length: 2500 }, () => rec());
  it('accepts a well-formed payload', () => {
    expect(validatePayload(many)).toBeNull();
  });
  it('rejects non-arrays and short payloads', () => {
    expect(validatePayload({})).toMatch(/not an array/);
    expect(validatePayload([rec()])).toMatch(/too few/);
  });
  it('rejects a payload missing a required field', () => {
    for (const f of REQUIRED_FIELDS) {
      const broken = many.map((r) => ({ ...r }));
      delete broken[0][f];
      expect(validatePayload(broken)).toContain(f);
    }
  });
});

describe('partition (wall W1: composite key)', () => {
  const parts = partition(W1_FIXTURE);

  it('keeps same-idmun municipios in different states SEPARATE', () => {
    expect(parts.municipios.size).toBe(3);
    const oaxaca = parts.municipios.get('20/54');
    const jalisco = parts.municipios.get('14/54');
    expect(oaxaca.nmun).toBe('Magdalena Zahuatlán');
    expect(jalisco.nmun).toBe('El Limón');
    expect(oaxaca.days.length).toBe(2);
    expect(jalisco.days.length).toBe(1);
  });

  it('sorts days by ndia and keeps index rows ides-first', () => {
    const oaxaca = parts.municipios.get('20/54');
    expect(oaxaca.days.map((d) => d.ndia)).toEqual(['0', '1']);
    for (const row of parts.index) {
      expect(row).toHaveLength(6);
      expect(['20', '14']).toContain(row[0]);
    }
  });

  it('derives unique, sorted estados', () => {
    expect(parts.estados).toEqual([
      ['14', 'Jalisco'],
      ['20', 'Oaxaca'],
    ]);
  });
});

describe('writeOutput', () => {
  it('writes one file per composite key + index + meta with true counts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'climx-test-'));
    const meta = writeOutput(dir, partition(W1_FIXTURE), '2026-07-28T00:00:00.000Z');
    expect(meta.municipioCount).toBe(3);
    expect(meta.recordCount).toBe(4);
    expect(existsSync(join(dir, 'forecast', '20', '54.json'))).toBe(true);
    expect(existsSync(join(dir, 'forecast', '14', '54.json'))).toBe(true);
    expect(existsSync(join(dir, 'forecast', '14', '1.json'))).toBe(true);
    const idx = JSON.parse(readFileSync(join(dir, 'index', 'all-lite.json'), 'utf8'));
    expect(idx).toHaveLength(3);
  });

  it('folds the image index into its own municipio only (composite-keyed, W1)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'climx-img-'));
    const images = {
      '20/54': { file: 'Zahuatlan.jpg', artist: 'A', license: 'CC0', cat: 'Zahuatlan' },
      // Same idmun, different state: must NOT leak into 20/54.
      '14/54': { file: null, artist: null, license: null, cat: 'El Limon' },
    };
    writeOutput(dir, partition(W1_FIXTURE), '2026-07-28T00:00:00.000Z', images);
    const oax = JSON.parse(readFileSync(join(dir, 'forecast', '20', '54.json'), 'utf8'));
    const jal = JSON.parse(readFileSync(join(dir, 'forecast', '14', '54.json'), 'utf8'));
    const acatic = JSON.parse(readFileSync(join(dir, 'forecast', '14', '1.json'), 'utf8'));
    expect(oax.img.file).toBe('Zahuatlan.jpg');
    expect(jal.img).toEqual(images['14/54']);
    expect(acatic.img).toBeUndefined(); // no entry -> field absent entirely
  });

  it('writes identical forecasts when no image index exists (core stays independent)', () => {
    const a = mkdtempSync(join(tmpdir(), 'climx-noimg-a-'));
    const b = mkdtempSync(join(tmpdir(), 'climx-noimg-b-'));
    writeOutput(a, partition(W1_FIXTURE), '2026-07-28T00:00:00.000Z');
    writeOutput(b, partition(W1_FIXTURE), '2026-07-28T00:00:00.000Z', {});
    expect(readFileSync(join(a, 'forecast', '20', '54.json'), 'utf8')).toBe(
      readFileSync(join(b, 'forecast', '20', '54.json'), 'utf8'),
    );
  });
});

describe('fetch-smn forced failure (wall W3)', () => {
  it('exits non-zero and writes NOTHING when SMN is unreachable', () => {
    const dir = mkdtempSync(join(tmpdir(), 'climx-fail-'));
    const out = join(dir, 'never.json');
    let code = 0;
    try {
      execFileSync(process.execPath, ['scripts/fetch-smn.mjs', out], {
        env: { ...process.env, SMN_URL: 'http://127.0.0.1:9/unreachable' },
        stdio: 'pipe',
        timeout: 30_000,
      });
    } catch (e) {
      code = e.status ?? 1;
    }
    expect(code).not.toBe(0);
    expect(existsSync(out)).toBe(false);
  });
});

// Made with my soul - Swately <3
