import session, { type SessionOptions } from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import type { RequestHandler } from 'express';
import type { Config } from '../config.ts';

export const SESSION_COOKIE_NAME = 'ipd.sid';
// 24 h "rolling": la sesión expira tras 24 h de INACTIVIDAD; cada petición
// autenticada renueva la ventana (`rolling: true`). Decisión de clarify (FR-002).
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const PgSessionStore = connectPgSimple(session);

/** Store de sesiones en PostgreSQL. Se expone para poder cerrarlo (pool propio). */
export type SessionStore = InstanceType<typeof PgSessionStore>;

/**
 * Crea el store de sesiones. connect-pg-simple abre su PROPIO pool de pg a partir
 * de `conString`; quien lo crea es responsable de cerrarlo con `store.close()`
 * (apagado del servidor en index.ts, limpieza en tests).
 */
export function createSessionStore(config: Config): SessionStore {
  return new PgSessionStore({
    conString: config.DATABASE_URL,
    createTableIfMissing: false,
    tableName: 'session',
  });
}

export function createSessionMiddleware(
  config: Config,
  store: SessionStore = createSessionStore(config),
): RequestHandler {
  const options: SessionOptions = {
    name: SESSION_COOKIE_NAME,
    store,
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_MS,
    },
  };

  return session(options);
}