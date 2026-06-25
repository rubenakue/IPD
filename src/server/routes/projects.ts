import { Router } from 'express';
import type { DbClient } from '../../lib/db/client.ts';
import { withRlsContext } from '../db/rls.ts';
import { ApiError } from '../errors/api-error.ts';
import { requireAuth } from '../middlewares/require-auth.ts';
import { requireProjectPermission } from '../permissions/project-agent.ts';
import { getPromoterPrivateCosts } from '../projects/promoter-private-costs.ts';

export function createProjectsRouter(prisma: DbClient): Router {
  const router = Router();

  router.get(
    '/projects/:projectId/promoter-private-costs',
    requireAuth,
    requireProjectPermission(prisma, 'promoterPrivateCosts.view'),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId } = req.params;

      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();

      const body = await withRlsContext(prisma, { userId, projectId }, (tx) =>
        getPromoterPrivateCosts(tx, projectId),
      );

      res.json(body);
    },
  );

  return router;
}
