import { BudgetStatus, Prisma } from '../../generated/prisma/client.ts';
import type { BudgetLineInput, BudgetLineView, BudgetView, UpdateBudgetLineRequest } from '../../types/api.ts';
import { findChapterNameConflict, summarizeBudgetLines, validateBudgetForApproval } from '../../lib/budget/summary.ts';
import type { DbClient } from '../../lib/db/client.ts';
import { withRlsContext, type RlsTransaction } from '../db/rls.ts';
import { ApiError } from '../errors/api-error.ts';

interface BudgetLineRow {
  id: string;
  chapterCode: string;
  chapterName: string;
  code: string;
  name: string;
  baseAmount: bigint;
}

interface BudgetRow {
  id: string;
  projectId: string;
  status: BudgetStatus;
  approvedAt: Date | null;
  createdAt: Date;
  lines: BudgetLineRow[];
}

interface BudgetLockRow {
  id: string;
}

function toLineView(line: BudgetLineRow): BudgetLineView {
  return {
    id: line.id,
    chapterCode: line.chapterCode,
    chapterName: line.chapterName,
    code: line.code,
    name: line.name,
    baseAmountCents: Number(line.baseAmount),
  };
}

function toBudgetView(budget: BudgetRow): BudgetView {
  const lineViews = budget.lines.map(toLineView);
  const { chapters, totalBaseAmountCents } = summarizeBudgetLines(lineViews);
  return {
    id: budget.id,
    projectId: budget.projectId,
    status: budget.status,
    approvedAt: budget.approvedAt?.toISOString() ?? null,
    createdAt: budget.createdAt.toISOString(),
    totalBaseAmountCents,
    chapters,
  };
}

function normalizeLineInput(input: BudgetLineInput): BudgetLineInput {
  return {
    chapterCode: input.chapterCode.trim(),
    chapterName: input.chapterName.trim(),
    code: input.code.trim(),
    name: input.name.trim(),
    baseAmountCents: input.baseAmountCents,
  };
}

function normalizeLinePatch(input: UpdateBudgetLineRequest): UpdateBudgetLineRequest {
  return {
    chapterCode: input.chapterCode?.trim(),
    chapterName: input.chapterName?.trim(),
    code: input.code?.trim(),
    name: input.name?.trim(),
    baseAmountCents: input.baseAmountCents,
  };
}

function assertDraft(status: BudgetStatus): void {
  if (status === BudgetStatus.APPROVED) {
    throw new ApiError('DOMAIN_ERROR', 'El presupuesto aprobado es una linea base inmutable.');
  }
}

function assertChapterConsistency(lines: readonly BudgetLineView[]): void {
  const conflict = findChapterNameConflict(lines);
  if (conflict) {
    throw ApiError.validation(
      `El capitulo ${conflict.chapterCode} ya existe con otro nombre.`,
      {
        chapterCode: conflict.chapterCode,
        existingName: conflict.firstName,
        conflictingName: conflict.conflictingName,
      },
    );
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

async function findBudget(tx: RlsTransaction, projectId: string): Promise<BudgetRow | null> {
  return tx.budget.findUnique({
    where: { projectId },
    include: {
      lines: {
        orderBy: [{ chapterCode: 'asc' }, { code: 'asc' }, { id: 'asc' }],
      },
    },
  });
}

async function findBudgetOrThrow(tx: RlsTransaction, projectId: string): Promise<BudgetRow> {
  const budget = await findBudget(tx, projectId);
  if (!budget) {
    throw new ApiError('DOMAIN_ERROR', 'No hay presupuesto cargado para aprobar.');
  }
  return budget;
}

async function getOrCreateDraftBudget(tx: RlsTransaction, projectId: string): Promise<BudgetRow> {
  const existing = await findBudget(tx, projectId);
  if (existing) {
    assertDraft(existing.status);
    return existing;
  }

  try {
    await tx.budget.create({ data: { projectId } });
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;
  }

  const created = await findBudget(tx, projectId);
  if (!created) throw ApiError.notFound();
  assertDraft(created.status);
  return created;
}

async function getBudgetView(tx: RlsTransaction, projectId: string): Promise<BudgetView | null> {
  const budget = await findBudget(tx, projectId);
  return budget ? toBudgetView(budget) : null;
}

export async function getProjectBudget(
  prisma: DbClient,
  userId: string,
  projectId: string,
): Promise<BudgetView | null> {
  return withRlsContext(prisma, { userId, projectId }, (tx) => getBudgetView(tx, projectId));
}

export async function addBudgetLine(
  prisma: DbClient,
  userId: string,
  projectId: string,
  input: BudgetLineInput,
): Promise<BudgetView> {
  return withRlsContext(prisma, { userId, projectId }, async (tx) => {
    const normalized = normalizeLineInput(input);
    const budget = await getOrCreateDraftBudget(tx, projectId);
    assertChapterConsistency([...budget.lines.map(toLineView), { id: 'new', ...normalized }]);

    await tx.budgetLine.create({
      data: {
        budgetId: budget.id,
        chapterCode: normalized.chapterCode,
        chapterName: normalized.chapterName,
        code: normalized.code,
        name: normalized.name,
        baseAmount: BigInt(normalized.baseAmountCents),
      },
    });

    const view = await getBudgetView(tx, projectId);
    if (!view) throw ApiError.notFound();
    return view;
  });
}

export async function updateBudgetLine(
  prisma: DbClient,
  userId: string,
  projectId: string,
  lineId: string,
  input: UpdateBudgetLineRequest,
): Promise<BudgetView> {
  return withRlsContext(prisma, { userId, projectId }, async (tx) => {
    const line = await tx.budgetLine.findFirst({
      where: { id: lineId, budget: { projectId } },
      include: { budget: { include: { lines: true } } },
    });
    if (!line) throw ApiError.notFound('Partida no encontrada en el proyecto.');
    assertDraft(line.budget.status);

    const normalized = normalizeLinePatch(input);
    const nextLine: BudgetLineView = {
      id: line.id,
      chapterCode: normalized.chapterCode ?? line.chapterCode,
      chapterName: normalized.chapterName ?? line.chapterName,
      code: normalized.code ?? line.code,
      name: normalized.name ?? line.name,
      baseAmountCents: normalized.baseAmountCents ?? Number(line.baseAmount),
    };
    const nextLines = line.budget.lines.map((candidate) =>
      candidate.id === line.id ? nextLine : toLineView(candidate),
    );
    assertChapterConsistency(nextLines);

    await tx.budgetLine.update({
      where: { id: lineId },
      data: {
        chapterCode: normalized.chapterCode,
        chapterName: normalized.chapterName,
        code: normalized.code,
        name: normalized.name,
        baseAmount:
          normalized.baseAmountCents === undefined ? undefined : BigInt(normalized.baseAmountCents),
      },
    });

    const view = await getBudgetView(tx, projectId);
    if (!view) throw ApiError.notFound();
    return view;
  });
}

export async function deleteBudgetLine(
  prisma: DbClient,
  userId: string,
  projectId: string,
  lineId: string,
): Promise<BudgetView> {
  return withRlsContext(prisma, { userId, projectId }, async (tx) => {
    const line = await tx.budgetLine.findFirst({
      where: { id: lineId, budget: { projectId } },
      include: { budget: true },
    });
    if (!line) throw ApiError.notFound('Partida no encontrada en el proyecto.');
    assertDraft(line.budget.status);

    await tx.budgetLine.delete({ where: { id: lineId } });
    const view = await getBudgetView(tx, projectId);
    if (!view) throw ApiError.notFound();
    return view;
  });
}

export async function approveBudget(
  prisma: DbClient,
  userId: string,
  projectId: string,
): Promise<BudgetView> {
  return withRlsContext(prisma, { userId, projectId }, async (tx) => {
    const locked = await tx.$queryRaw<BudgetLockRow[]>`
      SELECT "id" FROM "Budget"
      WHERE "projectId" = ${projectId}
      FOR UPDATE
    `;
    if (locked.length === 0) {
      throw new ApiError('DOMAIN_ERROR', 'No hay presupuesto cargado para aprobar.');
    }

    const budget = await findBudgetOrThrow(tx, projectId);
    assertDraft(budget.status);

    const lineViews = budget.lines.map(toLineView);
    assertChapterConsistency(lineViews);
    const validation = validateBudgetForApproval(lineViews);
    if (!validation.isValid) {
      throw new ApiError('DOMAIN_ERROR', 'El presupuesto no cumple las condiciones de aprobacion.', {
        errors: validation.errors,
      });
    }

    const approved = await tx.budget.update({
      where: { id: budget.id },
      data: { status: BudgetStatus.APPROVED, approvedAt: new Date() },
    });

    await tx.auditEvent.create({
      data: {
        action: 'budget.approved',
        actorUserId: userId,
        projectId,
        entityType: 'Budget',
        entityId: approved.id,
        metadata: { totalBaseAmountCents: toBudgetView(budget).totalBaseAmountCents },
      },
    });

    const view = await getBudgetView(tx, projectId);
    if (!view) throw ApiError.notFound();
    return view;
  });
}
