import { useState } from 'react';
import { Link, useParams } from '../router/router';
import { useForecast } from '../lib/data/hooks';
import { useMuniSidecar } from '../lib/data/commons';
import Stack from '../primitives/Stack';
import Grid from '../primitives/Grid';
import Text from '../primitives/Text';
import ForecastCard from '../components/ForecastCard';
import AgeBanner from '../components/AgeBanner';
import ErrorState from '../components/ErrorState';
import MuniHeader from '../components/MuniHeader';
import CommonsGallery from '../components/CommonsGallery';

// The M4 view: /estado/:ides/municipio/:idmun — composite-keyed (wall W1).
export default function MunicipioPage() {
  const { ides, idmun } = useParams<{ ides: string; idmun: string }>();
  const [retryToken, setRetryToken] = useState(0);
  const forecast = useForecast(ides, idmun, retryToken);
  const sidecar = useMuniSidecar(ides, idmun);

  return (
    <Stack as="main" gap={5}>
      <nav aria-label="migas">
        <Link to="/">Inicio</Link>
        {forecast.status === 'ok' && (
          <>
            {' / '}
            <Link to={`/estado/${ides}`}>{forecast.data.nes}</Link>
          </>
        )}
      </nav>
      {forecast.status === 'loading' && (
        <Text as="p" aria-busy="true">
          Cargando pronóstico…
        </Text>
      )}
      {forecast.status === 'error' && (
        <ErrorState message={forecast.message} onRetry={() => setRetryToken((t) => t + 1)} />
      )}
      {forecast.status === 'ok' && (
        <>
          <header>
            <Stack gap={3}>
              <MuniHeader ides={ides} idmun={idmun} />
              <Stack gap={1}>
                <Text as="h1" size={600}>
                  {forecast.data.nmun}
                </Text>
                <Text as="p" muted>
                  {forecast.data.nes} — pronóstico a {forecast.data.days.length} días
                  {forecast.fromCache ? ' (copia local)' : ''}
                </Text>
              </Stack>
            </Stack>
          </header>
          <AgeBanner />
          <Grid as="ul" min="15rem" gap={4} aria-label="pronóstico por día">
            {forecast.data.days.map((day) => (
              <ForecastCard key={day.ndia} day={day} />
            ))}
          </Grid>
          <CommonsGallery cat={sidecar.status === 'ok' ? sidecar.data.cat : null} />
        </>
      )}
    </Stack>
  );
}

// Made with my soul - Swately <3
