// climx data pipeline, step 1: fetch + decode + validate the SMN payload.
// On ANY failure: exit non-zero having written NOTHING (wall W3 — last-good data
// is never touched by a bad run). Usage: node fetch-smn.mjs <out.json>
import { gunzipSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

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

/** Returns null when valid, else a human-readable reason (the schema guard). */
export function validatePayload(data) {
  if (!Array.isArray(data)) return 'payload is not an array';
  if (data.length <= 2000) return `too few records: ${data.length}`;
  const sample = data[0];
  if (typeof sample !== 'object' || sample === null) return 'first record is not an object';
  for (const f of REQUIRED_FIELDS) {
    if (!(f in sample)) return `missing field in sample record: ${f}`;
  }
  return null;
}

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
  const reason = validatePayload(data);
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
