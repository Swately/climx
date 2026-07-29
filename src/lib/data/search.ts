import type { IndexRow } from './types';

/** Lowercase + strip diacritics, so "tezoatlan" finds "Tezoatlán". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Prefix-then-substring ranked municipio search over the index. */
export function searchMunicipios(index: IndexRow[], query: string, limit = 8): IndexRow[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const starts: IndexRow[] = [];
  const contains: IndexRow[] = [];
  for (const row of index) {
    const name = normalize(row[2]);
    if (name.startsWith(q)) starts.push(row);
    else if (name.includes(q)) contains.push(row);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

// Made with my soul - Swately <3
