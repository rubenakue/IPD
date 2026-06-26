import type { ApiErrorResponse, ErrorCode } from '../../types/api.ts';

/**
 * Error tipado de la API. Traduce el cuerpo estándar `ApiErrorResponse` (§14.3) a una
 * excepción con la que el frontend puede decidir (p. ej. `UNAUTHENTICATED` → ir a login).
 * `status` 0 indica fallo de red / servidor inaccesible (FR-014).
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown>;
  readonly status: number;

  constructor(status: number, body: ApiErrorResponse['error']) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.details = body.details;
    this.status = status;
  }
}

const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new ApiError(0, { code: 'INTERNAL_ERROR', message: NETWORK_ERROR_MESSAGE, details: {} });
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    if (body?.error) {
      throw new ApiError(response.status, body.error);
    }
    throw new ApiError(response.status, {
      code: 'INTERNAL_ERROR',
      message: 'Error inesperado del servidor.',
      details: {},
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** Cliente HTTP del frontend. Siempre envía la cookie de sesión (`credentials: include`). */
export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};
