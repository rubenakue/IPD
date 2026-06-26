import { AppShell, Burger, Button, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate, useParams } from 'react-router';
import { ProjectProvider } from '../../context/ProjectContext.tsx';
import { useCurrentUser } from '../../hooks/useCurrentUser.ts';
import { useLogout } from '../../hooks/useLogout.ts';
import { ProjectContextHeader } from '../domain/ProjectContextHeader.tsx';
import { SideNav } from '../domain/SideNav.tsx';
import { EmptyState, ErrorState, LoadingState } from './StatePanels.tsx';

/**
 * Marco de navegación del proyecto: cabecera de contexto + menú lateral + zona de
 * contenido (Outlet). Resuelve el proyecto activo de `['me']` por `:projectId`; si el
 * usuario no participa en él, no muestra datos (FR-007, FR-016).
 */
export function AppLayout() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const logout = useLogout();
  const [opened, { toggle }] = useDisclosure();
  const { data, isPending, isError, refetch } = useCurrentUser();

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const project = data.projects.find((candidate) => candidate.id === projectId);
  if (!project) {
    return (
      <EmptyState
        title="Proyecto no disponible"
        description="No tienes acceso a este proyecto o no existe."
      />
    );
  }

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) });
  };

  return (
    <ProjectProvider project={project}>
      <AppShell
        header={{ height: 64 }}
        navbar={{ width: 264, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between" wrap="nowrap">
            <Group wrap="nowrap">
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <ProjectContextHeader />
            </Group>
            <Group wrap="nowrap">
              <Button variant="subtle" size="xs" onClick={() => navigate('/projects')}>
                Mis proyectos
              </Button>
              <Button
                variant="default"
                size="xs"
                onClick={handleLogout}
                loading={logout.isPending}
              >
                Cerrar sesión
              </Button>
            </Group>
          </Group>
        </AppShell.Header>
        <AppShell.Navbar p="sm">
          <SideNav />
        </AppShell.Navbar>
        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </ProjectProvider>
  );
}
