import { Badge, Button, Container, Group, Paper, Table, Title } from '@mantine/core';
import { useNavigate } from 'react-router';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StatePanels.tsx';
import { useCurrentUser } from '../hooks/useCurrentUser.ts';
import { roleLabel } from '../lib/roles.ts';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useCurrentUser();

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const { projects } = data;

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={1}>Selector de proyectos</Title>
        <Button onClick={() => navigate('/projects/new')}>Nuevo proyecto</Button>
      </Group>
      {projects.length === 0 ? (
        <EmptyState
          title="No tienes proyectos asignados"
          description="Cuando un administrador te asigne a un proyecto, aparecerá aquí."
        />
      ) : (
        <Paper withBorder radius="md">
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Proyecto</Table.Th>
                <Table.Th>Código</Table.Th>
                <Table.Th>Tu rol</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {projects.map((project) => (
                <Table.Tr key={project.id}>
                  <Table.Td>{project.name}</Table.Td>
                  <Table.Td>{project.code}</Table.Td>
                  <Table.Td>
                    <Badge variant="light">{roleLabel(project.role)}</Badge>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Button size="xs" onClick={() => navigate(`/projects/${project.id}/dashboard`)}>
                      Entrar
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Container>
  );
}
