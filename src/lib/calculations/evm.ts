// calculateEVM — indicadores de Earned Value Management del proyecto.
// Función PURA: entradas → salida, sin I/O, sin fechas del sistema, sin azar.
// Fórmulas exactas y reglas "sin datos": docs/concepto-global.md §9.6.
import type {
  EvmInput,
  EvmResult,
  BudgetLineProgress,
  ActualCostEntry,
} from '../../types/domain';

export function calculateEVM(input: EvmInput): EvmResult {
  const bac = sumCurrentBudget(input.lines); // siempre calculable
  const ev = sumEarnedValue(input.lines); // null si ninguna partida tiene avance
  const ac = sumActualCost(input.actualCostEntries); // 0 si no hay asientos
  const pv = normalizePlannedValue(input.plannedValue); // null si era null o 0

  // Métricas derivadas. `null` = "sin datos", nunca un 0 engañoso (§9.6).
  const cv = ev === null ? null : ev - ac;
  const sv = ev === null || pv === null ? null : ev - pv;
  const cpi = ev === null || ac === 0 ? null : ev / ac; // ratio sin redondear
  const spi = ev === null || pv === null ? null : ev / pv; // pv ya es null si era 0
  const eac =
    ev === null || ev === 0 || ac === 0 ? null : estimateAtCompletion(bac, ac, ev);
  const etc = eac === null ? null : eac - ac;
  const vac = eac === null ? null : bac - eac;

  return { bac, ev, ac, pv, cv, sv, cpi, spi, eac, etc, vac };
}

/** BAC = presupuesto vigente total = Σ del vigente de cada partida. */
function sumCurrentBudget(lines: readonly BudgetLineProgress[]): number {
  return lines.reduce((total, line) => total + line.currentBudget, 0);
}

/** EV = Σ (presupuesto vigente × % avance). Devuelve `null` si NINGUNA partida tiene
 *  avance registrado (sin avance ≠ 0 % de avance), regla "sin datos" de §9.6. */
function sumEarnedValue(lines: readonly BudgetLineProgress[]): number | null {
  let earned = 0;
  let hasProgress = false;
  for (const line of lines) {
    if (line.progressPercent !== null) {
      hasProgress = true;
      earned += Math.round((line.currentBudget * line.progressPercent) / 100);
    }
  }
  return hasProgress ? earned : null;
}

/** AC = coste real acumulado = Σ de los asientos; los contra-asientos (negativos) restan. */
function sumActualCost(entries: readonly ActualCostEntry[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

/** PV: un valor planificado ausente o igual a 0 es "sin datos de planificación" (§9.6). */
function normalizePlannedValue(plannedValue: number | null): number | null {
  return plannedValue === null || plannedValue === 0 ? null : plannedValue;
}

/** EAC = BAC / CPI = round(BAC × AC / EV). El producto BAC × AC puede superar
 *  Number.MAX_SAFE_INTEGER (~9·10^15) en un proyecto real, así que se calcula con
 *  `BigInt` y se redondea al céntimo. Asume valores no negativos (presupuestos y costes). */
function estimateAtCompletion(bac: number, ac: number, ev: number): number {
  const numerator = BigInt(bac) * BigInt(ac);
  const denominator = BigInt(ev);
  return Number((numerator + denominator / 2n) / denominator); // redondeo al céntimo
}
