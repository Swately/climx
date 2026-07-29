import { describe, it, expect } from 'vitest';
import { haversineKm } from './haversine';
import { nearestMunicipio } from './nearestMunicipio';
import type { IndexRow } from '../data/types';

const INDEX: IndexRow[] = [
  ['15', '106', 'Toluca', 'Estado de México', '19.2926', '-99.6568'],
  ['19', '39', 'Monterrey', 'Nuevo León', '25.6866', '-100.3161'],
  ['20', '399', 'Oaxaca de Juárez', 'Oaxaca', '17.06', '-96.72'],
];

describe('haversineKm', () => {
  it('is zero at the same point and symmetric', () => {
    expect(haversineKm(19.4, -99.1, 19.4, -99.1)).toBe(0);
    const ab = haversineKm(19.4, -99.1, 25.7, -100.3);
    const ba = haversineKm(25.7, -100.3, 19.4, -99.1);
    expect(ab).toBeCloseTo(ba, 10);
  });
  it('orders known distances correctly (CDMX: Toluca < Monterrey)', () => {
    const cdmx = { lat: 19.4326, lon: -99.1332 };
    const toToluca = haversineKm(cdmx.lat, cdmx.lon, 19.2926, -99.6568);
    const toMty = haversineKm(cdmx.lat, cdmx.lon, 25.6866, -100.3161);
    expect(toToluca).toBeLessThan(toMty);
    expect(toToluca).toBeGreaterThan(30);
    expect(toToluca).toBeLessThan(90);
  });
});

describe('nearestMunicipio', () => {
  it('finds the nearest row from a browser position', () => {
    const hit = nearestMunicipio(INDEX, 19.4326, -99.1332);
    expect(hit?.row[2]).toBe('Toluca');
  });
  it('returns null on an empty index', () => {
    expect(nearestMunicipio([], 19, -99)).toBeNull();
  });
});

// Made with my soul - Swately <3
