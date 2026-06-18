import argon2 from 'argon2';
import { Router } from 'express';
import { z } from 'zod';
import type { DbClient } from '../../lib/db/client.ts';
import type { LogoutResponse } from '../../types/api.ts';
import { recordAuditEvent } from '../audit/record-audit-event.ts';
import { getCurrentUserResponse } from '../auth/current-user.ts';
import { destroySession, regenerateSession, saveSession } from '../auth/session-promises.ts';
import { ApiError } from '../errors/api-error.ts';
import { validate } from '../middlewares/validate.ts';
import { SESSION_COOKIE_NAME } from '../middlewares/session.ts';

const INVALID_CREDENTIALS_MESSAGE = 'Email o contraseña incorrectos.';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function createAuthRouter(prisma: DbClient): Router {
  const router = Router();

  router.post('/auth/login', validate({ body: loginSchema }), async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        displayName: true,
        passwordHash: true,
      },
    });

    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw ApiError.unauthenticated(INVALID_CREDENTIALS_MESSAGE);
    }

    await regenerateSession(req);
    req.session.userId = user.id;
    await saveSession(req);

    await recordAuditEvent(prisma, {
      action: 'auth.login',
      actorUserId: user.id,
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email },
    });

    res.json(await getCurrentUserResponse(prisma, user.id));
  });

  router.post('/auth/logout', async (req, res) => {
    const userId = typeof req.session.userId === 'string' ? req.session.userId : null;

    if (userId) {
      await recordAuditEvent(prisma, {
        action: 'auth.logout',
        actorUserId: userId,
        entityType: 'User',
        entityId: userId,
      });
    }

    await destroySession(req);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });

    const body: LogoutResponse = { ok: true };
    res.json(body);
  });

  return router;
}