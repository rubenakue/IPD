import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type express from 'express';
import type { Config } from '../../src/server/config.ts';
import { createPrismaClient, type DbClient } from '../../src/lib/db/client.ts';
import { createApp } from '../../src/server/app.ts';
import {
  createSessionMiddleware,
  createSessionStore,
  type SessionStore,
} from '../../src/server/middlewares/session.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // CI can provide DATABASE_URL directly without a local .env.
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for server integration tests.');
}

export const testConfig: Config = {
  DATABASE_URL: databaseUrl,
  PORT: 0,
  NODE_ENV: 'test',
  SESSION_SECRET: 'test-session-secret-with-at-least-32-chars',
};

export function createTestPrisma(): DbClient {
  return createPrismaClient(testConfig.DATABASE_URL);
}

/**
 * Construye la app real con un store de sesiones cuyo pool podemos cerrar al acabar
 * (en `afterAll`, `store.close()`), evitando dejar conexiones a PostgreSQL abiertas.
 */
export function createTestApp(prisma: DbClient): { app: express.Express; store: SessionStore } {
  const store = createSessionStore(testConfig);
  const sessionMiddleware = createSessionMiddleware(testConfig, store);
  const app = createApp({ config: testConfig, prisma, sessionMiddleware });
  return { app, store };
}

export function listen(app: express.Express): Promise<{ url: string; server: Server }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://localhost:${port}`, server });
    });
  });
}

export function getSessionCookie(res: Response): string {
  const rawCookie = res.headers.get('set-cookie');
  if (!rawCookie) throw new Error('Expected Set-Cookie header.');
  return rawCookie.split(';')[0];
}