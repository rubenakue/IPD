import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client.ts';
import type { CurrentUserResponse } from '../types/api.ts';

export interface LoginInput {
  email: string;
  password: string;
}

/** Mutación de login: autentica y siembra la caché de `['me']` con la respuesta. */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<CurrentUserResponse>('/auth/login', input),
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data);
    },
  });
}
