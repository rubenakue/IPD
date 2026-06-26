import { Alert, Button, Center, Loader, Stack, Text } from '@mantine/core';

/** Estado de carga genérico. */
export function LoadingState() {
  return (
    <Center mih={200}>
      <Loader />
    </Center>
  );
}

/** Estado vacío informativo (p. ej. usuario sin proyectos). */
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Center mih={200}>
      <Stack align="center" gap="xs">
        <Text fw={600}>{title}</Text>
        {description && (
          <Text c="dimmed" size="sm" ta="center">
            {description}
          </Text>
        )}
      </Stack>
    </Center>
  );
}

/** Estado de error con opción de reintento (FR-014). */
export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <Center mih={200}>
      <Stack align="center" gap="sm">
        <Alert color="red" variant="light" title="Algo ha ido mal">
          {message ?? 'No se pudo completar la operación. Inténtalo de nuevo.'}
        </Alert>
        {onRetry && (
          <Button variant="default" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </Stack>
    </Center>
  );
}
