import { randomUUID } from 'node:crypto';
import { PhaseName } from '../../generated/prisma/client.ts';
import type { DbClient } from '../../lib/db/client.ts';
import type { CreateProjectResponse } from '../../types/api.ts';
import { safeRecordAuditEvent } from '../audit/record-audit-event.ts';
import { withUserRlsContext } from '../db/rls.ts';
import { ApiError } from '../errors/api-error.ts';

// Las 4 fases fijas del proyecto (§9.2), en orden. Validación es la activa inicial.
const PHASES: readonly { name: PhaseName; order: number }[] = [
  { name: PhaseName.VALIDATION, order: 1 },
  { name: PhaseName.PRE_CONSTRUCTION, order: 2 },
  { name: PhaseName.CONSTRUCTION, order: 3 },
  { name: PhaseName.CLOSURE, order: 4 },
];

export interface CreateProjectInput {
  name: string;
  code: string;
  clientName: string;
  description?: string;
}

/**
 * Crea un proyecto operativo: Project + Agent PM (el creador) + 4 fases (Validación
 * activa), en una transacción bajo el contexto RLS de bootstrap (research D1). El orden
 * importa: el Agent PM se inserta antes que las fases para satisfacer sus políticas RLS.
 */
export async function createProject(
  prisma: DbClient,
  userId: string,
  input: CreateProjectInput,
): Promise<CreateProjectResponse> {
  // Unicidad del código: comprobación previa para un CONFLICT limpio (el cliente sin
  // contexto RLS ve todos los proyectos). El INSERT crudo es el respaldo ante carreras.
  const existing = await prisma.project.findUnique({ where: { code: input.code } });
  if (existing) {
    throw new ApiError('CONFLICT', 'Ya existe un proyecto con ese código.');
  }

  const created = await withUserRlsContext(prisma, userId, async (tx) => {
    const projectId = randomUUID();

    // INSERT crudo SIN RETURNING: en el bootstrap aún no existe el Agent del creador,
    // así que la política SELECT de "Project" (app_is_active_agent) es falsa; un
    // INSERT ... RETURNING (lo que hace el ORM `create`) fallaría la RLS al devolver la
    // fila. Insertamos con el id ya generado y seguimos con el ORM (que sí funciona en
    // cuanto el Agent PM existe). `status` y `createdAt` usan sus DEFAULT.
    await tx.$executeRaw`
      INSERT INTO "Project" ("id", "name", "code", "clientName", "description")
      VALUES (${projectId}, ${input.name}, ${input.code}, ${input.clientName}, ${input.description ?? null})
    `;

    // Igual que Project: INSERT crudo sin RETURNING. El ORM `create` devolvería la fila
    // y su SELECT policy (app_is_active_agent) no ve aún la fila del propio comando.
    const agentId = randomUUID();
    await tx.$executeRaw`
      INSERT INTO "Agent" ("id", "userId", "projectId", "role", "sharePercent")
      VALUES (${agentId}, ${userId}, ${projectId}, 'PROJECT_MANAGER'::"AgentRole", 0)
    `;

    await tx.phase.createMany({
      data: PHASES.map((phase) => ({ projectId, name: phase.name, order: phase.order })),
    });

    const validation = await tx.phase.findFirstOrThrow({
      where: { projectId, name: PhaseName.VALIDATION },
    });
    await tx.project.update({
      where: { id: projectId },
      data: { activePhaseId: validation.id },
    });

    return { id: projectId, code: input.code, name: input.name, agentId };
  });

  await safeRecordAuditEvent(prisma, {
    action: 'project.created',
    actorUserId: userId,
    projectId: created.id,
    entityType: 'Project',
    entityId: created.id,
  });

  return { ...created, role: 'PROJECT_MANAGER' };
}
