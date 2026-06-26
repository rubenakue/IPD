import { Stack, Text, Title } from '@mantine/core';

// Marcador de posición genérico para las secciones aún no implementadas en S11 (FR-011a).
export function SectionPlaceholderPage({ title }: { title?: string }) {
  return (
    <Stack>
      <Title order={2}>{title ?? 'Sección'}</Title>
      <Text c="dimmed">Próximamente. Esta sección se construirá en un hito posterior.</Text>
    </Stack>
  );
}
