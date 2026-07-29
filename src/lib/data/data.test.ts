import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithCache, readCache } from './fetchWithCache';
import { ageHours, ageLabel, isStale } from './staleness';
import { normalize, searchMunicipios } from './search';
import type { IndexRow } from './types';

const okResponse = (body: unknown) => ({ ok: true, json: () => Promise.resolve(body) }) as Response;

describe('fetchWithCache (wall W3, client side)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('returns fresh data and persists it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ a: 1 })));
    const r = await fetchWithCache<{ a: number }>('data/x.json');
    expect(r).toEqual({ data: { a: 1 }, fromCache: false });
    expect(readCache('data/x.json')).toEqual({ a: 1 });
  });

  it('serves the last-good copy when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ a: 1 })));
    await fetchWithCache('data/x.json');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const r = await fetchWithCache<{ a: number }>('data/x.json');
    expect(r).toEqual({ data: { a: 1 }, fromCache: true });
  });

  it('treats HTTP errors as failures (cache or throw)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response));
    await expect(fetchWithCache('data/nope.json')).rejects.toThrow('HTTP 404');
  });

  it('throws when there is no network AND no cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(fetchWithCache('data/cold.json')).rejects.toThrow('offline');
  });
});

describe('staleness (M3)', () => {
  const now = Date.parse('2026-07-28T12:00:00Z');
  it('computes hours and the 12h threshold', () => {
    expect(ageHours(now, '2026-07-28T10:00:00Z')).toBeCloseTo(2);
    expect(isStale(ageHours(now, '2026-07-28T10:00:00Z'))).toBe(false);
    expect(isStale(ageHours(now, '2026-07-27T10:00:00Z'))).toBe(true);
    expect(isStale(null)).toBe(true);
  });
  it('handles missing/invalid timestamps honestly', () => {
    expect(ageHours(now, null)).toBeNull();
    expect(ageHours(now, 'garbage')).toBeNull();
    expect(ageLabel(null)).toMatch(/sin datos/);
  });
  it('labels ages in Spanish', () => {
    expect(ageLabel(0.4)).toBe('hace menos de 1 h');
    expect(ageLabel(5)).toBe('hace 5 h');
    expect(ageLabel(72)).toBe('hace 3 días');
  });
});

const INDEX: IndexRow[] = [
  ['20', '54', 'Magdalena Zahuatlán', 'Oaxaca', '17.3884', '-97.229'],
  ['14', '54', 'El Limón', 'Jalisco', '19.7', '-104.1'],
  ['15', '106', 'Toluca', 'Estado de México', '19.2926', '-99.6568'],
  ['20', '399', 'Oaxaca de Juárez', 'Oaxaca', '17.06', '-96.72'],
];

describe('search', () => {
  it('is diacritic- and case-insensitive', () => {
    expect(normalize('Zahuatlán')).toBe('zahuatlan');
    expect(searchMunicipios(INDEX, 'zahuatlan')[0]?.[2]).toBe('Magdalena Zahuatlán');
    expect(searchMunicipios(INDEX, 'TOLUCA')[0]?.[2]).toBe('Toluca');
  });
  it('ranks prefix matches before substring matches', () => {
    const r = searchMunicipios(INDEX, 'oax');
    expect(r[0]?.[2]).toBe('Oaxaca de Juárez');
  });
  it('requires 2+ characters', () => {
    expect(searchMunicipios(INDEX, 'o')).toEqual([]);
  });
});

// Made with my soul - Swately <3
