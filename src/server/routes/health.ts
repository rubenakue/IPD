import { Router } from 'express';

/**
 * Router de salud. `GET /health` (montado bajo `/api`) devuelve un estado simple
 * para comprobar que la API está viva. Sin autenticación, sin envoltorio y, en
 * S08, sin consultar la base de datos (comprobar Postgres es mejora posterior).
 */
export const healthRouter: Router = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
