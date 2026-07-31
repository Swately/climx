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

/**
 * Free-licensed municipality photo + its Commons category, folded into the
 * forecast file by the pipeline (one request renders the whole view).
 * `file === null` means "no photo, gallery only"; the field is absent entirely
 * for municipios with neither.
 */
export type MuniImage = {
  file: string | null;
  filePage: string | null;
  artist: string | null;
  license: string | null;
  licenseUrl: string | null;
  cat: string | null;
};

export type MunicipioForecast = {
  ides: string;
  idmun: string;
  nmun: string;
  nes: string;
  lat: string;
  lon: string;
  days: ForecastDay[];
  img?: MuniImage;
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
