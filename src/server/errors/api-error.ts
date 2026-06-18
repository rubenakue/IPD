import type { ErrorCode } from '../../types/api.ts';

/** HTTP status que corresponde a cada código de error de la API (§14.3). */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  DOMAIN_ERROR: 422,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

/**
 * Error de la API con un código de dominio (§14.3). Cualquier punto del servidor
 * puede lanzarlo; el middleware de errores lo traduce a la respuesta estándar
 * `{ error: { code, message, details } }` con su HTTP status, sin que ningún
 * handler tenga que construir ese JSON por su cuenta.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = ERROR_STATUS[code];
    this.details = details;
  }

  static unauthenticated(
    message = 'No has iniciado sesión.',
    details: Record<string, unknown> = {},
  ): ApiError {
    return new ApiError('UNAUTHENTICATED', message, details);
  }

  static forbidden(
    message = 'No tienes permiso para esta acción.',
    details: Record<string, unknown> = {},
  ): ApiError {
    return new ApiError('FORBIDDEN', message, details);
  }

  static notFound(
    message = 'Recurso no encontrado.',
    details: Record<string, unknown> = {},
  ): ApiError {
    return new ApiError('NOT_FOUND', message, details);
  }

  static validation(
    message = 'Datos de entrada no válidos.',
    details: Record<string, unknown> = {},
  ): ApiError {
    return new ApiError('VALIDATION_ERROR', message, details);
  }
}
