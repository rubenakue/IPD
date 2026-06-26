import { Button, Container, Stack, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="sm">
        <Title order={1}>404</Title>
        <Text c="dimmed">La página que buscas no existe.</Text>
        <Button onClick={() => navigate('/projects')}>Ir a mis proyectos</Button>
      </Stack>
    </Container>
  );
}
