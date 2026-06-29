import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { BudgetView, UpdateBudgetLineRequest } from '../types/api.ts';

export function useUpdateBudgetLine(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, input }: { lineId: string; input: UpdateBudgetLineRequest }) =>
      api.patch<BudgetView>(`/projects/${projectId}/budget/lines/${lineId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-budget', projectId] });
    },
  });
}
