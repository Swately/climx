import { useEffect, useState } from 'react';
import { fetchWithCache } from './fetchWithCache';

export type FetchState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T; fromCache: boolean }
  | { status: 'error'; message: string };

/**
 * Data hook over fetchWithCache; `retryToken` re-runs the fetch when it changes.
 * "loading" is DERIVED (result key !== current key) instead of set inside the
 * effect — avoids the cascading-render pattern react-hooks v7 flags.
 */
export function useFetch<T>(path: string, retryToken = 0): FetchState<T> {
  const key = `${path}#${retryToken}`;
  const [result, setResult] = useState<{ key: string; state: FetchState<T> } | null>(null);

  useEffect(() => {
    let alive = true;
    fetchWithCache<T>(path)
      .then((r) => {
        if (alive)
          setResult({ key, state: { status: 'ok', data: r.data, fromCache: r.fromCache } });
      })
      .catch((err: unknown) => {
        if (alive)
          setResult({
            key,
            state: { status: 'error', message: err instanceof Error ? err.message : String(err) },
          });
      });
    return () => {
      alive = false;
    };
  }, [key, path]);

  return result !== null && result.key === key ? result.state : { status: 'loading' };
}

// Made with my soul - Swately <3
