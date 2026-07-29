import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFetch } from './useFetch';
import { useForecast, useMeta, useMunicipioIndex, useEstados } from './hooks';

const okResponse = (body: unknown) => ({ ok: true, json: () => Promise.resolve(body) }) as Response;

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('useFetch', () => {
  it('goes loading -> ok with fresh data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ v: 1 })));
    const { result } = renderHook(() => useFetch<{ v: number }>('data/a.json'));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(result.current).toMatchObject({ data: { v: 1 }, fromCache: false });
  });

  it('goes loading -> error when network fails cold', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { result } = renderHook(() => useFetch('data/b.json'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current).toMatchObject({ message: 'offline' });
  });

  it('re-fetches when retryToken changes (derived loading, no stale state)', async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(okResponse({ v: 2 }));
    vi.stubGlobal('fetch', f);
    const { result, rerender } = renderHook(({ t }) => useFetch<{ v: number }>('data/c.json', t), {
      initialProps: { t: 0 },
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    rerender({ t: 1 });
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('typed hooks build composite-keyed paths (wall W1)', () => {
  it('useForecast fetches data/forecast/{ides}/{idmun}.json', async () => {
    const f = vi.fn().mockResolvedValue(okResponse({ nmun: 'x', days: [] }));
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useForecast('20', '54'));
    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(String(f.mock.calls[0]?.[0])).toContain('data/forecast/20/54.json');
  });

  it('useMeta / useMunicipioIndex / useEstados hit their files', async () => {
    const f = vi.fn().mockResolvedValue(okResponse([]));
    vi.stubGlobal('fetch', f);
    const a = renderHook(() => useMeta());
    const b = renderHook(() => useMunicipioIndex());
    const c = renderHook(() => useEstados());
    await waitFor(() => {
      expect(a.result.current.status).toBe('ok');
      expect(b.result.current.status).toBe('ok');
      expect(c.result.current.status).toBe('ok');
    });
    const urls = f.mock.calls.map((call) => String(call[0]));
    expect(urls.some((u) => u.includes('data/meta.json'))).toBe(true);
    expect(urls.some((u) => u.includes('data/index/all-lite.json'))).toBe(true);
    expect(urls.some((u) => u.includes('data/index/estados.json'))).toBe(true);
  });
});

// Made with my soul - Swately <3
