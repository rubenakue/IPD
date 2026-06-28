// Validación del reparto del Fondo de Riesgo Compartido (FRC) entre agentes.
// Función PURA y compartida (servidor valida al confirmar; frontend muestra la suma).
// NO es uno de los tres cálculos críticos (EVM/FRC/applyChange): no persiste nada.

export interface ShareSplitItem {
  sharePercent: number;
}

export interface ShareSplitResult {
  /** Suma de los porcentajes de reparto. */
  sum: number;
  /** `true` cuando la suma es exactamente 100 (configuración completa). */
  isComplete: boolean;
}

export function validateShareSplit(agents: readonly ShareSplitItem[]): ShareSplitResult {
  const sum = agents.reduce((acc, agent) => acc + agent.sharePercent, 0);
  return { sum, isComplete: sum === 100 };
}
