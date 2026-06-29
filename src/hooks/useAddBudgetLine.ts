import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { BudgetLineInput, BudgetView } from '../types/api.ts';

export function useAddBudgetLine(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BudgetLineInput) =>
      api.post<BudgetView>(`/projects/${projectId}/budget/lines`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-budget', projectId] });
    },
  });
}
