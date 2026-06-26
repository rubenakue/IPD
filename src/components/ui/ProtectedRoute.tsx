import { Center, Loader } from '@mantine/core';
import { Navigate, Outlet } from 'react-router';
import { useCurrentUser } from '../../hooks/useCurrentUser.ts';
import { ApiError } from '../../lib/api/client.ts';
import { ErrorState } from './StatePanels.tsx';

/**
 * Envuelve las rutas privadas. Mientras resuelve `['me']`, muestra carga; si no hay
 * sesión (401), redirige a `/login` (FR-003); ante otro error, panel con reintento
 * (FR-014). La decisión de seguridad la toma el servidor: aquí solo reaccionamos.
 */
export function ProtectedRoute() {
  const { isPending, isError, error, refetch } = useCurrentUser();

  if (isPending) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (isError) {
    if (error instanceof ApiError && error.status === 401) {
      return <Navigate to="/login" replace />;
    }
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return <Outlet />;
}
