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
  // Cualquier otra cosa es un fallo no previsto: se devuelve genérico.
  return new ApiError('INTERNAL_ERROR', 'Ha ocurrido un error interno.');
}

/** Resume los problemas de validación de Zod para el campo `details`. */
function formatZodIssues(err: ZodError): { path: string; message: string }[] {
  return err.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
