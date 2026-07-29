import Box from '../primitives/Box';
import Stack from '../primitives/Stack';
import Text from '../primitives/Text';

export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Box variant="surface" padding={5} role="alert">
      <Stack gap={3} align="start">
        <Text as="p" bold>
          No se pudieron cargar los datos.
        </Text>
        <Text as="p" muted size={200}>
          {message}
        </Text>
        {onRetry && (
          <button type="button" onClick={onRetry}>
            Reintentar
          </button>
        )}
      </Stack>
    </Box>
  );
}

// Made with my soul - Swately <3
