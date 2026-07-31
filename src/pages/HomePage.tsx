import { Link } from '../router/router';
import { useEstados, useMunicipioIndex } from '../lib/data/hooks';
import Stack from '../primitives/Stack';
import Grid from '../primitives/Grid';
import Text from '../primitives/Text';
import EstadoCard from '../components/EstadoCard';
import SearchCombobox from '../components/SearchCombobox';
import NearestMunicipio from '../components/NearestMunicipio';
import AgeBanner from '../components/AgeBanner';
import ErrorState from '../components/ErrorState';

export default function HomePage() {
  const index = useMunicipioIndex();
  const estados = useEstados();

  return (
    <>
      <Stack as="header" gap={1}>
        <Text as="h1" size={600}>
          climx
        </Text>
        <Text as="p" muted>
          Pronóstico municipal de México — datos oficiales del SMN/CONAGUA.
        </Text>
      </Stack>
      <Stack as="main" gap={6}>
        <AgeBanner />
        {index.status === 'loading' && (
          <Text as="p" aria-busy="true">
            Cargando el índice de municipios…
          </Text>
        )}
        {index.status === 'error' && <ErrorState message={index.message} />}
        {index.status === 'ok' && (
          <Stack gap={4} align="start">
            <SearchCombobox index={index.data} />
            <NearestMunicipio index={index.data} />
          </Stack>
        )}
        <section aria-labelledby="estados-h">
          <Stack gap={3}>
            <Text as="h2" size={400} id="estados-h">
              Por estado
            </Text>
            {estados.status === 'ok' && (
              <Grid as="ul" min="11rem" gap={3} aria-labelledby="estados-h">
                {estados.data.map(([ides, nes]) => (
                  <EstadoCard key={ides} ides={ides} nes={nes} />
                ))}
              </Grid>
            )}
          </Stack>
        </section>
      </Stack>
      <footer>
        <Text as="p" muted size={200}>
          Fuente: Servicio Meteorológico Nacional (CONAGUA). Fotos de municipios: Wikimedia Commons
          — <Link to="/creditos">créditos</Link>. Proyecto de código abierto.
        </Text>
      </footer>
    </>
  );
}

// Made with my soul - Swately <3
