import { Link } from '../router/router';
import { useFetch } from '../lib/data/useFetch';
import Stack from '../primitives/Stack';
import Text from '../primitives/Text';
import ErrorState from '../components/ErrorState';

type CreditRow = {
  ides: string;
  idmun: string;
  nmun: string;
  nes: string;
  file: string;
  filePage: string;
  artist: string;
  license: string;
};

// CC attribution page for every harvested municipality photo, grouped by state
// with native <details> (no JS, 1,700 rows stay navigable).
export default function CreditsPage() {
  const credits = useFetch<CreditRow[]>('data/credits.json');

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
          Las fotografías de municipios provienen de Wikimedia Commons bajo licencias libres;
          cada una enlaza a su página de archivo con autor y licencia. Las fotografías de
          estados provienen del proyecto original (2023).
        </Text>
      </Stack>
      {credits.status === 'loading' && (
        <Text as="p" aria-busy="true">
          Cargando créditos…
        </Text>
      )}
      {credits.status === 'error' && <ErrorState message={credits.message} />}
      {credits.status === 'ok' &&
        groupByState(credits.data).map(([nes, rows]) => (
          <details key={nes}>
            <summary>
              <Text as="span" bold>
                {nes}
              </Text>{' '}
              <Text as="span" muted size={200}>
                ({rows.length} fotos)
              </Text>
            </summary>
            <ul>
              {rows.map((r) => (
                <li key={`${r.ides}/${r.idmun}`}>
                  <Text as="span" size={200}>
                    {r.nmun}:{' '}
                    <a href={r.filePage} target="_blank" rel="noreferrer">
                      {r.file}
                    </a>{' '}
                    — {r.artist} · {r.license}
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
