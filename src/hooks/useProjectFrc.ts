import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { ProjectFrcResponse } from '../types/api.ts';

export function useProjectFrc(projectId: string, enabled = true) {
  return useQuery({
    queryKey: ['project-frc', projectId],
    queryFn: () => api.get<ProjectFrcResponse>(`/projects/${projectId}/frc`),
    enabled: Boolean(projectId) && enabled,
  });
}
