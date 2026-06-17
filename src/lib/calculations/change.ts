// applyChange — determina los efectos económicos de un cambio aprobado, según su tipo.
// Función PURA: devuelve los efectos a aplicar, NO ejecuta ninguna escritura.
// La capa de datos (API, S20) los persiste en una transacción (ADR-006).
// Tipos de cambio y efectos: docs/concepto-global.md §9.10.
import type { ApprovedChange, ChangeEffects } from '../../types/domain';

export function applyChange(change: ApprovedChange): ChangeEffects {
  switch (change.type) {
    case 'incidental':
      // Tipo 1: solo registro y trazabilidad, sin efectos económicos.
      return noEffects();
    case 'costImpact':
      return costImpactEffects(change);
    case 'scope':
      return scopeEffects(change);
  }
}

/** Efectos vacíos: el cambio no toca presupuesto, contingencia, honorarios ni reparto. */
function noEffects(): ChangeEffects {
  return {
    budgetAdjustments: [],
    contingencyDelta: 0,
    feeAdjustments: [],
    newShares: null,
  };
}

/** Tipo 2 — impacto en coste. El importe va a la contingencia (bolsa única) o al
 *  presupuesto objetivo (ajustes por partida). Los honorarios no cambian (§9.10). */
function costImpactEffects(change: ApprovedChange): ChangeEffects {
  if (change.target === 'contingency') {
    return {
      budgetAdjustments: [],
      // Un sobrecoste (+) consume la bolsa (delta negativo); un ahorro (−) la repone (+).
      contingencyDelta: -(change.contingencyImpact ?? 0),
      feeAdjustments: [],
      newShares: null,
    };
  }
  if (change.target === 'budget') {
    // Destino presupuesto: los ajustes por partida ya vienen detallados en el cambio.
    return {
      budgetAdjustments: [...(change.lineAdjustments ?? [])],
      contingencyDelta: 0,
      feeAdjustments: [],
      newShares: null,
    };
  }
  throw new Error('Cost impact changes require a target');
}

/** Tipo 3 — cambio de alcance. Ajusta el presupuesto (por partida) y los honorarios; la
 *  reponderación del reparto FRC es opcional (§9.10, ADR-006 regla 5). */
function scopeEffects(change: ApprovedChange): ChangeEffects {
  return {
    budgetAdjustments: [...(change.lineAdjustments ?? [])],
    contingencyDelta: 0,
    feeAdjustments: [...(change.feeAdjustments ?? [])],
    newShares: change.newShares ? [...change.newShares] : null,
  };
}
