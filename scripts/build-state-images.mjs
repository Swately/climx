// One-time (re-runnable) asset build: the v0 state photos (123 MB of PNG/JPG,
// preserved at tag v0-school) -> public/img/estados/{ides}.webp, 640px wide,
// quality 75. Keyed by numeric ides like everything else (wall W1 discipline).
// Usage: node build-state-images.mjs <srcDir> [outDir]
//   srcDir = a checkout of v0-school:src/images/Estados_De_Mexico/PNG
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

// estados.json name -> v0 filename stem (filenames have no accents; mixed ext).
const NAME_TO_STEM = {
  Aguascalientes: 'Aguascalientes',
  'Baja California': 'Baja-California',
  'Baja California Sur': 'Baja-California-Sur',
  Campeche: 'Campeche',
  Coahuila: 'Coahuila',
  Colima: 'Colima',
  Chiapas: 'Chiapas',
  Chihuahua: 'Chihuahua',
  'Ciudad de México': 'Ciudad de Mexico',
  Durango: 'Durango',
  Guanajuato: 'Guanajuato',
  Guerrero: 'Guerrero',
  Hidalgo: 'Hidalgo',
  Jalisco: 'Jalisco',
  'Estado de México': 'Estado de Mexico',
  'Michoacán de Ocampo': 'Michoacan',
  Morelos: 'Morelos',
  Nayarit: 'Nayarit',
  'Nuevo León': 'Nuevo Leon',
  Oaxaca: 'Oaxaca',
  Puebla: 'Puebla',
  'Querétaro de Arteaga': 'Queretaro',
  'Quintana Roo': 'Quintana Roo',
  'San Luis Potosí': 'San Luis Potosi',
  Sinaloa: 'Sinaloa',
  Sonora: 'Sonora',
  Tabasco: 'Tabasco',
  Tamaulipas: 'Tamaulipas',
  Tlaxcala: 'Tlaxcala',
  'Veracruz de Ignacio de la Llave': 'Veracruz',
  Yucatán: 'Yucatan',
  Zacatecas: 'Zacatecas',
};

async function main() {
  const [srcDir, outDir = 'public/img/estados'] = process.argv.slice(2);
  if (!srcDir) {
    console.error('usage: node build-state-images.mjs <srcDir> [outDir]');
    process.exit(2);
  }
  const estados = JSON.parse(
    (await import('node:fs')).readFileSync('public/data/index/estados.json', 'utf8'),
  );
  const files = readdirSync(srcDir);
  mkdirSync(outDir, { recursive: true });
  let total = 0;
  const missing = [];
  for (const [ides, nes] of estados) {
    const stem = NAME_TO_STEM[nes];
    const file = stem && files.find((f) => f.startsWith(stem + '.'));
    if (!file) {
      missing.push(`${ides} ${nes}`);
      continue;
    }
    const out = join(outDir, `${ides}.webp`);
    await sharp(join(srcDir, file)).resize({ width: 640 }).webp({ quality: 75 }).toFile(out);
    const kb = statSync(out).size / 1024;
    total += kb;
    console.log(`${ides}.webp <- ${file} (${kb.toFixed(0)} KB)`);
  }
  console.log(
    `total: ${(total / 1024).toFixed(2)} MB across ${estados.length - missing.length} images`,
  );
  if (missing.length) {
    console.error(`MISSING (${missing.length}): ${missing.join(', ')}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Made with my soul - Swately <3
