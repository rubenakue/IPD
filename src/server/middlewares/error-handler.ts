import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../errors/api-error.ts';
import type { ApiErrorResponse } from '../../types/api.ts';

/**
 * Middleware de errores ÚNICO de la API (se registra el ÚLTIMO). Traduce cualquier
 * error al formato estándar §14.3. Garantiza que ningún error escape sin formatear
 * y que ningún handler construya el JSON de error por su cuenta.
 *
 * Express reconoce este middleware como manejador de errores por tener 4 parámetros.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const apiError = toApiError(err);

  // El detalle real de un fallo inesperado queda en el log del servidor, NUNCA en
  // la respuesta (FR-020). Un logger real es post-MVP; de momento, console.error.
  if (apiError.code === 'INTERNAL_ERROR') {
    console.error('[api] error no controlado:', err);
  }

  const body: ApiErrorResponse = {
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
    },
  };

  res.status(apiError.httpStatus).json(body);
};

/** Normaliza cualquier error a un ApiError con código de §14.3. */
function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof ZodError) {
    return ApiError.validation('Datos de entrada no válidos.', { issues: formatZodIssues(err) });
  }
  // express.json() lanza errores de body-parser (p. ej. JSON mal formado) ANTES de
  // las rutas y de validate(). Son errores de ENTRADA del cliente (4xx), no fallos
  // del servidor: se mapean a VALIDATION_ERROR, nunca a INTERNAL_ERROR (§14.3).
  if (isClientBodyError(err)) {
    return ApiError.validation('Cuerpo de la petición mal formado.', { type: err.type });
  }
  // Cualquier otra cosa es un fallo no previsto: se devuelve genérico.
  return new ApiError('INTERNAL_ERROR', 'Ha ocurrido un error interno.');
}

/**
 * Detecta errores de body-parser / http-errors de entrada del cliente (status 4xx):
 * p. ej. JSON mal formado (`entity.parse.failed`) o cuerpo demasiado grande. Se
 * estrecha el tipo sin usar `any`, comprobando las propiedades que añade http-errors.
 */
function isClientBodyError(err: unknown): err is Error & { type: string; status: number } {
  if (!(err instanceof Error)) return false;
  const candidate = err as Error & { type?: unknown; status?: unknown };
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.status === 'number' &&
    candidate.status >= 400 &&
    candidate.status < 500
  );
}

/** Resume los problemas de validación de Zod para el campo `details`. */
function formatZodIssues(err: ZodError): { path: string; message: string }[] {
  return err.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
