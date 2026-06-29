import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { BudgetView } from '../types/api.ts';

export function useApproveBudget(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<BudgetView>(`/projects/${projectId}/budget/approve`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-budget', projectId] });
    },
  });
}
