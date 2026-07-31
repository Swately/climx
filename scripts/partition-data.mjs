// climx data pipeline, step 2: partition the national payload into the shapes the
// client fetches. EVERY key is the composite (ides, idmun) — wall W1: idmun alone is
// state-scoped (570 values / 2,463 municipios) and collides for 85.7% of Mexico.
// Usage: node partition-data.mjs <in.json> <outDir>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Per-day fields kept in a forecast file (the view's actual need).
const DAY_FIELDS = [
  'ndia',
  'dloc',
  'desciel',
  'tmax',
  'tmin',
  'prec',
  'probprec',
  'velvien',
  'dirvienc',
  'raf',
  'cc',
];

/**
 * Groups records by composite key. Returns { index, estados, municipios }:
 * - index: rows [ides, idmun, nmun, nes, lat, lon] (ides FIRST — no consumer can forget it)
 * - estados: rows [ides, nes], sorted by numeric ides
 * - municipios: Map key `${ides}/${idmun}` -> denormalized { ides, idmun, nmun, nes, lat, lon, days[] }
 */
export function partition(records) {
  const municipios = new Map();
  for (const r of records) {
    const key = `${r.ides}/${r.idmun}`;
    let m = municipios.get(key);
    if (!m) {
      m = {
        ides: r.ides,
        idmun: r.idmun,
        nmun: r.nmun,
        nes: r.nes,
        lat: r.lat,
        lon: r.lon,
        days: [],
      };
      municipios.set(key, m);
    }
    const day = {};
    for (const f of DAY_FIELDS) day[f] = r[f];
    m.days.push(day);
  }
  for (const m of municipios.values()) {
    m.days.sort((a, b) => Number(a.ndia) - Number(b.ndia));
  }
  const index = [...municipios.values()].map((m) => [m.ides, m.idmun, m.nmun, m.nes, m.lat, m.lon]);
  const estadosMap = new Map();
  for (const m of municipios.values()) if (!estadosMap.has(m.ides)) estadosMap.set(m.ides, m.nes);
  const estados = [...estadosMap.entries()]
    .map(([ides, nes]) => [ides, nes])
    .sort((a, b) => Number(a[0]) - Number(b[0]));
  return { index, estados, municipios };
}

/**
 * `images` maps "ides/idmun" -> { file, filePage, artist, license, licenseUrl, cat }
 * (produced by harvest-muni-images.mjs). Each entry is folded INTO its forecast
 * file as `img`, so the municipio view fetches everything it renders in one
 * request. The weather core stays independent: an absent/empty index simply
 * means no `img` field — forecasts are written exactly the same.
 */
export function writeOutput(outDir, parts, fetchedAt, images = {}) {
  const { index, estados, municipios } = parts;
  let written = 0;
  let withImg = 0;
  for (const m of municipios.values()) {
    const dir = join(outDir, 'forecast', String(m.ides));
    mkdirSync(dir, { recursive: true });
    const img = images[`${m.ides}/${m.idmun}`] ?? null;
    if (img) withImg++;
    writeFileSync(join(dir, `${m.idmun}.json`), JSON.stringify(img ? { ...m, img } : m));
    written++;
  }
  if (Object.keys(images).length > 0) console.log(`  merged img into ${withImg} forecast files`);
  // The count assertion is structural: files written must equal composite-key count.
  if (written !== municipios.size || index.length !== municipios.size) {
    throw new Error(
      `count mismatch: wrote ${written}, municipios ${municipios.size}, index ${index.length}`,
    );
  }
  mkdirSync(join(outDir, 'index'), { recursive: true });
  writeFileSync(join(outDir, 'index', 'all-lite.json'), JSON.stringify(index));
  writeFileSync(join(outDir, 'index', 'estados.json'), JSON.stringify(estados));
  const meta = {
    fetchedAt,
    ok: true,
    lastAttempt: fetchedAt,
    recordCount: [...municipios.values()].reduce((n, m) => n + m.days.length, 0),
    municipioCount: municipios.size,
    estadoCount: estados.length,
  };
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta));
  return meta;
}

function main() {
  const [inPath, outDir] = process.argv.slice(2);
  if (!inPath || !outDir) {
    console.error('usage: node partition-data.mjs <in.json> <outDir>');
    process.exit(2);
  }
  const records = JSON.parse(readFileSync(inPath, 'utf8'));
  const parts = partition(records);
  // Optional: the harvested image index, folded into the forecast files.
  const imagesPath = join(outDir, 'images.json');
  const images = existsSync(imagesPath) ? JSON.parse(readFileSync(imagesPath, 'utf8')) : {};
  const meta = writeOutput(outDir, parts, new Date().toISOString(), images);
  console.log(
    `ok: ${meta.municipioCount} municipios (${meta.estadoCount} estados, ${meta.recordCount} day-records) -> ${outDir}`,
  );
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())
) {
  main();
}

// Made with my soul - Swately <3
