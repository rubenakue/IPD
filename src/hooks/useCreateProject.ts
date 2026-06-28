import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { CreateProjectRequest, CreateProjectResponse } from '../types/api.ts';

/** Crea un proyecto; al éxito invalida `['me']` para que aparezca en el listado. */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectRequest) => api.post<CreateProjectResponse>('/projects', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
