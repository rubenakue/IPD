import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { BudgetLineDetailView } from '../types/api.ts';

export function useBudgetLineDetail(projectId: string, lineId: string | null) {
  return useQuery({
    queryKey: ['budget-line', projectId, lineId],
    queryFn: () =>
      api.get<BudgetLineDetailView>(`/projects/${projectId}/budget/lines/${lineId}`),
    enabled: Boolean(projectId) && Boolean(lineId),
  });
}
