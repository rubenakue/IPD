// Contrato HTTP de la API IPD, COMPARTIDO entre el servidor (src/server) y el
// futuro frontend. No es dominio (eso vive en domain.ts): es transporte.
// La forma del error la fija docs/concepto-global.md §14.3.

/** Códigos de error de la API. Lista cerrada (§14.3). */
export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'DOMAIN_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

/** Cuerpo de TODA respuesta de error de la API (§14.3). */
export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details: Record<string, unknown>;
  };
}
