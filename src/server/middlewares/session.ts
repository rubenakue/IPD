import session, { type SessionOptions } from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import type { RequestHandler } from 'express';
import type { Config } from '../config.ts';

export const SESSION_COOKIE_NAME = 'ipd.sid';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

const PgSessionStore = connectPgSimple(session);

export function createSessionMiddleware(config: Config): RequestHandler {
  const store = new PgSessionStore({
    conString: config.DATABASE_URL,
    createTableIfMissing: false,
    tableName: 'session',
  });

  const options: SessionOptions = {
    name: SESSION_COOKIE_NAME,
    store,
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_MS,
    },
  };

  return session(options);
}