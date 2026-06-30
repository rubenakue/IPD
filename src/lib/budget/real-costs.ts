import type { RealCostTypeCode } from '../../types/api.ts';

/**
 * Coste real acumulado: suma de TODOS los asientos. Los contra-asientos (REVERSAL) llevan
 * importe negativo, así que restan sin necesidad de casos especiales (§9.4).
 */
export function accumulatedCostCents(costs: readonly { amountCents: number }[]): number {
  return costs.reduce((sum, cost) => sum + cost.amountCents, 0);
}

interface ReversalLink {
  id: string;
  type: RealCostTypeCode;
  reversalOfId: string | null;
}

/**
 * Ids de los asientos que están "anulados": un NORMAL cuyo id es referenciado por algún
 * contra-asiento. "Anulado" es una condición derivada (§8.8), no un estado almacenado.
 */
export function voidedCostIds(costs: readonly ReversalLink[]): Set<string> {
  const ids = new Set<string>();
  for (const cost of costs) {
    if (cost.type === 'REVERSAL' && cost.reversalOfId !== null) {
      ids.add(cost.reversalOfId);
    }
  }
  return ids;
}
