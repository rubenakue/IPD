import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { BudgetLineDetailView } from '../types/api.ts';

export function useReverseRealCost(projectId: string, lineId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ costId, reason }: { costId: string; reason: string }) =>
      api.post<BudgetLineDetailView>(`/projects/${projectId}/budget/costs/${costId}/reversal`, {
        reason,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budget-line', projectId, lineId] });
      void queryClient.invalidateQueries({ queryKey: ['project-budget', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['project-economics', projectId] });
    },
  });
}
