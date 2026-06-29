import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { BudgetView } from '../types/api.ts';

export function useDeleteBudgetLine(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lineId: string) => api.delete<BudgetView>(`/projects/${projectId}/budget/lines/${lineId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-budget', projectId] });
    },
  });
}
