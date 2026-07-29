import { useCommonsGallery } from '../lib/data/commons';
import Stack from '../primitives/Stack';
import Grid from '../primitives/Grid';
import Text from '../primitives/Text';
import styles from './CommonsGallery.module.css';

// Live gallery from the municipio's Wikimedia Commons category. Progressive
// enhancement: while loading or on any failure this renders nothing load-bearing
// — the weather view is already whole without it.
export default function CommonsGallery({ cat }: { cat: string | null }) {
  const gallery = useCommonsGallery(cat);

  if (gallery.status === 'unavailable') return null;
  if (gallery.status === 'loading')
    return (
      <Text as="p" muted size={200} aria-busy="true">
        Cargando galería de Commons…
      </Text>
    );
  if (gallery.images.length === 0) return null;

  return (
    <Stack as="section" gap={3} aria-labelledby="galeria-h">
      <Text as="h2" size={400} id="galeria-h">
        Galería (Wikimedia Commons)
      </Text>
      <Grid as="ul" min="12rem" gap={3} aria-labelledby="galeria-h">
        {gallery.images.map((img) => (
          <li key={img.name} className={styles.item}>
            <a href={img.page} target="_blank" rel="noreferrer">
              <img src={img.thumb} alt={img.name} loading="lazy" className={styles.thumb} />
            </a>
            <Text as="small" muted size={100} className={styles.credit}>
              {img.artist} · {img.license}
            </Text>
          </li>
        ))}
      </Grid>
      <Text as="p" muted size={100}>
        Imágenes servidas en vivo desde Wikimedia Commons; crédito y licencia bajo cada una.
      </Text>
    </Stack>
  );
}

// Made with my soul - Swately <3
