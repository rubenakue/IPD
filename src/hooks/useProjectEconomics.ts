import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { ProjectEconomicsResponse } from '../types/api.ts';

export function useProjectEconomics(projectId: string, enabled = true) {
  return useQuery({
    queryKey: ['project-economics', projectId],
    queryFn: () =>
      api.get<ProjectEconomicsResponse>(`/projects/${projectId}/budget/economics`),
    enabled: Boolean(projectId) && enabled,
  });
}
