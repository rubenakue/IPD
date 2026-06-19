import express, { type Express, type RequestHandler } from 'express';
import type { DbClient } from '../lib/db/client.ts';
import { getPrismaClient } from '../lib/db/client.ts';
import type { Config } from './config.ts';
import { loadConfig } from './config.ts';
import { healthRouter } from './routes/health.ts';
import { createAuthRouter } from './routes/auth.ts';
import { createMeRouter } from './routes/me.ts';
import { notFoundHandler } from './middlewares/not-found.ts';
import { errorHandler } from './middlewares/error-handler.ts';
import { createSessionMiddleware } from './middlewares/session.ts';

export interface AppOptions {
  config?: Config;
  prisma?: DbClient;
  sessionMiddleware?: RequestHandler;
}

/**
 * Construye y configura la app Express y la devuelve SIN ponerla a escuchar. Así
 * el arranque real (index.ts) y los tests (en un puerto efímero) comparten la misma
 * app sin acoplarse a un puerto.
 *
 * Orden de la cadena: parser JSON → sesión → rutas `/api` → not-found → error handler (último).
 */
export function createApp(options: AppOptions = {}): Express {
  const config = options.config ?? loadConfig();
  const prisma = options.prisma ?? getPrismaClient(config.DATABASE_URL);
  const sessionMiddleware = options.sessionMiddleware ?? createSessionMiddleware(config);

  const app = express();

  // Parseo de cuerpos JSON. Express verifica el Content-Type.
  app.use(express.json());

  // La cookie resuelve la sesión antes de cualquier ruta protegida.
  app.use(sessionMiddleware);

  // Rutas de la API, todas bajo `/api`.
  app.use('/api', healthRouter);
  app.use('/api', createAuthRouter(prisma));
  app.use('/api', createMeRouter(prisma));

  // Cualquier ruta no resuelta → NOT_FOUND con formato §14.3.
  app.use(notFoundHandler);

  // Manejo de errores centralizado: SIEMPRE el último de la cadena.
  app.use(errorHandler);

  return app;
}