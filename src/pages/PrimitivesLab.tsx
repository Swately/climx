import { Link } from '../router/router';
import Stack from '../primitives/Stack';
import Cluster from '../primitives/Cluster';
import Grid from '../primitives/Grid';
import Box from '../primitives/Box';
import Text from '../primitives/Text';

// Living styleguide: the five primitives + the token scales, rendered with
// themselves. Doubles as a visual regression page for layout changes.
export default function PrimitivesLab() {
  return (
    <Stack as="main" gap={6}>
      <Stack as="header" gap={1}>
        <Text as="h1" size={600}>
          Laboratorio de primitivos
        </Text>
        <Text as="p" muted>
          Los cinco primitivos de layout de climx, renderizados consigo mismos. Tokens en{' '}
          <code>src/styles/tokens.css</code>.
        </Text>
      </Stack>

      <section aria-labelledby="lab-stack">
        <Stack gap={3}>
          <Text as="h2" size={400} id="lab-stack">
            Stack — columna con gap de la escala
          </Text>
          <Box variant="surface" padding={4}>
            <Stack gap={2}>
              <Text as="span">gap=2</Text>
              <Text as="span" muted>
                elemento B
              </Text>
              <Text as="span" muted>
                elemento C
              </Text>
            </Stack>
          </Box>
        </Stack>
      </section>

      <section aria-labelledby="lab-cluster">
        <Stack gap={3}>
          <Text as="h2" size={400} id="lab-cluster">
            Cluster — fila que envuelve
          </Text>
          <Box variant="surface" padding={4}>
            <Cluster gap={3}>
              {['Oaxaca', 'Jalisco', 'Nuevo León', 'Yucatán', 'Chihuahua'].map((n) => (
                <Box key={n} variant="surface" padding={2}>
                  <Text as="span" size={200}>
                    {n}
                  </Text>
                </Box>
              ))}
            </Cluster>
          </Box>
        </Stack>
      </section>

      <section aria-labelledby="lab-grid">
        <Stack gap={3}>
          <Text as="h2" size={400} id="lab-grid">
            Grid — columnas auto-fill desde un mínimo
          </Text>
          <Grid min="9rem" gap={3}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Box key={n} variant="surface" padding={4}>
                <Text as="span">celda {n}</Text>
              </Box>
            ))}
          </Grid>
        </Stack>
      </section>

      <section aria-labelledby="lab-text">
        <Stack gap={3}>
          <Text as="h2" size={400} id="lab-text">
            Text — escala tipográfica
          </Text>
          <Box variant="surface" padding={4}>
            <Stack gap={2} align="start">
              {([600, 500, 400, 300, 200, 100] as const).map((s) => (
                <Text key={s} as="span" size={s}>
                  font-size-{s}
                </Text>
              ))}
            </Stack>
          </Box>
        </Stack>
      </section>

      <nav aria-label="secciones">
        <Link to="/">Volver al inicio</Link>
      </nav>
    </Stack>
  );
}

// Made with my soul - Swately <3
