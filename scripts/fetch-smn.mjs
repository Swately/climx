// climx data pipeline, step 1: fetch + decode + validate the SMN payload.
// On ANY failure: exit non-zero having written NOTHING (wall W3 — last-good data
// is never touched by a bad run). Usage: node fetch-smn.mjs <out.json>
import { gunzipSync } from 'node:zlib';
import { writeFileSync, readFileSync } from 'node:fs';

export const SMN_URL = 'https://smn.conagua.gob.mx/tools/GUI/webservices/?method=1';

// Fields every record must carry (schema guard; verified against the live payload
// 2026-07-19 — see docs/planning/aap/AAP_OBJECTIVE.md E3).
export const REQUIRED_FIELDS = [
  'ides',
  'idmun',
  'nes',
  'nmun',
  'lat',
  'lon',
  'ndia',
  'dloc',
  'tmax',
  'tmin',
  'desciel',
];

/** Gunzips if the buffer has the gzip magic bytes, then parses JSON. */
export function decodePayload(buf) {
  const b = Buffer.from(buf);
  const text =
    b.length > 2 && b[0] === 0x1f && b[1] === 0x8b
      ? gunzipSync(b).toString('utf8')
      : b.toString('utf8');
  return JSON.parse(text);
}

/**
 * Returns null when valid, else a human-readable reason (the schema guard).
 *
 * `expectedRecords` is the last successful run's recordCount when known: a
 * partial SMN response (a few states missing) is the dangerous case, because it
 * parses fine and would silently overwrite good data with an incomplete map.
 * The floor is therefore relative (90% of last-known) with an absolute backstop,
 * and EVERY record is shape-checked — not just the first — so a malformed entry
 * cannot reach the partitioner.
 */
export function validatePayload(data, expectedRecords = null) {
  if (!Array.isArray(data)) return 'payload is not an array';

  const floor = expectedRecords
    ? Math.max(ABSOLUTE_MIN_RECORDS, Math.floor(expectedRecords * 0.9))
    : ABSOLUTE_MIN_RECORDS;
  if (data.length < floor) {
    return (
      `too few records: ${data.length} < ${floor}` +
      (expectedRecords ? ` (90% of last-known ${expectedRecords})` : '')
    );
  }

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    if (typeof r !== 'object' || r === null) return `record ${i} is not an object`;
    for (const f of REQUIRED_FIELDS) {
      if (!(f in r)) return `record ${i} missing field: ${f}`;
    }
  }

  // A truncated payload can still be well-formed: check the municipio coverage.
  const municipios = new Set(data.map((r) => `${r.ides}/${r.idmun}`));
  const expectedMunicipios = expectedRecords ? Math.floor((expectedRecords / 4) * 0.9) : 0;
  if (expectedMunicipios && municipios.size < expectedMunicipios) {
    return `too few municipios: ${municipios.size} < ${expectedMunicipios}`;
  }
  return null;
}

/** Absolute backstop when no previous run is known (~81% of the 9,852 observed). */
export const ABSOLUTE_MIN_RECORDS = 8000;

async function main() {
  const out = process.argv[2];
  if (!out) {
    console.error('usage: node fetch-smn.mjs <out.json>');
    process.exit(2);
  }
  const url = process.env.SMN_URL ?? SMN_URL;
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    console.error(`SMN responded ${res.status}`);
    process.exit(1);
  }
  const data = decodePayload(await res.arrayBuffer());
  // Compare against the last successful run when the deployed meta is at hand.
  let expected = null;
  try {
    const meta = JSON.parse(readFileSync('public/data/meta.json', 'utf8'));
    expected = typeof meta.recordCount === 'number' ? meta.recordCount : null;
  } catch {
    // First run, or no repo checkout: the absolute backstop applies.
  }
  const reason = validatePayload(data, expected);
  if (reason !== null) {
    console.error(`payload rejected: ${reason}`);
    process.exit(1);
  }
  writeFileSync(out, JSON.stringify(data));
  console.log(`ok: ${data.length} records -> ${out}`);
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())
) {
  main().catch((err) => {
    console.error(`fetch failed: ${err?.message ?? err}`);
    process.exit(1);
  });
}

// Made with my soul - Swately <3
