import { describe, it, expect } from 'vitest';
import { buildGalleryUrl, parseGallery } from './commons';

const page = (name: string, over: Record<string, unknown> = {}) => ({
  title: `File:${name}`,
  imageinfo: [
    {
      thumburl: `https://upload.wikimedia.org/thumb/${name}`,
      descriptionurl: `https://commons.wikimedia.org/wiki/File:${name}`,
      extmetadata: {
        Artist: { value: '<a href="x">Fulana Fotógrafa</a>' },
        LicenseShortName: { value: 'CC BY-SA 4.0' },
      },
      ...over,
    },
  ],
});

describe('buildGalleryUrl', () => {
  it('targets the category with anonymous CORS', () => {
    const u = buildGalleryUrl('La Paz, Baja California Sur');
    expect(u).toContain('origin=*');
    expect(u).toContain('gcmtitle=Category%3ALa+Paz');
  });
});

describe('parseGallery', () => {
  it('keeps photos, strips HTML from artist, caps at limit', () => {
    const json = {
      query: { pages: [page('Plaza.jpg'), page('Kiosco.png'), page('Malecon.jpeg')] },
    };
    const imgs = parseGallery(json, 2);
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toMatchObject({ artist: 'Fulana Fotógrafa', license: 'CC BY-SA 4.0' });
  });

  it('filters escudos/banderas/mapas/svg and files without thumbs', () => {
    const json = {
      query: {
        pages: [
          page('Escudo de Toluca.png'),
          page('Bandera municipal.jpg'),
          page('Mapa municipio.svg'),
          page('Documento.pdf'),
          { title: 'File:SinThumb.jpg', imageinfo: [{}] },
          page('Palacio municipal.jpg'),
        ],
      },
    };
    const imgs = parseGallery(json);
    expect(imgs.map((i) => i.name)).toEqual(['Palacio municipal.jpg']);
  });

  it('returns empty on malformed payloads instead of throwing', () => {
    expect(parseGallery(null)).toEqual([]);
    expect(parseGallery({})).toEqual([]);
  });
});

// Made with my soul - Swately <3
