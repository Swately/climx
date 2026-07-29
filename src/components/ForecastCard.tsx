import Box from '../primitives/Box';
import Stack from '../primitives/Stack';
import Cluster from '../primitives/Cluster';
import Text from '../primitives/Text';
import { skyIcon } from './skyIcon';
import type { ForecastDay } from '../lib/data/types';

const DAY_NAMES = ['Hoy', 'Mañana'];

function dayTitle(day: ForecastDay): string {
  const n = Number(day.ndia);
  const named = DAY_NAMES[n];
  if (named) return named;
  // dloc: "20260728T00" -> 28/07
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(day.dloc);
  return m ? `${m[3]}/${m[2]}` : `Día +${n}`;
}

export default function ForecastCard({ day }: { day: ForecastDay }) {
  return (
    <Box as="li" variant="surface" padding={4}>
      <Stack gap={2}>
        <Cluster justify="space-between">
          <Text as="h3" size={400}>
            {dayTitle(day)}
          </Text>
          <Text as="span" size={500} role="img" aria-label={day.desciel}>
            {skyIcon(day.desciel)}
          </Text>
        </Cluster>
        <Text as="p" muted>
          {day.desciel}
        </Text>
        <Cluster gap={4} as="ul" aria-label="detalles del día">
          <li>
            <Text as="span" bold>
              {Math.round(Number(day.tmax))}°
            </Text>{' '}
            <Text as="span" muted size={200}>
              máx
            </Text>
          </li>
          <li>
            <Text as="span" bold>
              {Math.round(Number(day.tmin))}°
            </Text>{' '}
            <Text as="span" muted size={200}>
              mín
            </Text>
          </li>
          <li>
            <Text as="span">💧 {Math.round(Number(day.probprec))}%</Text>
          </li>
          <li>
            <Text as="span">
              🌬️ {Math.round(Number(day.velvien))} km/h {day.dirvienc}
            </Text>
          </li>
        </Cluster>
      </Stack>
    </Box>
  );
}

// Made with my soul - Swately <3
