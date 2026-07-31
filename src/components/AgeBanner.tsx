import { useState } from 'react';
import { useMeta } from '../lib/data/hooks';
import { ageHours, ageLabel, isStale } from '../lib/data/staleness';
import Text from '../primitives/Text';
import styles from './AgeBanner.module.css';

// The M3 instrument: the data's true age, always visible, loud when stale or
// when we're serving a cached copy.
export default function AgeBanner() {
  const meta = useMeta();
  // Snapshot at mount (render stays pure); the age advances on re-visit, by design.
  const [now] = useState(() => Date.now());
  if (meta.status === 'loading') return null;
  if (meta.status === 'error') {
    return (
      <Text as="p" size={200} className={styles.warn} aria-live="polite">
        Sin conexión con los datos; mostrando lo último guardado en este navegador.
      </Text>
    );
  }
  const hours = ageHours(now, meta.data.fetchedAt);
  const stale = isStale(hours);
  // `ok === false` means the last pipeline attempt failed (SMN unreachable or a
  // rejected payload). Saying only "actualizado hace Xh" while that is true
  // reads calmer than reality — the banner is the M3 honesty surface, so the
  // failed attempt is named even before the 12 h staleness threshold trips.
  const lastAttemptFailed = meta.data.ok === false;
  return (
    <Text
      as="p"
      size={200}
      className={stale || lastAttemptFailed ? styles.warn : styles.ok}
      aria-live="polite"
    >
      Datos del SMN actualizados {ageLabel(hours)}
      {meta.fromCache ? ' (copia local)' : ''}
      {stale ? ' — pueden estar desactualizados' : ''}
      {lastAttemptFailed
        ? ' — el último intento de actualización falló; se muestra el último dato bueno'
        : ''}
    </Text>
  );
}

// Made with my soul - Swately <3
