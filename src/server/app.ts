import express, { type Express } from 'express';
import { healthRouter } from './routes/health.ts';
import { notFoundHandler } from './middlewares/not-found.ts';
import { errorHandler } from './middlewares/error-handler.ts';

/**
 * Construye y configura la app Express y la devuelve SIN ponerla a escuchar. Así
 * el arranque real (index.ts) y los tests (en un puerto efímero) comparten la misma
 * app sin acoplarse a un puerto.
 *
 * Orden de la cadena: parser JSON → rutas `/api` → not-found → error handler (último).
 */
export function createApp(): Express {
  const app = express();

  // Parseo de cuerpos JSON. Express verifica el Content-Type.
  app.use(express.json());

  // Rutas de la API, todas bajo `/api`.
  app.use('/api', healthRouter);

  // Cualquier ruta no resuelta → NOT_FOUND con formato §14.3.
  app.use(notFoundHandler);

  // Manejo de errores centralizado: SIEMPRE el último de la cadena.
  app.use(errorHandler);

  return app;
}
