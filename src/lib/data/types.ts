// Shapes mirror public/data/** exactly (produced by scripts/partition-data.mjs).
// All values are strings because the SMN source ships strings; parsing to number
// happens at the consumer that needs math (geo, display rounding).

export type ForecastDay = {
  ndia: string;
  dloc: string;
  desciel: string;
  tmax: string;
  tmin: string;
  prec: string;
  probprec: string;
  velvien: string;
  dirvienc: string;
  raf: string;
  cc: string;
};

export type MunicipioForecast = {
  ides: string;
  idmun: string;
  nmun: string;
  nes: string;
  lat: string;
  lon: string;
  days: ForecastDay[];
};

/** all-lite.json row: [ides, idmun, nmun, nes, lat, lon] — ides FIRST (wall W1). */
export type IndexRow = [string, string, string, string, string, string];

/** estados.json row: [ides, nes]. */
export type EstadoRow = [string, string];

export type Meta = {
  fetchedAt: string | null;
  ok: boolean;
  lastAttempt: string;
  recordCount: number;
  municipioCount: number;
  estadoCount: number;
};

// Made with my soul - Swately <3
