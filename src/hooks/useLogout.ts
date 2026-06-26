import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { LogoutResponse } from '../types/api.ts';

/** Mutación de logout: cierra la sesión en el servidor y limpia toda la caché local. */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<LogoutResponse>('/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
