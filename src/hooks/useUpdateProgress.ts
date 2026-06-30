import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { BudgetLineDetailView, UpdateProgressRequest } from '../types/api.ts';

export function useUpdateProgress(projectId: string, lineId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProgressRequest) =>
      api.patch<BudgetLineDetailView>(
        `/projects/${projectId}/budget/lines/${lineId}/progress`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budget-line', projectId, lineId] });
      void queryClient.invalidateQueries({ queryKey: ['project-budget', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['project-economics', projectId] });
    },
  });
}
