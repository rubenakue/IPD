import type { Prisma } from '../../generated/prisma/client.ts';
import type { DbClient } from '../../lib/db/client.ts';
import { withRlsContext } from '../db/rls.ts';

export interface AuditEventInput {
  action: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  projectId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function recordAuditEvent(
  prisma: DbClient,
  input: AuditEventInput,
): Promise<void> {
  if (input.projectId && input.actorUserId) {
    await withRlsContext(prisma, { userId: input.actorUserId, projectId: input.projectId }, async (tx) => {
      await tx.auditEvent.create({
        data: {
          action: input.action,
          actorUserId: input.actorUserId,
          entityType: input.entityType,
          entityId: input.entityId,
          projectId: input.projectId ?? null,
          metadata: input.metadata,
        },
      });
    });
    return;
  }

  await prisma.auditEvent.create({
    data: {
      action: input.action,
      actorUserId: input.actorUserId,
      entityType: input.entityType,
      entityId: input.entityId,
      projectId: input.projectId ?? null,
      metadata: input.metadata,
    },
  });
}

/**
 * Registra un AuditEvent best-effort: su fallo NO debe tumbar una operación ya
 * consumada (una sesión creada/destruida, un proyecto creado, un agente añadido). El
 * error se traga y se registra. Compartido por auth, creación de proyecto y agentes.
 */
export async function safeRecordAuditEvent(prisma: DbClient, input: AuditEventInput): Promise<void> {
  try {
    await recordAuditEvent(prisma, input);
  } catch (auditErr) {
    console.error('[api] auditoría fallida:', auditErr);
  }
}
