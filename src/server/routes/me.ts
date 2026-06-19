import { Router } from 'express';
import type { DbClient } from '../../lib/db/client.ts';
import { getCurrentUserResponse } from '../auth/current-user.ts';
import { ApiError } from '../errors/api-error.ts';
import { requireAuth } from '../middlewares/require-auth.ts';

export function createMeRouter(prisma: DbClient): Router {
  const router = Router();

  router.get('/me', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    if (typeof userId !== 'string') throw ApiError.unauthenticated();

    res.json(await getCurrentUserResponse(prisma, userId));
  });

  return router;
}