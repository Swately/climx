// The staleness contract (M3): one timestamp -> a visible, honest age.

/** Hours elapsed since the ISO timestamp; null when there is no timestamp. */
export function ageHours(nowMs: number, fetchedAt: string | null): number | null {
  if (!fetchedAt) return null;
  const t = Date.parse(fetchedAt);
  if (Number.isNaN(t)) return null;
  return Math.max(0, (nowMs - t) / 3.6e6);
}

/** The M3 threshold: older than 12h counts as stale. */
export function isStale(hours: number | null): boolean {
  return hours === null || hours > 12;
}

/** Spanish, human-readable age label. */
export function ageLabel(hours: number | null): string {
  if (hours === null) return 'sin datos de actualización';
  if (hours < 1) return 'hace menos de 1 h';
  if (hours < 48) return `hace ${Math.round(hours)} h`;
  return `hace ${Math.round(hours / 24)} días`;
}

// Made with my soul - Swately <3
