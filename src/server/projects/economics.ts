import { BudgetStatus, ChangeStatus } from '../../generated/prisma/client.ts';
import { deriveBudgetLine, summarizeEconomics } from '../../lib/budget/derived.ts';
import { accumulatedCostCents } from '../../lib/budget/real-costs.ts';
import { normalizeBudgetLineCode } from '../../lib/budget/summary.ts';
import type { DbClient } from '../../lib/db/client.ts';
import type {
  EconomicsAmounts,
  EconomicsChapterView,
  EconomicsLineView,
  ProjectEconomicsResponse,
} from '../../types/api.ts';
import { safeRecordAuditEvent } from '../audit/record-audit-event.ts';
import { withRlsContext, type RlsTransaction } from '../db/rls.ts';
import { ApiError } from '../errors/api-error.ts';

/** Vista económica sin el flag de permiso (lo compone la ruta con el rol del solicitante). */
export type EconomicsData = Omit<ProjectEconomicsResponse, 'canUpdateForecast'>;

const ZERO_AMOUNTS: EconomicsAmounts = {
  currentBudgetCents: 0,
  accumulatedCostCents: 0,
  forecastCents: 0,
  varianceCents: 0,
  variancePercent: null,
  alertLevel: 'normal',
};

interface LineRow {
  id: string;
  chapterCode: string;
  chapterName: string;
  code: string;
  name: string;
  baseAmount: bigint;
  progressPercent: number | null;
  manualForecast: bigint | null;
  realCosts: { amount: bigint }[];
  adjustments: { delta: bigint }[];
}

function toLineView(line: LineRow): EconomicsLineView {
  const adjustmentsCents = line.adjustments.reduce((sum, adj) => sum + Number(adj.delta), 0);
  const accCost = accumulatedCostCents(line.realCosts.map((c) => ({ amountCents: Number(c.amount) })));
  const manualForecastCents = line.manualForecast !== null ? Number(line.manualForecast) : null;
  const derived = deriveBudgetLine({
    baseAmountCents: Number(line.baseAmount),
    adjustmentsCents,
    accumulatedCostCents: accCost,
    manualForecastCents,
  });
  return {
    id: line.id,
    code: line.code,
    name: line.name,
    baseAmountCents: Number(line.baseAmount),
    adjustmentsCents,
    progressPercent: line.progressPercent,
    manualForecastCents,
    ...derived,
  };
}

function groupByChapter(lines: EconomicsLineView[], rows: LineRow[]): EconomicsChapterView[] {
  const byChapter = new Map<string, { code: string; name: string; lines: EconomicsLineView[] }>();
  lines.forEach((line, index) => {
    const row = rows[index];
    const key = normalizeBudgetLineCode(row.chapterCode);
    const existing = byChapter.get(key);
    if (existing) {
      existing.lines.push(line);
    } else {
      byChapter.set(key, { code: row.chapterCode, name: row.chapterName, lines: [line] });
    }
  });

  return [...byChapter.values()].map((chapter) => ({
    chapterCode: chapter.code,
    chapterName: chapter.name,
    lines: chapter.lines,
    ...summarizeEconomics(chapter.lines),
  }));
}

async function loadLines(tx: RlsTransaction, projectId: string): Promise<{ status: BudgetStatus; lines: LineRow[] } | null> {
  const budget = await tx.budget.findUnique({
    where: { projectId },
    select: {
      status: true,
      lines: {
        orderBy: [{ chapterCode: 'asc' }, { code: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          chapterCode: true,
          chapterName: true,
          code: true,
          name: true,
          baseAmount: true,
          progressPercent: true,
          manualForecast: true,
          realCosts: { select: { amount: true } },
          adjustments: {
            where: { change: { projectId, status: ChangeStatus.APPROVED } },
            select: { delta: true },
          },
        },
      },
    },
  });
  return budget;
}

/**
 * Foto económica del proyecto: derivados por partida, capítulo y total. Solo se calculan sobre
 * un presupuesto APROBADO; en borrador o sin presupuesto, la tabla de derivados va vacía.
 */
export async function getProjectEconomics(
  prisma: DbClient,
  userId: string,
  projectId: string,
): Promise<EconomicsData> {
  return withRlsContext(prisma, { userId, projectId }, async (tx) => {
    const budget = await loadLines(tx, projectId);
    if (!budget) return { budgetStatus: null, chapters: [], totals: ZERO_AMOUNTS };
    if (budget.status !== BudgetStatus.APPROVED) {
      return { budgetStatus: budget.status, chapters: [], totals: ZERO_AMOUNTS };
    }

    const lineViews = budget.lines.map(toLineView);
    const chapters = groupByChapter(lineViews, budget.lines);
    return { budgetStatus: budget.status, chapters, totals: summarizeEconomics(lineViews) };
  });
}

/** Fija (> 0) o elimina (null) la previsión a cierre manual de una partida (constructor/PM). */
export async function setLineForecast(
  prisma: DbClient,
  userId: string,
  projectId: string,
  lineId: string,
  manualForecastCents: number | null,
): Promise<EconomicsData> {
  await withRlsContext(prisma, { userId, projectId }, async (tx) => {
    const line = await tx.budgetLine.findFirst({
      where: { id: lineId, budget: { projectId } },
      select: { id: true, budget: { select: { status: true } } },
    });
    if (!line) throw ApiError.notFound('Partida no encontrada en el proyecto.');
    if (line.budget.status !== BudgetStatus.APPROVED) {
      throw new ApiError('DOMAIN_ERROR', 'El presupuesto debe estar aprobado para esta operación.');
    }

    await tx.budgetLine.update({
      where: { id: lineId },
      data: { manualForecast: manualForecastCents === null ? null : BigInt(manualForecastCents) },
    });
  });

  await safeRecordAuditEvent(prisma, {
    action: 'forecast.updated',
    actorUserId: userId,
    projectId,
    entityType: 'BudgetLine',
    entityId: lineId,
    metadata: { manualForecastCents },
  });

  return getProjectEconomics(prisma, userId, projectId);
}
