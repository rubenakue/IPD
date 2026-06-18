import type { RequestHandler } from 'express';
import { z } from 'zod';

/** Esquemas Zod opcionales para cada parte de la petición. */
export interface ValidationSchemas {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
}

/**
 * Valida partes de la petición con esquemas Zod ANTES de procesarla. Si alguna no
 * cumple, el ZodError se pasa al middleware de errores, que lo traduce a
 * `VALIDATION_ERROR` (§14.3). Si todo cumple, sigue al handler.
 *
 * Pieza reutilizable: en S08 no hay endpoints con entrada (solo `/health`), pero
 * S09 la usará en `POST /api/login`. `req.query` es de solo lectura en Express 5,
 * así que aquí solo se valida; cada handler usará luego los datos ya validados.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      schemas.params?.parse(req.params);
      schemas.query?.parse(req.query);
      schemas.body?.parse(req.body);
      next();
    } catch (err) {
      next(err); // ZodError → VALIDATION_ERROR en el middleware de errores
    }
  };
}
