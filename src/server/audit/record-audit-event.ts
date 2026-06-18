import type { Prisma } from '../../generated/prisma/client.ts';
import type { DbClient } from '../../lib/db/client.ts';

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