// Commons runtime layer — PROGRESSIVE ENHANCEMENT ONLY. The weather core never
// depends on this: if Commons is unreachable the gallery hides and the app is
// whole. The MediaWiki API allows anonymous CORS via origin=* (no key, no
// account — inside envelope E1).
//
// The per-municipio photo/credit/category is NOT fetched here: it travels
// inside the forecast file (see MuniImage in ./types) and reaches components as
// props. This module only owns the LIVE gallery call.
import { useEffect, useState } from 'react';

export type GalleryImage = {
  name: string;
  thumb: string;
  page: string;
  artist: string;
  license: string;
};

// Same exclusion class as the harvester (documented repetition — the harvester
// filters at build time, this filters the live category feed).
const BAD_FILE =
  /escudo|coat[_ ]of[_ ]arms|bandera|flag|mapa|map[_ .(]|glifo|glyph|seal|logo|locator|\.svg$|\.pdf$|\.tif$/i;
const OK_EXT = /\.(jpe?g|png|webp)$/i;

export function buildGalleryUrl(cat: string): string {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    generator: 'categorymembers',
    gcmtitle: `Category:${cat}`,
    gcmtype: 'file',
    gcmlimit: '40',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiextmetadatafilter: 'Artist|LicenseShortName',
    iiurlwidth: '320',
  });
  return `https://commons.wikimedia.org/w/api.php?${params}`;
}

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').trim();

/** Pure parser/filter over the API response; caps at `limit` usable photos. */
export function parseGallery(json: unknown, limit = 12): GalleryImage[] {
  const pages = (json as { query?: { pages?: unknown[] } })?.query?.pages ?? ([] as unknown[]);
  const out: GalleryImage[] = [];
  for (const p of pages as Array<{
    title?: string;
    imageinfo?: Array<{
      thumburl?: string;
      descriptionurl?: string;
      extmetadata?: { Artist?: { value?: string }; LicenseShortName?: { value?: string } };
    }>;
  }>) {
    const name = (p.title ?? '').replace(/^File:/, '');
    const ii = p.imageinfo?.[0];
    if (!ii?.thumburl || !ii.descriptionurl) continue;
    if (BAD_FILE.test(name) || !OK_EXT.test(name)) continue;
    out.push({
      name,
      thumb: ii.thumburl,
      page: ii.descriptionurl,
      artist: stripHtml(ii.extmetadata?.Artist?.value ?? '') || 'autor desconocido',
      license: ii.extmetadata?.LicenseShortName?.value ?? 'ver archivo',
    });
    if (out.length >= limit) break;
  }
  return out;
}

export type GalleryState =
  { status: 'loading' } | { status: 'ok'; images: GalleryImage[] } | { status: 'unavailable' };

/** Live gallery for a Commons category; failure collapses to 'unavailable'. */
export function useCommonsGallery(cat: string | null): GalleryState {
  const [result, setResult] = useState<{ key: string; state: GalleryState } | null>(null);
  useEffect(() => {
    if (cat === null) return;
    let alive = true;
    fetch(buildGalleryUrl(cat), { signal: AbortSignal.timeout(20_000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: unknown) => {
        if (alive) setResult({ key: cat, state: { status: 'ok', images: parseGallery(json) } });
      })
      .catch(() => {
        if (alive) setResult({ key: cat, state: { status: 'unavailable' } });
      });
    return () => {
      alive = false;
    };
  }, [cat]);
  if (cat === null) return { status: 'unavailable' };
  return result !== null && result.key === cat ? result.state : { status: 'loading' };
}

// Made with my soul - Swately <3
