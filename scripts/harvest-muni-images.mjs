// climx municipio-image harvester (Wikidata/Commons, free-licensed).
// Subcommands:
//   plan <planPath>          SPARQL pull + join to (ides,idmun) + choose source per
//                            municipio -> writes the plan JSON + prints measured counts.
//   run <planPath>           download originals, convert to WebP 640, write sidecars
//                            (category + credit) + aggregate credits.json. Resumable:
//                            skips municipios whose .webp already exists.
// Sources per municipio, in order: Wikidata P18 -> es-wiki lead image (pageimages).
// Build-time filters: escudo/flag/map/seal/logo/locator/svg filenames are never used.
// Wall W1: every output is keyed by the composite (ides, idmun).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import sharp from 'sharp';

const UA = 'climx-image-harvester/1.0 (personal project; github.com/Swately/project-tw)';
const SPARQL = 'https://query.wikidata.org/sparql';
const BAD_FILE =
  /escudo|coat[_ ]of[_ ]arms|bandera|flag|mapa|map[_ .(]|glifo|glyph|seal|logo|locator|\.svg$|\.pdf$|\.tif$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function norm(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^municipio de /, '')
    .trim();
}

async function fetchJson(url, opts = {}) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    let retryAfterMs = 0;
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { 'User-Agent': UA, ...(opts.headers ?? {}) },
        signal: AbortSignal.timeout(120_000),
      });
      if (res.status === 429) {
        retryAfterMs = (Number(res.headers.get('retry-after')) || 15 * attempt) * 1000;
        throw new Error('HTTP 429');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 5) throw e;
      await sleep(retryAfterMs || 3000 * attempt);
    }
  }
}

// ---------- plan ----------

async function plan(planPath) {
  const index = JSON.parse(readFileSync('public/data/index/all-lite.json', 'utf8'));

  const query = `SELECT ?m ?mLabel ?stLabel ?img ?cat ?art WHERE {
    ?m wdt:P31 wd:Q1952852 .
    OPTIONAL { ?m wdt:P18 ?img }
    OPTIONAL { ?m wdt:P373 ?cat }
    OPTIONAL { ?m wdt:P131 ?st }
    OPTIONAL { ?art schema:about ?m ; schema:isPartOf <https://es.wikipedia.org/> }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es". }
  }`;
  const data = await fetchJson(SPARQL + '?format=json&query=' + encodeURIComponent(query));
  const rows = data.results.bindings.map((b) => ({
    item: b.m.value.split('/').pop(),
    name: b.mLabel?.value ?? '',
    state: b.stLabel?.value ?? '',
    img: b.img ? decodeURIComponent(b.img.value.split('/').pop()).replace(/_/g, ' ') : null,
    cat: b.cat?.value ?? null,
    article: b.art ? decodeURIComponent(b.art.value.split('/wiki/').pop()).replace(/_/g, ' ') : null,
  }));
  // Collapse duplicate rows per item (multiple P131/P18 values -> keep first non-null).
  const items = new Map();
  for (const r of rows) {
    const prev = items.get(r.item);
    if (!prev) items.set(r.item, r);
    else {
      prev.img ??= r.img;
      prev.cat ??= r.cat;
      prev.article ??= r.article;
    }
  }
  console.log(`wikidata items: ${items.size}`);

  // Join: (normalized muni name, state-contains) primary; nationally-unique name secondary.
  const byName = new Map();
  for (const row of index) {
    const k = norm(row[2]);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(row);
  }
  const joined = new Map(); // "ides/idmun" -> wd record
  const ambiguous = [];
  for (const w of items.values()) {
    const cands = byName.get(norm(w.name)) ?? [];
    let hit = null;
    if (cands.length === 1) hit = cands[0];
    else if (cands.length > 1) {
      const ws = norm(w.state);
      const stateHits = cands.filter((c) => {
        const cs = norm(c[3]);
        return ws && (cs.includes(ws) || ws.includes(cs));
      });
      if (stateHits.length === 1) hit = stateHits[0];
      else ambiguous.push(`${w.name} (${w.state})`);
    }
    if (hit) {
      const key = `${hit[0]}/${hit[1]}`;
      if (!joined.has(key)) joined.set(key, w);
    }
  }
  console.log(`joined to (ides,idmun): ${joined.size} / ${index.length}`);
  console.log(`unjoined wikidata items: ${items.size - joined.size} (ambiguous: ${ambiguous.length})`);

  // Source choice: P18 (filtered) now; article title recorded for the pageimages pass.
  const entries = [];
  let p18 = 0;
  let needsPageimage = [];
  for (const [key, w] of joined) {
    const [ides, idmun] = key.split('/');
    const row = index.find((r) => r[0] === ides && r[1] === idmun);
    const e = {
      ides,
      idmun,
      nmun: row[2],
      nes: row[3],
      item: w.item,
      cat: w.cat,
      file: w.img && !BAD_FILE.test(w.img) ? w.img : null,
      article: w.article,
      source: null,
    };
    if (e.file) {
      e.source = 'p18';
      p18++;
    } else if (e.article) needsPageimage.push(e);
    entries.push(e);
  }
  console.log(`P18 usable after filters: ${p18}`);

  // es-wiki pageimages for the rest, batched 50.
  let fromWiki = 0;
  for (let i = 0; i < needsPageimage.length; i += 50) {
    const batch = needsPageimage.slice(i, i + 50);
    const titles = batch.map((e) => e.article).join('|');
    const url =
      'https://es.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages&piprop=name&pilicense=free&titles=' +
      encodeURIComponent(titles);
    const d = await fetchJson(url);
    const byTitle = new Map((d.query?.pages ?? []).map((p) => [p.title, p.pageimage ?? null]));
    for (const e of batch) {
      const f = byTitle.get(e.article);
      if (f && !BAD_FILE.test(f)) {
        e.file = f.replace(/_/g, ' ');
        e.source = 'eswiki-pageimage';
        fromWiki++;
      }
    }
    await sleep(1200);
  }
  console.log(`from es-wiki pageimages: ${fromWiki}`);
  const withImage = entries.filter((e) => e.file).length;
  console.log(
    `TOTAL with image: ${withImage} / ${index.length} (${((100 * withImage) / index.length).toFixed(1)}%)`,
  );

  mkdirSync(dirname(planPath), { recursive: true });
  writeFileSync(planPath, JSON.stringify({ generatedAt: new Date().toISOString(), entries }));
  console.log(`plan -> ${planPath}`);
}

// ---------- run ----------

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]*>/g, '').trim();
}

async function creditsFor(files) {
  // Batched imageinfo/extmetadata from Commons, 50 titles per call.
  const out = new Map();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const url =
      'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=Artist|LicenseShortName|LicenseUrl&titles=' +
      encodeURIComponent(batch.map((f) => 'File:' + f).join('|'));
    const d = await fetchJson(url);
    for (const p of d.query?.pages ?? []) {
      const md = p.imageinfo?.[0]?.extmetadata ?? {};
      out.set(p.title.replace(/^File:/, ''), {
        artist: stripHtml(md.Artist?.value) || 'desconocido',
        license: md.LicenseShortName?.value ?? 'ver página del archivo',
        licenseUrl: md.LicenseUrl?.value ?? null,
      });
    }
    await sleep(300);
  }
  return out;
}

async function resolveThumbUrls(files) {
  // Batched thumb-URL resolution via the API (throttle-friendly); downloads then
  // go straight to upload.wikimedia.org (the CDN), not the FilePath renderer.
  const map = new Map();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const url =
      'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url&iiurlwidth=800&titles=' +
      encodeURIComponent(batch.map((f) => 'File:' + f).join('|'));
    const d = await fetchJson(url);
    for (const p of d.query?.pages ?? []) {
      const t = p.imageinfo?.[0]?.thumburl ?? p.imageinfo?.[0]?.url ?? null;
      if (t) map.set(p.title.replace(/^File:/, ''), t);
    }
    await sleep(1200);
    if ((i / 50) % 10 === 9) console.log(`  resolved ${map.size} thumb urls...`);
  }
  return map;
}

async function downloadBuf(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    let retryAfterMs = 0;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(120_000),
      });
      if (res.status === 429) {
        retryAfterMs = (Number(res.headers.get('retry-after')) || 30 * attempt) * 1000;
        throw new Error('HTTP 429');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 4096 || buf.slice(0, 15).toString().includes('<!DOCTYPE'))
        throw new Error('not an image');
      return buf;
    } catch (e) {
      if (attempt === 5) throw e;
      await sleep(retryAfterMs || 5000 * attempt);
    }
  }
}

async function run(planPath) {
  const { entries } = JSON.parse(readFileSync(planPath, 'utf8'));
  const chosen = entries.filter((e) => e.file);
  const pending = chosen.filter(
    (e) => !existsSync(join('public/img/municipios', e.ides, `${e.idmun}.webp`)),
  );
  console.log(`chosen ${chosen.length}; pending download ${pending.length} (resumable)...`);
  const thumbs = await resolveThumbUrls([...new Set(pending.map((e) => e.file))]);
  console.log(`thumb urls resolved: ${thumbs.size}`);
  let done = chosen.length - pending.length;
  let failed = [];
  for (const e of pending) {
    const outFile = join('public/img/municipios', e.ides, `${e.idmun}.webp`);
    try {
      const url = thumbs.get(e.file);
      if (!url) throw new Error('no thumb url');
      const buf = await downloadBuf(url);
      mkdirSync(dirname(outFile), { recursive: true });
      await sharp(buf).resize({ width: 640 }).webp({ quality: 75 }).toFile(outFile);
      await sleep(400);
    } catch (err) {
      failed.push(`${e.ides}/${e.idmun} ${e.file}: ${err.message}`);
      continue;
    }
    done++;
    if (done % 100 === 0) console.log(`  ${done}/${chosen.length}`);
  }
  console.log(`converted present: ${done}; failed: ${failed.length}`);
  if (failed.length) writeFileSync(planPath + '.failed.txt', failed.join('\n'));

  // Credits + sidecars for every converted municipio.
  const converted = chosen.filter((e) =>
    existsSync(join('public/img/municipios', e.ides, `${e.idmun}.webp`)),
  );
  console.log(`fetching credits for ${converted.length} files...`);
  const credits = await creditsFor(converted.map((e) => e.file));
  const aggregate = [];
  for (const e of converted) {
    const c = credits.get(e.file) ?? { artist: 'desconocido', license: 'ver página del archivo' };
    const sidecar = {
      file: e.file,
      filePage: 'https://commons.wikimedia.org/wiki/File:' + e.file.replace(/ /g, '_'),
      artist: c.artist,
      license: c.license,
      licenseUrl: c.licenseUrl ?? null,
      cat: e.cat,
      source: e.source,
    };
    const scPath = join('public/data/commons', e.ides, `${e.idmun}.json`);
    mkdirSync(dirname(scPath), { recursive: true });
    writeFileSync(scPath, JSON.stringify(sidecar));
    aggregate.push({ ides: e.ides, idmun: e.idmun, nmun: e.nmun, nes: e.nes, ...sidecar });
  }
  writeFileSync('public/data/credits.json', JSON.stringify(aggregate));
  console.log(`sidecars + credits.json written (${aggregate.length} entries)`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'plan') await plan(arg ?? 'scratch/harvest-plan.json');
else if (cmd === 'run') await run(arg ?? 'scratch/harvest-plan.json');
else {
  console.error('usage: node harvest-muni-images.mjs plan|run <planPath>');
  process.exit(2);
}

// Made with my soul - Swately <3
