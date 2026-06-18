import type { RequestHandler } from 'express';
import { ApiError } from '../errors/api-error.ts';

/**
 * Cualquier ruta no resuelta cae aquí (se monta tras las rutas y antes del error
 * handler) y se convierte en un NOT_FOUND con formato §14.3, en lugar del HTML
 * "Cannot GET ..." que Express devuelve por defecto.
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};
