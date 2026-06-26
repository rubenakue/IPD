import { Stack, Text, Title } from '@mantine/core';

// Marcador de posición del dashboard (S11). El contenido real (cuadro económico, FRC,
// alertas) se construye en S17.
export function ProjectDashboardPage() {
  return (
    <Stack>
      <Title order={2}>Panel de control</Title>
      <Text c="dimmed">Próximamente: cuadro económico, FRC y alertas del proyecto.</Text>
    </Stack>
  );
}
