import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { ProjectBudgetResponse } from '../types/api.ts';

export function useProjectBudget(projectId: string) {
  return useQuery({
    queryKey: ['project-budget', projectId],
    queryFn: () => api.get<ProjectBudgetResponse>(`/projects/${projectId}/budget`),
  });
}
