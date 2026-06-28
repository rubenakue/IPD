import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { AddAgentRequest, AgentView } from '../types/api.ts';

/** Añade un agente al proyecto; al éxito refresca el listado de agentes. */
export function useAddAgent(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddAgentRequest) =>
      api.post<AgentView>(`/projects/${projectId}/agents`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-agents', projectId] });
    },
  });
}
