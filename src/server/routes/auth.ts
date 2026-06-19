import argon2 from 'argon2';
import { Router } from 'express';
import { z } from 'zod';
import type { DbClient } from '../../lib/db/client.ts';
import type { LogoutResponse } from '../../types/api.ts';
import { recordAuditEvent, type AuditEventInput } from '../audit/record-audit-event.ts';
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

// Hash argon2 "señuelo" para igualar el coste temporal cuando el email no existe.
// Sin él, `||` cortocircuitaría y se saltaría argon2.verify en la rama de usuario
// inexistente: la respuesta sería medibles más rápida y permitiría enumerar cuentas
// (oráculo de timing). Se calcula una vez y se reutiliza.
let dummyPasswordHash: Promise<string> | null = null;
function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHash ??= argon2.hash('invalid-credentials-placeholder');
  return dummyPasswordHash;
}

// La auditoría es un efecto secundario: su fallo NO debe tumbar un login/logout ya
// consumado (la sesión ya quedó creada o destruida). Se registra best-effort.
async function safeRecordAuditEvent(prisma: DbClient, input: AuditEventInput): Promise<void> {
  try {
    await recordAuditEvent(prisma, input);
  } catch (auditErr) {
    console.error('[api] auditoría fallida:', auditErr);
  }
}

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

    // Se verifica SIEMPRE contra un hash (el real o el señuelo) para que el tiempo
    // de respuesta no delate si el email existe.
    const passwordHash = user?.passwordHash ?? (await getDummyPasswordHash());
    const passwordValid = await argon2.verify(passwordHash, password);
    if (!user || !passwordValid) {
      throw ApiError.unauthenticated(INVALID_CREDENTIALS_MESSAGE);
    }

    await regenerateSession(req);
    req.session.userId = user.id;
    await saveSession(req);

    await safeRecordAuditEvent(prisma, {
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
      await safeRecordAuditEvent(prisma, {
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