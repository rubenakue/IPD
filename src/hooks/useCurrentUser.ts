import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api/client.ts';
import type { CurrentUserResponse } from '../types/api.ts';

/**
 * Usuario autenticado + sus proyectos (`GET /api/me`). Doble función: fuente del listado
 * de proyectos y sonda de sesión para el guard de rutas. No reintenta ante 401 (es una
 * respuesta válida: "no hay sesión").
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<CurrentUserResponse>('/me'),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 2;
    },
  });
}
