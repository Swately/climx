import { useState } from 'react';
import { Link } from '../router/router';
import { nearestMunicipio } from '../lib/geo/nearestMunicipio';
import type { IndexRow } from '../lib/data/types';
import Text from '../primitives/Text';

type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'found'; row: IndexRow; km: number }
  | { status: 'denied' };

// Key-free geolocation: browser position -> nearest municipio over the index's
// own lat/lon (replaces the v0 Google geocoding key).
export default function NearestMunicipio({ index }: { index: IndexRow[] }) {
  const [state, setState] = useState<GeoState>({ status: 'idle' });

  function locate() {
    if (!('geolocation' in navigator)) {
      setState({ status: 'denied' });
      return;
    }
    setState({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const hit = nearestMunicipio(index, pos.coords.latitude, pos.coords.longitude);
        setState(hit ? { status: 'found', ...hit } : { status: 'denied' });
      },
      () => setState({ status: 'denied' }),
      { timeout: 10_000 },
    );
  }

  if (state.status === 'found') {
    return (
      <Text as="p">
        Tu municipio más cercano:{' '}
        <Link to={`/estado/${state.row[0]}/municipio/${state.row[1]}`}>
          {state.row[2]}, {state.row[3]}
        </Link>{' '}
        <Text as="span" muted size={200}>
          (~{Math.round(state.km)} km)
        </Text>
      </Text>
    );
  }
  if (state.status === 'denied') {
    return (
      <Text as="p" muted size={200}>
        Sin ubicación — usa el buscador o navega por estado.
      </Text>
    );
  }
  return (
    <button type="button" onClick={locate} disabled={state.status === 'locating'}>
      {state.status === 'locating' ? 'Ubicando…' : 'Usar mi ubicación'}
    </button>
  );
}

// Made with my soul - Swately <3
