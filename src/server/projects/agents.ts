import { type AgentRole, AgentStatus, Prisma } from '../../generated/prisma/client.ts';
import { validateShareSplit } from '../../lib/agents/share-split.ts';
import type { DbClient } from '../../lib/db/client.ts';
import type {
  AddAgentRequest,
  AgentView,
  ProjectAgentsResponse,
  UpdateAgentRequest,
} from '../../types/api.ts';
import { recordAuditEvent, type AuditEventInput } from '../audit/record-audit-event.ts';
import { withRlsContext } from '../db/rls.ts';
import { ApiError } from '../errors/api-error.ts';

interface AgentRow {
  id: string;
  userId: string;
  role: AgentRole;
  sharePercent: number;
  guaranteedFee: bigint;
  feeAtRisk: bigint;
}

function toAgentView(agent: AgentRow, user: { email: string; displayName: string }): AgentView {
  return {
    id: agent.id,
    userId: agent.userId,
    email: user.email,
    displayName: user.displayName,
    role: agent.role,
    sharePercent: agent.sharePercent,
    guaranteedFeeCents: Number(agent.guaranteedFee),
    feeAtRiskCents: Number(agent.feeAtRisk),
  };
}

// La auditoría es un efecto secundario best-effort: su fallo no debe tumbar la operación.
async function safeRecordAuditEvent(prisma: DbClient, input: AuditEventInput): Promise<void> {
  try {
    await recordAuditEvent(prisma, input);
  } catch (auditErr) {
    console.error('[api] auditoría fallida:', auditErr);
  }
}

/**
 * Lista los agentes del proyecto con la suma de reparto y si está completa (=100%).
 * Lectura autorizada por el middleware (`project.view`); usa el cliente normal porque
 * incluye datos de `User` (sin RLS). El aislamiento por proyecto lo da el filtro `projectId`.
 */
export async function listProjectAgents(
  prisma: DbClient,
  projectId: string,
): Promise<ProjectAgentsResponse> {
  const agents = await prisma.agent.findMany({
    where: { projectId, status: AgentStatus.ACTIVE },
    include: { user: { select: { email: true, displayName: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const views = agents.map((agent) => toAgentView(agent, agent.user));
  const { sum, isComplete } = validateShareSplit(views);
  return { agents: views, shareSum: sum, isComplete };
}

/** Añade un agente al proyecto (solo el PM, garantizado por el middleware + RLS). */
export async function addAgent(
  prisma: DbClient,
  projectId: string,
  actorUserId: string,
  input: AddAgentRequest,
): Promise<AgentView> {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, displayName: true },
  });
  if (!user) {
    // En esta feature solo se asignan usuarios existentes; el alta por invitación es la 006.
    throw ApiError.validation('No existe ningún usuario con ese email.');
  }

  const existing = await prisma.agent.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError('CONFLICT', 'Ese usuario ya es agente del proyecto.');
  }

  const created = await withRlsContext(prisma, { userId: actorUserId, projectId }, (tx) =>
    tx.agent.create({
      data: {
        userId: user.id,
        projectId,
        role: input.role,
        sharePercent: input.sharePercent,
        guaranteedFee: BigInt(input.guaranteedFeeCents),
        feeAtRisk: BigInt(input.feeAtRiskCents),
      },
    }),
  );

  await safeRecordAuditEvent(prisma, {
    action: 'agent.added',
    actorUserId,
    projectId,
    entityType: 'Agent',
    entityId: created.id,
    metadata: { role: input.role },
  });

  return toAgentView(created, user);
}

/** Edita las condiciones de un agente del proyecto (solo el PM). */
export async function updateAgent(
  prisma: DbClient,
  projectId: string,
  actorUserId: string,
  agentId: string,
  input: UpdateAgentRequest,
): Promise<AgentView> {
  const existing = await prisma.agent.findFirst({
    where: { id: agentId, projectId },
    include: { user: { select: { email: true, displayName: true } } },
  });
  if (!existing) {
    throw ApiError.notFound('Agente no encontrado en el proyecto.');
  }

  const data: Prisma.AgentUpdateInput = {};
  if (input.role !== undefined) data.role = input.role;
  if (input.sharePercent !== undefined) data.sharePercent = input.sharePercent;
  if (input.guaranteedFeeCents !== undefined) data.guaranteedFee = BigInt(input.guaranteedFeeCents);
  if (input.feeAtRiskCents !== undefined) data.feeAtRisk = BigInt(input.feeAtRiskCents);

  const updated = await withRlsContext(prisma, { userId: actorUserId, projectId }, (tx) =>
    tx.agent.update({ where: { id: agentId }, data }),
  );

  return toAgentView(updated, existing.user);
}
