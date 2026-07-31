import { Link } from '../router/router';
import { useFetch } from '../lib/data/useFetch';
import { useMunicipioIndex } from '../lib/data/hooks';
import type { MuniImage } from '../lib/data/types';
import Stack from '../primitives/Stack';
import Text from '../primitives/Text';
import ErrorState from '../components/ErrorState';

type ImageIndex = Record<string, MuniImage>;

type CreditRow = { key: string; nmun: string; nes: string; img: MuniImage };

// CC attribution for every harvested municipality photo, grouped by state with
// native <details> (no JS needed to navigate ~1.5k rows). Reads the single
// image index + the municipio index and joins them — no per-municipio file.
export default function CreditsPage() {
  const images = useFetch<ImageIndex>('data/images.json');
  const index = useMunicipioIndex();

  const loading = images.status === 'loading' || index.status === 'loading';
  const error =
    images.status === 'error' ? images.message : index.status === 'error' ? index.message : null;

  const rows: CreditRow[] =
    images.status === 'ok' && index.status === 'ok'
      ? index.data
          .map(([ides, idmun, nmun, nes]) => ({ key: `${ides}/${idmun}`, nmun, nes }))
          .flatMap((m) => {
            const img = images.data[m.key];
            return img?.file ? [{ ...m, img }] : [];
          })
      : [];

  return (
    <Stack as="main" gap={5}>
      <nav aria-label="migas">
        <Link to="/">Inicio</Link>
      </nav>
      <Stack as="header" gap={1}>
        <Text as="h1" size={600}>
          Créditos de imágenes
        </Text>
        <Text as="p" muted>
          Las fotografías de municipios provienen de Wikimedia Commons bajo licencias libres; cada
          una enlaza a su página de archivo con autor y licencia. Las fotografías de estados
          provienen del proyecto original (2023).
        </Text>
      </Stack>
      {loading && (
        <Text as="p" aria-busy="true">
          Cargando créditos…
        </Text>
      )}
      {error !== null && <ErrorState message={error} />}
      {rows.length > 0 && (
        <Text as="p" muted size={200}>
          {rows.length} fotografías acreditadas.
        </Text>
      )}
      {groupByState(rows).map(([nes, group]) => (
        <details key={nes}>
          <summary>
            <Text as="span" bold>
              {nes}
            </Text>{' '}
            <Text as="span" muted size={200}>
              ({group.length} fotos)
            </Text>
          </summary>
          <ul>
            {group.map((r) => (
              <li key={r.key}>
                <Text as="span" size={200}>
                  {r.nmun}:{' '}
                  {r.img.filePage ? (
                    <a href={r.img.filePage} target="_blank" rel="noreferrer">
                      {r.img.file}
                    </a>
                  ) : (
                    r.img.file
                  )}{' '}
                  — {r.img.artist} · {r.img.license}
                </Text>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </Stack>
  );
}

function groupByState(rows: CreditRow[]): [string, CreditRow[]][] {
  const map = new Map<string, CreditRow[]>();
  for (const r of rows) {
    if (!map.has(r.nes)) map.set(r.nes, []);
    map.get(r.nes)?.push(r);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
}

// Made with my soul - Swately <3
