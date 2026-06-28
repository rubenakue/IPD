import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { AgentView, UpdateAgentRequest } from '../types/api.ts';

/** Edita las condiciones de un agente; al éxito refresca el listado. */
export function useUpdateAgent(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, input }: { agentId: string; input: UpdateAgentRequest }) =>
      api.patch<AgentView>(`/projects/${projectId}/agents/${agentId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-agents', projectId] });
    },
  });
}
