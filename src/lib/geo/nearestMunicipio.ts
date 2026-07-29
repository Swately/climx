import { haversineKm } from './haversine';
import type { IndexRow } from '../data/types';

// Replaces the v0 Google geocoding key: the dataset itself carries lat/lon per
// municipio, so "which municipio am I in(-ish)" is a nearest-neighbor scan over
// 2,463 points — key-free, offline-capable.
export function nearestMunicipio(
  index: IndexRow[],
  lat: number,
  lon: number,
): { row: IndexRow; km: number } | null {
  let best: IndexRow | null = null;
  let bestKm = Infinity;
  for (const row of index) {
    const km = haversineKm(lat, lon, Number(row[4]), Number(row[5]));
    if (km < bestKm) {
      bestKm = km;
      best = row;
    }
  }
  return best ? { row: best, km: bestKm } : null;
}

// Made with my soul - Swately <3
