import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCommonsGallery, useMuniSidecar } from './commons';

const okResponse = (body: unknown) => ({ ok: true, json: () => Promise.resolve(body) }) as Response;

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

const apiPayload = {
  query: {
    pages: [
      {
        title: 'File:Plaza.jpg',
        imageinfo: [
          {
            thumburl: 'https://upload.wikimedia.org/x/Plaza.jpg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Plaza.jpg',
            extmetadata: { Artist: { value: 'Autora' }, LicenseShortName: { value: 'CC BY 4.0' } },
          },
        ],
      },
    ],
  },
};

describe('useCommonsGallery', () => {
  it('is unavailable without a category (no fetch fired)', () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useCommonsGallery(null));
    expect(result.current).toEqual({ status: 'unavailable' });
    expect(f).not.toHaveBeenCalled();
  });

  it('loads and parses the live category feed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(apiPayload)));
    const { result } = renderHook(() => useCommonsGallery('Toluca'));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ok'));
    if (result.current.status === 'ok') {
      expect(result.current.images).toHaveLength(1);
      expect(result.current.images[0]?.artist).toBe('Autora');
    }
  });

  it('collapses network failures to unavailable (progressive enhancement)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const { result } = renderHook(() => useCommonsGallery('Toluca'));
    await waitFor(() => expect(result.current.status).toBe('unavailable'));
  });

  it('collapses HTTP errors to unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
    const { result } = renderHook(() => useCommonsGallery('Toluca'));
    await waitFor(() => expect(result.current.status).toBe('unavailable'));
  });
});

describe('useMuniSidecar', () => {
  it('fetches the composite-keyed sidecar (wall W1)', async () => {
    const sidecar = { file: 'x.jpg', artist: 'A', license: 'CC0', cat: 'Cat', source: 'p18' };
    const f = vi.fn().mockResolvedValue(okResponse(sidecar));
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useMuniSidecar('20', '54'));
    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(String(f.mock.calls[0]?.[0])).toContain('data/commons/20/54.json');
  });
});

// Made with my soul - Swately <3
