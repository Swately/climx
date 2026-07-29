// climx data pipeline, step 3: stamp the attempt in meta.json — on EVERY run,
// success or failure. On failure only { ok:false, lastAttempt } change; the
// last-good fetchedAt is preserved (wall W3). The always-commit of this file keeps
// repo activity alive against GitHub's 60-day scheduled-workflow auto-disable.
// Usage: node mark-attempt.mjs <dataDir> [failed]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function main() {
  const [dataDir, flag] = process.argv.slice(2);
  if (!dataDir) {
    console.error('usage: node mark-attempt.mjs <dataDir> [failed]');
    process.exit(2);
  }
  const metaPath = join(dataDir, 'meta.json');
  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  } catch {
    meta = { fetchedAt: null, ok: false };
  }
  meta.lastAttempt = new Date().toISOString();
  if (flag === 'failed') meta.ok = false;
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(metaPath, JSON.stringify(meta));
  console.log(`attempt stamped (ok=${meta.ok})`);
}

main();

// Made with my soul - Swately <3
