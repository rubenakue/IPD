import type { RequestHandler } from 'express';
import { AgentStatus, ProjectStatus, type AgentRole } from '../../generated/prisma/client.ts';
import type { DbClient } from '../../lib/db/client.ts';
import { ApiError } from '../errors/api-error.ts';
import { hasPermission, type PermissionAction } from './matrix.ts';

export interface ProjectAgentContext {
  agentId: string;
  userId: string;
  projectId: string;
  role: AgentRole;
}

export async function resolveProjectAgent(
  prisma: DbClient,
  userId: string,
  projectId: string,
): Promise<ProjectAgentContext> {
  const agent = await prisma.agent.findFirst({
    where: {
      userId,
      projectId,
      status: AgentStatus.ACTIVE,
      project: { status: ProjectStatus.ACTIVE },
    },
    select: {
      id: true,
      role: true,
      projectId: true,
      userId: true,
    },
  });

  if (!agent) {
    throw ApiError.notFound();
  }

  return {
    agentId: agent.id,
    userId: agent.userId,
    projectId: agent.projectId,
    role: agent.role,
  };
}

export function requireProjectPermission(prisma: DbClient, action: PermissionAction): RequestHandler {
  return async (req, _res, next) => {
    try {
      const userId = req.session.userId;
      const { projectId } = req.params;

      if (typeof userId !== 'string') throw ApiError.unauthenticated();
      if (typeof projectId !== 'string' || projectId.length === 0) throw ApiError.notFound();

      const agent = await resolveProjectAgent(prisma, userId, projectId);
      if (!hasPermission(agent.role, action)) {
        throw ApiError.forbidden();
      }

      req.projectAgent = agent;
      next();
    } catch (err) {
      next(err);
    }
  };
}
