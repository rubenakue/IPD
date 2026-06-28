import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { ProjectAgentsResponse } from '../types/api.ts';

/** Agentes del proyecto + suma de reparto (`shareSum`, `isComplete`). */
export function useProjectAgents(projectId: string) {
  return useQuery({
    queryKey: ['project-agents', projectId],
    queryFn: () => api.get<ProjectAgentsResponse>(`/projects/${projectId}/agents`),
  });
}
