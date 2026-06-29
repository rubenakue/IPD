import type { BudgetChapterView, BudgetLineView } from '../../types/api.ts';

export interface BudgetApprovalValidation {
  isValid: boolean;
  errors: string[];
}

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeBudgetLineCode(value: string): string {
  return normalizeCode(value);
}

export function summarizeBudgetLines(lines: readonly BudgetLineView[]): {
  chapters: BudgetChapterView[];
  totalBaseAmountCents: number;
} {
  const chaptersByCode = new Map<string, BudgetChapterView>();
  let totalBaseAmountCents = 0;

  for (const line of lines) {
    totalBaseAmountCents += line.baseAmountCents;
    const existing = chaptersByCode.get(line.chapterCode);
    if (existing) {
      existing.lines.push(line);
      existing.subtotalBaseAmountCents += line.baseAmountCents;
    } else {
      chaptersByCode.set(line.chapterCode, {
        chapterCode: line.chapterCode,
        chapterName: line.chapterName,
        subtotalBaseAmountCents: line.baseAmountCents,
        lines: [line],
      });
    }
  }

  return { chapters: [...chaptersByCode.values()], totalBaseAmountCents };
}

export function validateBudgetForApproval(
  lines: readonly Pick<BudgetLineView, 'code' | 'baseAmountCents'>[],
): BudgetApprovalValidation {
  const errors: string[] = [];
  if (lines.length === 0) {
    errors.push('El presupuesto debe tener al menos una partida.');
  }

  let total = 0;
  const seenCodes = new Set<string>();
  for (const line of lines) {
    total += line.baseAmountCents;
    if (line.baseAmountCents < 0) {
      errors.push('Los importes de las partidas no pueden ser negativos.');
    }

    const normalizedCode = normalizeBudgetLineCode(line.code);
    if (normalizedCode.length === 0) {
      errors.push('Todas las partidas deben tener codigo.');
    } else if (seenCodes.has(normalizedCode)) {
      errors.push(`El codigo de partida "${line.code.trim()}" esta duplicado.`);
    }
    seenCodes.add(normalizedCode);
  }

  if (total <= 0) {
    errors.push('El total del presupuesto debe ser mayor que 0.');
  }

  return { isValid: errors.length === 0, errors };
}

export function findChapterNameConflict(
  lines: readonly Pick<BudgetLineView, 'chapterCode' | 'chapterName'>[],
): { chapterCode: string; firstName: string; conflictingName: string } | null {
  const chapterNamesByCode = new Map<string, string>();
  for (const line of lines) {
    const normalizedCode = normalizeCode(line.chapterCode);
    const normalizedName = line.chapterName.trim();
    const existing = chapterNamesByCode.get(normalizedCode);
    if (existing !== undefined && existing !== normalizedName) {
      return {
        chapterCode: line.chapterCode,
        firstName: existing,
        conflictingName: normalizedName,
      };
    }
    chapterNamesByCode.set(normalizedCode, normalizedName);
  }
  return null;
}
