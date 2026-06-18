import { AgentStatus, ProjectStatus } from '../../generated/prisma/client.ts';
import type { DbClient } from '../../lib/db/client.ts';
import type { CurrentUserResponse } from '../../types/api.ts';
import { ApiError } from '../errors/api-error.ts';

export async function getCurrentUserResponse(
  prisma: DbClient,
  userId: string,
): Promise<CurrentUserResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      agents: {
        where: {
          status: AgentStatus.ACTIVE,
          project: { status: ProjectStatus.ACTIVE },
        },
        select: {
          id: true,
          role: true,
          project: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!user) {
    throw ApiError.unauthenticated();
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
    projects: user.agents.map((agent) => ({
      id: agent.project.id,
      code: agent.project.code,
      name: agent.project.name,
      agentId: agent.id,
      role: agent.role,
    })),
  };
}