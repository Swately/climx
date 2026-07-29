import { Link, useParams } from '../router/router';
import { useMunicipioIndex } from '../lib/data/hooks';
import Stack from '../primitives/Stack';
import Grid from '../primitives/Grid';
import Text from '../primitives/Text';
import ErrorState from '../components/ErrorState';
import { estadoImg } from '../components/EstadoCard';
import styles from './StatePage.module.css';

export default function StatePage() {
  const { ides } = useParams<{ ides: string }>();
  const index = useMunicipioIndex();

  if (index.status === 'loading')
    return (
      <Text as="p" aria-busy="true">
        Cargando municipios…
      </Text>
    );
  if (index.status === 'error') return <ErrorState message={index.message} />;

  const rows = index.data.filter((r) => r[0] === ides);
  const nes = rows[0]?.[3] ?? `Estado ${ides}`;

  return (
    <Stack as="main" gap={5}>
      <nav aria-label="migas">
        <Link to="/">Inicio</Link>
      </nav>
      <header>
        <Stack gap={3}>
          <img
            src={estadoImg(ides)}
            alt=""
            className={styles.banner}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <Stack gap={1}>
            <Text as="h1" size={600}>
              {nes}
            </Text>
            <Text as="p" muted>
              {rows.length} municipios con pronóstico
            </Text>
          </Stack>
        </Stack>
      </header>
      <Grid as="ul" min="14rem" gap={2} aria-label={`municipios de ${nes}`}>
        {rows.map((r) => (
          <li key={`${r[0]}/${r[1]}`}>
            <Link to={`/estado/${r[0]}/municipio/${r[1]}`}>{r[2]}</Link>
          </li>
        ))}
      </Grid>
    </Stack>
  );
}

// Made with my soul - Swately <3
