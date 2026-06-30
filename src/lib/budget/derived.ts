import type { AlertLevel, EconomicsAmounts } from '../../types/api.ts';

/** Umbrales de alerta (valor absoluto de la desviación %), constantes en este sprint (§20.2). */
export const WARNING_PERCENT = 5;
export const ALERT_PERCENT = 10;

export interface DeriveLineInput {
  baseAmountCents: number;
  /** Σ de los ajustes de cambios aprobados (céntimos, con signo); hoy 0 (motor de cambios = H8). */
  adjustmentsCents: number;
  accumulatedCostCents: number;
  /** Previsión manual (céntimos) o null si rige la regla por defecto. */
  manualForecastCents: number | null;
}

function alertLevelFor(variancePercent: number | null): AlertLevel {
  if (variancePercent === null) return 'normal';
  const magnitude = Math.abs(variancePercent);
  if (magnitude >= ALERT_PERCENT) return 'alert';
  if (magnitude >= WARNING_PERCENT) return 'warning';
  return 'normal';
}

function withVariance(
  currentBudgetCents: number,
  accumulatedCostCents: number,
  forecastCents: number,
): EconomicsAmounts {
  const varianceCents = currentBudgetCents - forecastCents;
  // Sobre vigente; null si el vigente es 0 (no dividir por cero).
  const variancePercent = currentBudgetCents !== 0 ? (varianceCents / currentBudgetCents) * 100 : null;
  return {
    currentBudgetCents,
    accumulatedCostCents,
    forecastCents,
    varianceCents,
    variancePercent,
    alertLevel: alertLevelFor(variancePercent),
  };
}

/** Derivados de una partida. Vigente = base + ajustes; previsión = manual o max(coste, vigente). */
export function deriveBudgetLine(input: DeriveLineInput): EconomicsAmounts {
  const currentBudgetCents = input.baseAmountCents + input.adjustmentsCents;
  const forecastCents =
    input.manualForecastCents ?? Math.max(input.accumulatedCostCents, currentBudgetCents);
  return withVariance(currentBudgetCents, input.accumulatedCostCents, forecastCents);
}

/**
 * Agrega los importes de varias filas (capítulo o proyecto). La desviación % y el nivel de
 * alerta se RECALCULAN sobre el vigente agregado; no se promedian los porcentajes de las filas.
 */
export function summarizeEconomics(items: readonly EconomicsAmounts[]): EconomicsAmounts {
  let currentBudgetCents = 0;
  let accumulatedCostCents = 0;
  let forecastCents = 0;
  for (const item of items) {
    currentBudgetCents += item.currentBudgetCents;
    accumulatedCostCents += item.accumulatedCostCents;
    forecastCents += item.forecastCents;
  }
  return withVariance(currentBudgetCents, accumulatedCostCents, forecastCents);
}
