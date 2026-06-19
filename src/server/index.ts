import { createApp } from './app.ts';
import { loadConfig, type Config } from './config.ts';
import { getPrismaClient } from '../lib/db/client.ts';
import { createSessionMiddleware, createSessionStore } from './middlewares/session.ts';

/** Punto de entrada del servidor: valida la config, construye la app y escucha. */
function main(): void {
  let config: Config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(`[api] ${err instanceof Error ? err.message : 'configuración inválida'}`);
    process.exit(1);
  }

  // Se crean explícitamente para poder cerrarlos en el apagado (ambos abren un pool
  // de conexiones a PostgreSQL: el de Prisma y el propio de connect-pg-simple).
  const prisma = getPrismaClient(config.DATABASE_URL);
  const sessionStore = createSessionStore(config);
  const sessionMiddleware = createSessionMiddleware(config, sessionStore);

  const app = createApp({ config, prisma, sessionMiddleware });
  const server = app.listen(config.PORT, () => {
    console.log(`[api] escuchando en http://localhost:${config.PORT}`);
  });

  // Apagado limpio: deja de aceptar conexiones y cierra ambos pools de PostgreSQL.
  function shutdown(signal: NodeJS.Signals): void {
    console.log(`[api] ${signal} recibido, cerrando...`);
    server.close(() => {
      sessionStore.close();
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();