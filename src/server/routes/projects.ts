import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client.ts';
import type { DbClient } from '../../lib/db/client.ts';
import { withRlsContext } from '../db/rls.ts';
import { ApiError } from '../errors/api-error.ts';
import { requireAuth } from '../middlewares/require-auth.ts';
import { validate } from '../middlewares/validate.ts';
import { hasPermission } from '../permissions/matrix.ts';
import { requireProjectPermission } from '../permissions/project-agent.ts';
import { addAgent, listProjectAgents, updateAgent } from '../projects/agents.ts';
import {
  addBudgetLine,
  approveBudget,
  deleteBudgetLine,
  getProjectBudget,
  updateBudgetLine,
} from '../projects/budget.ts';
import { createProject } from '../projects/create-project.ts';
import { getPromoterPrivateCosts } from '../projects/promoter-private-costs.ts';
import {
  addRealCost,
  getBudgetLineDetail,
  reverseRealCost,
  updateProgress,
} from '../projects/real-costs.ts';
import { getProjectEconomics, setLineForecast } from '../projects/economics.ts';
import { getProjectFrc } from '../projects/frc.ts';

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

const budgetLineSchema = z.object({
  chapterCode: z.string().trim().min(1),
  chapterName: z.string().trim().min(1),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  baseAmountCents: z.number().int().min(0),
});

const updateBudgetLineSchema = budgetLineSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Indica al menos un campo a actualizar.' },
);

const addRealCostSchema = z.object({
  amountCents: z.number().int().positive(),
  incurredOn: z.iso.date('Fecha inválida (YYYY-MM-DD).'),
  description: z.string().trim().min(1),
});

const reverseRealCostSchema = z.object({
  reason: z.string().trim().min(1),
});

const updateProgressSchema = z.object({
  progressPercent: z.number().int().min(0).max(100),
});

const setForecastSchema = z.object({
  // > 0 para fijar la previsión manual, o null para volver a la regla por defecto.
  manualForecastCents: z.number().int().positive().nullable(),
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
    '/projects/:projectId/budget',
    requireAuth,
    requireProjectPermission(prisma, 'project.view'),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();
      if (!req.projectAgent) throw ApiError.notFound();

      res.json({
        budget: await getProjectBudget(prisma, userId, projectId),
        canManageBudget: hasPermission(req.projectAgent.role, 'budget.upload'),
        canRecordRealCost: hasPermission(req.projectAgent.role, 'realCost.create'),
      });
    },
  );

  router.post(
    '/projects/:projectId/budget/lines',
    requireAuth,
    requireProjectPermission(prisma, 'budget.upload'),
    validate({ body: budgetLineSchema }),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();

      const input = budgetLineSchema.parse(req.body);
      res.status(201).json(await addBudgetLine(prisma, userId, projectId, input));
    },
  );

  router.patch(
    '/projects/:projectId/budget/lines/:lineId',
    requireAuth,
    requireProjectPermission(prisma, 'budget.upload'),
    validate({ body: updateBudgetLineSchema }),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId, lineId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();
      if (typeof lineId !== 'string' || lineId.length === 0) throw ApiError.notFound();

      const input = updateBudgetLineSchema.parse(req.body);
      res.json(await updateBudgetLine(prisma, userId, projectId, lineId, input));
    },
  );

  router.delete(
    '/projects/:projectId/budget/lines/:lineId',
    requireAuth,
    requireProjectPermission(prisma, 'budget.upload'),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId, lineId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();
      if (typeof lineId !== 'string' || lineId.length === 0) throw ApiError.notFound();

      res.json(await deleteBudgetLine(prisma, userId, projectId, lineId));
    },
  );

  router.post(
    '/projects/:projectId/budget/approve',
    requireAuth,
    requireProjectPermission(prisma, 'budget.upload'),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();

      res.json(await approveBudget(prisma, userId, projectId));
    },
  );

  // Detalle de una partida: asientos, acumulado y avance (cualquier participante).
  router.get(
    '/projects/:projectId/budget/lines/:lineId',
    requireAuth,
    requireProjectPermission(prisma, 'project.view'),
    async (req, res) => {
      const { projectId, lineId } = req.params;
      const userId = req.session.userId;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();
      if (typeof lineId !== 'string' || lineId.length === 0) throw ApiError.notFound();

      res.json(await getBudgetLineDetail(prisma, userId, projectId, lineId));
    },
  );

  // Imputar un coste real a una partida (constructor o PM).
  router.post(
    '/projects/:projectId/budget/lines/:lineId/costs',
    requireAuth,
    requireProjectPermission(prisma, 'realCost.create'),
    validate({ body: addRealCostSchema }),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId, lineId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();
      if (typeof lineId !== 'string' || lineId.length === 0) throw ApiError.notFound();

      const input = addRealCostSchema.parse(req.body);
      res.status(201).json(await addRealCost(prisma, userId, projectId, lineId, input));
    },
  );

  // Anular un coste con un contra-asiento (solo PM).
  router.post(
    '/projects/:projectId/budget/costs/:costId/reversal',
    requireAuth,
    requireProjectPermission(prisma, 'realCost.reverse'),
    validate({ body: reverseRealCostSchema }),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId, costId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();
      if (typeof costId !== 'string' || costId.length === 0) throw ApiError.notFound();

      const input = reverseRealCostSchema.parse(req.body);
      res.status(201).json(await reverseRealCost(prisma, userId, projectId, costId, input));
    },
  );

  // Registrar el avance físico de una partida (constructor o PM).
  router.patch(
    '/projects/:projectId/budget/lines/:lineId/progress',
    requireAuth,
    requireProjectPermission(prisma, 'progress.update'),
    validate({ body: updateProgressSchema }),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId, lineId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();
      if (typeof lineId !== 'string' || lineId.length === 0) throw ApiError.notFound();

      const input = updateProgressSchema.parse(req.body);
      res.json(await updateProgress(prisma, userId, projectId, lineId, input));
    },
  );

  // Vista económica: derivados (vigente, previsión, desviación, alertas) (cualquier participante).
  router.get(
    '/projects/:projectId/budget/economics',
    requireAuth,
    requireProjectPermission(prisma, 'project.view'),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();
      if (!req.projectAgent) throw ApiError.notFound();

      const data = await getProjectEconomics(prisma, userId, projectId);
      res.json({ ...data, canUpdateForecast: hasPermission(req.projectAgent.role, 'forecast.update') });
    },
  );

  // Fijar/eliminar la previsión a cierre manual de una partida (constructor o PM).
  router.patch(
    '/projects/:projectId/budget/lines/:lineId/forecast',
    requireAuth,
    requireProjectPermission(prisma, 'forecast.update'),
    validate({ body: setForecastSchema }),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId, lineId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();
      if (typeof lineId !== 'string' || lineId.length === 0) throw ApiError.notFound();
      if (!req.projectAgent) throw ApiError.notFound();

      const input = setForecastSchema.parse(req.body);
      const data = await setLineForecast(prisma, userId, projectId, lineId, input.manualForecastCents);
      res.json({ ...data, canUpdateForecast: hasPermission(req.projectAgent.role, 'forecast.update') });
    },
  );

  // FRC servido por rol: el contenido se filtra en el servidor según el rol (§9.5). Puerta
  // `project.view` (deja pasar a cualquier participante, deniega al no-agente → FR-004).
  router.get(
    '/projects/:projectId/frc',
    requireAuth,
    requireProjectPermission(prisma, 'project.view'),
    async (req, res) => {
      const userId = req.session.userId;
      const { projectId } = req.params;
      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();
      if (!req.projectAgent) throw ApiError.notFound();

      res.json(await getProjectFrc(prisma, userId, projectId, req.projectAgent));
    },
  );

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
