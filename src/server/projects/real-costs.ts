import { BudgetStatus, Prisma, RealCostType } from '../../generated/prisma/client.ts';
import { accumulatedCostCents, voidedCostIds } from '../../lib/budget/real-costs.ts';
import type { DbClient } from '../../lib/db/client.ts';
import type {
  AddRealCostRequest,
  BudgetLineDetailView,
  RealCostView,
  ReverseRealCostRequest,
  UpdateProgressRequest,
} from '../../types/api.ts';
import { safeRecordAuditEvent } from '../audit/record-audit-event.ts';
import { withRlsContext, type RlsTransaction } from '../db/rls.ts';
import { ApiError } from '../errors/api-error.ts';

interface RealCostRow {
  id: string;
  amount: bigint;
  type: RealCostType;
  description: string;
  reason: string | null;
  incurredOn: Date;
  reversalOfId: string | null;
  createdAt: Date;
  recordedBy: { displayName: string };
}

interface LineWithCostsRow {
  id: string;
  chapterCode: string;
  chapterName: string;
  code: string;
  name: string;
  baseAmount: bigint;
  progressPercent: number | null;
  progressUpdatedAt: Date | null;
  budget: { status: BudgetStatus };
  realCosts: RealCostRow[];
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toDetailView(line: LineWithCostsRow): BudgetLineDetailView {
  const voided = voidedCostIds(line.realCosts);
  const costs: RealCostView[] = line.realCosts.map((cost) => ({
    id: cost.id,
    amountCents: Number(cost.amount),
    type: cost.type,
    description: cost.description,
    reason: cost.reason,
    incurredOn: toIsoDate(cost.incurredOn),
    recordedByName: cost.recordedBy.displayName,
    createdAt: cost.createdAt.toISOString(),
    voided: voided.has(cost.id),
    reversalOfId: cost.reversalOfId,
  }));

  return {
    id: line.id,
    chapterCode: line.chapterCode,
    chapterName: line.chapterName,
    code: line.code,
    name: line.name,
    baseAmountCents: Number(line.baseAmount),
    progressPercent: line.progressPercent,
    progressUpdatedAt: line.progressUpdatedAt?.toISOString() ?? null,
    accumulatedCostCents: accumulatedCostCents(costs),
    costs,
  };
}

async function loadLineOrThrow(
  tx: RlsTransaction,
  projectId: string,
  lineId: string,
): Promise<LineWithCostsRow> {
  const line = await tx.budgetLine.findFirst({
    where: { id: lineId, budget: { projectId } },
    select: {
      id: true,
      chapterCode: true,
      chapterName: true,
      code: true,
      name: true,
      baseAmount: true,
      progressPercent: true,
      progressUpdatedAt: true,
      budget: { select: { status: true } },
      realCosts: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          amount: true,
          type: true,
          description: true,
          reason: true,
          incurredOn: true,
          reversalOfId: true,
          createdAt: true,
          recordedBy: { select: { displayName: true } },
        },
      },
    },
  });
  if (!line) throw ApiError.notFound('Partida no encontrada en el proyecto.');
  return line;
}

function assertApproved(status: BudgetStatus): void {
  if (status !== BudgetStatus.APPROVED) {
    throw new ApiError('DOMAIN_ERROR', 'El presupuesto debe estar aprobado para esta operación.');
  }
}

export async function getBudgetLineDetail(
  prisma: DbClient,
  userId: string,
  projectId: string,
  lineId: string,
): Promise<BudgetLineDetailView> {
  return withRlsContext(prisma, { userId, projectId }, async (tx) =>
    toDetailView(await loadLineOrThrow(tx, projectId, lineId)),
  );
}

/** Imputa un coste real (asiento NORMAL) a una partida de un presupuesto aprobado. */
export async function addRealCost(
  prisma: DbClient,
  userId: string,
  projectId: string,
  lineId: string,
  input: AddRealCostRequest,
): Promise<BudgetLineDetailView> {
  const result = await withRlsContext(prisma, { userId, projectId }, async (tx) => {
    const line = await loadLineOrThrow(tx, projectId, lineId);
    assertApproved(line.budget.status);

    const created = await tx.realCost.create({
      data: {
        budgetLineId: lineId,
        amount: BigInt(input.amountCents),
        type: RealCostType.NORMAL,
        description: input.description.trim(),
        incurredOn: new Date(input.incurredOn),
        recordedById: userId,
      },
    });
    return { createdId: created.id, view: toDetailView(await loadLineOrThrow(tx, projectId, lineId)) };
  });

  await safeRecordAuditEvent(prisma, {
    action: 'realCost.created',
    actorUserId: userId,
    projectId,
    entityType: 'RealCost',
    entityId: result.createdId,
    metadata: { amountCents: input.amountCents },
  });

  return result.view;
}

/** Registra el avance físico (0-100) de una partida de un presupuesto aprobado. */
export async function updateProgress(
  prisma: DbClient,
  userId: string,
  projectId: string,
  lineId: string,
  input: UpdateProgressRequest,
): Promise<BudgetLineDetailView> {
  const view = await withRlsContext(prisma, { userId, projectId }, async (tx) => {
    const line = await loadLineOrThrow(tx, projectId, lineId);
    assertApproved(line.budget.status);

    // Solo toca progressPercent/progressUpdated*: el trigger de inmutabilidad de la base
    // (S13) vigila los campos base de la partida, no estos, así que no se dispara.
    await tx.budgetLine.update({
      where: { id: lineId },
      data: {
        progressPercent: input.progressPercent,
        progressUpdatedById: userId,
        progressUpdatedAt: new Date(),
      },
    });
    return toDetailView(await loadLineOrThrow(tx, projectId, lineId));
  });

  await safeRecordAuditEvent(prisma, {
    action: 'progress.updated',
    actorUserId: userId,
    projectId,
    entityType: 'BudgetLine',
    entityId: lineId,
    metadata: { progressPercent: input.progressPercent },
  });

  return view;
}

interface OriginalCostRow {
  id: string;
  amount: bigint;
  type: RealCostType;
  budgetLineId: string;
  budgetLine: { budget: { status: BudgetStatus } };
  reversals: { id: string }[];
}

/** Anula un coste creando un contra-asiento (REVERSAL) vinculado, con motivo. Solo PM. */
export async function reverseRealCost(
  prisma: DbClient,
  userId: string,
  projectId: string,
  costId: string,
  input: ReverseRealCostRequest,
): Promise<BudgetLineDetailView> {
  const reason = input.reason.trim();
  const result = await withRlsContext(prisma, { userId, projectId }, async (tx) => {
    const original: OriginalCostRow | null = await tx.realCost.findFirst({
      where: { id: costId, budgetLine: { budget: { projectId } } },
      select: {
        id: true,
        amount: true,
        type: true,
        budgetLineId: true,
        budgetLine: { select: { budget: { select: { status: true } } } },
        reversals: { select: { id: true }, take: 1 },
      },
    });
    if (!original) throw ApiError.notFound('Coste no encontrado en el proyecto.');
    assertApproved(original.budgetLine.budget.status);
    if (original.type !== RealCostType.NORMAL) {
      throw new ApiError('CONFLICT', 'No se puede anular un contra-asiento.');
    }
    if (original.reversals.length > 0) {
      throw new ApiError('CONFLICT', 'Ese coste ya está anulado.');
    }

    const created = await tx.realCost.create({
      data: {
        budgetLineId: original.budgetLineId,
        amount: -original.amount, // signo contrario: el acumulado resta
        type: RealCostType.REVERSAL,
        reversalOfId: original.id,
        reason,
        description: reason, // el motivo es la descripción del contra-asiento
        incurredOn: new Date(),
        recordedById: userId,
      },
    });
    return {
      originalId: original.id,
      reversalId: created.id,
      view: toDetailView(await loadLineOrThrow(tx, projectId, original.budgetLineId)),
    };
  }).catch((err: unknown) => {
    // Carrera: dos anulaciones del mismo coste a la vez chocan con el índice único parcial.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ApiError('CONFLICT', 'Ese coste ya está anulado.');
    }
    throw err;
  });

  await safeRecordAuditEvent(prisma, {
    action: 'realCost.voided',
    actorUserId: userId,
    projectId,
    entityType: 'RealCost',
    entityId: result.originalId,
    metadata: { reversalId: result.reversalId },
  });

  return result.view;
}
