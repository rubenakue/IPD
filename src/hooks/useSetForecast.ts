import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { ProjectEconomicsResponse } from '../types/api.ts';

export function useSetForecast(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, manualForecastCents }: { lineId: string; manualForecastCents: number | null }) =>
      api.patch<ProjectEconomicsResponse>(
        `/projects/${projectId}/budget/lines/${lineId}/forecast`,
        { manualForecastCents },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-economics', projectId] });
    },
  });
}
