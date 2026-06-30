import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { AddRealCostRequest, BudgetLineDetailView } from '../types/api.ts';

export function useAddRealCost(projectId: string, lineId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddRealCostRequest) =>
      api.post<BudgetLineDetailView>(`/projects/${projectId}/budget/lines/${lineId}/costs`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budget-line', projectId, lineId] });
      void queryClient.invalidateQueries({ queryKey: ['project-budget', projectId] });
    },
  });
}
