// Hand-rolled fetch + last-good cache (M1 item 7 by construction; wall W3 on the
// client side): a successful fetch refreshes localStorage; a failed one serves the
// last-good copy so the app never goes blank on a network failure (K3).

export type CachedResult<T> = { data: T; fromCache: boolean };

const PREFIX = 'climx:';

export async function fetchWithCache<T>(path: string): Promise<CachedResult<T>> {
  const key = PREFIX + path;
  try {
    const res = await fetch(import.meta.env.BASE_URL + path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Quota/private-mode: serving without persisting is fine.
    }
    return { data, fromCache: false };
  } catch (err) {
    const cached = readCache<T>(path);
    if (cached !== null) return { data: cached, fromCache: true };
    throw err;
  }
}

export function readCache<T>(path: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + path);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

// Made with my soul - Swately <3
