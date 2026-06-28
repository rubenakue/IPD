import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client.ts';
import type { DbClient } from '../../lib/db/client.ts';
import { withRlsContext } from '../db/rls.ts';
import { ApiError } from '../errors/api-error.ts';
import { requireAuth } from '../middlewares/require-auth.ts';
import { validate } from '../middlewares/validate.ts';
import { requireProjectPermission } from '../permissions/project-agent.ts';
import { addAgent, listProjectAgents, updateAgent } from '../projects/agents.ts';
import { createProject } from '../projects/create-project.ts';
import { getPromoterPrivateCosts } from '../projects/promoter-private-costs.ts';

const createProjectSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  clientName: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

const projectRoleSchema = z.enum([
  'PROMOTER',
  'DESIGNER',
  'CONSTRUCTOR',
  'PROJECT_MANAGER',
  'OBSERVER',
]);

const addAgentSchema = z.object({
  email: z.string().email(),
  role: projectRoleSchema,
  sharePercent: z.number().int().min(0).max(100),
  guaranteedFeeCents: z.number().int().min(0),
  feeAtRiskCents: z.number().int().min(0),
});

const updateAgentSchema = z
  .object({
    role: projectRoleSchema,
    sharePercent: z.number().int().min(0).max(100),
    guaranteedFeeCents: z.number().int().min(0),
    feeAtRiskCents: z.number().int().min(0),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Indica al menos un campo a actualizar.',
  });

/**
 * `true` si el error es una violación de unicidad: P2002 del ORM o el SQLSTATE 23505
 * de Postgres (que es como aflora desde un `$executeRaw`, usado al crear el proyecto).
 */
function isCodeConflict(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  // P2002: unique violation del ORM. P2010: el INSERT crudo del bootstrap propaga el
  // SQLSTATE 23505 dentro del mensaje de "raw query failed".
  if (err.code === 'P2002') return true;
  return err.code === 'P2010' && err.message.includes('23505');
}

export function createProjectsRouter(prisma: DbClient): Router {
  const router = Router();

  // Crear proyecto: cualquier usuario autenticado; queda como PM (§10.0).
  router.post('/projects', requireAuth, validate({ body: createProjectSchema }), async (req, res) => {
    const userId = req.session.userId;
    if (typeof userId !== 'string') throw ApiError.unauthenticated();

    const input = createProjectSchema.parse(req.body);
    try {
      const body = await createProject(prisma, userId, input);
      res.status(201).json(body);
    } catch (err) {
      if (isCodeConflict(err)) {
        throw new ApiError('CONFLICT', 'Ya existe un proyecto con ese código.');
      }
      throw err;
    }
  });

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

  // Listar agentes del proyecto + estado de reparto (cualquier participante).
  router.get(
    '/projects/:projectId/agents',
    requireAuth,
    requireProjectPermission(prisma, 'project.view'),
    async (req, res) => {
      const { projectId } = req.params;
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();
      res.json(await listProjectAgents(prisma, projectId));
    },
  );

  // Añadir un agente (solo el PM del proyecto).
  router.post(
    '/projects/:projectId/agents',
    requireAuth,
    requireProjectPermission(prisma, 'agent.manage'),
    validate({ body: addAgentSchema }),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();

      const input = addAgentSchema.parse(req.body);
      res.status(201).json(await addAgent(prisma, projectId, userId, input));
    },
  );

  // Editar las condiciones de un agente (solo el PM del proyecto).
  router.patch(
    '/projects/:projectId/agents/:agentId',
    requireAuth,
    requireProjectPermission(prisma, 'agent.manage'),
    validate({ body: updateAgentSchema }),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId, agentId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();
      if (typeof agentId !== 'string' || agentId.length === 0) throw ApiError.notFound();

      const input = updateAgentSchema.parse(req.body);
      res.json(await updateAgent(prisma, projectId, userId, agentId, input));
    },
  );

  return router;
}
