// Tests del motor de cambios (applyChange) — User Story 3 de specs/001-critical-calculations.
// Escritos ANTES de implementar (TDD): deben estar en ROJO hasta la sesión S5.
// applyChange NO escribe nada: solo devuelve los EFECTOS que la capa de datos aplicará.
import { describe, it, expect } from 'vitest';
import { applyChange } from '../src/lib/calculations/change';
import type { ApprovedChange } from '../src/types/domain';

const eur = (euros: number): number => Math.round(euros * 100);

describe('applyChange', () => {
  it('US3.1 — un cambio incidental (tipo 1) no produce ningún efecto, solo queda el registro', () => {
    const change: ApprovedChange = { changeId: 'C1', type: 'incidental' };

    const effects = applyChange(change);

    expect(effects.budgetAdjustments).toEqual([]);
    expect(effects.contingencyDelta).toBe(0);
    expect(effects.feeAdjustments).toEqual([]);
    expect(effects.newShares).toBeNull();
  });

  it('US3.2 — tipo 2 contra contingencia: consume la bolsa, sin tocar presupuesto ni honorarios', () => {
    const change: ApprovedChange = {
      changeId: 'C2',
      type: 'costImpact',
      costImpact: eur(120_000),
      target: 'contingency',
    };

    const effects = applyChange(change);

    expect(effects.contingencyDelta).toBe(-eur(120_000)); // negativo = consume contingencia
    expect(effects.budgetAdjustments).toEqual([]); // el presupuesto objetivo no cambia
    expect(effects.feeAdjustments).toEqual([]);
    expect(effects.newShares).toBeNull();
  });

  it('US3.3 — tipo 2 contra presupuesto: ajusta la partida afectada, sin tocar honorarios', () => {
    const change: ApprovedChange = {
      changeId: 'C3',
      type: 'costImpact',
      costImpact: eur(120_000),
      target: 'budget',
      affectedLineIds: ['L1'],
    };

    const effects = applyChange(change);

    expect(effects.budgetAdjustments).toEqual([{ lineId: 'L1', delta: eur(120_000) }]);
    expect(effects.contingencyDelta).toBe(0);
    expect(effects.feeAdjustments).toEqual([]);
    expect(effects.newShares).toBeNull();
  });

  it('US3.4 — tipo 2 negativo contra presupuesto: el ajuste es negativo (abarata la partida)', () => {
    const change: ApprovedChange = {
      changeId: 'C4',
      type: 'costImpact',
      costImpact: -eur(50_000),
      target: 'budget',
      affectedLineIds: ['L1'],
    };

    const effects = applyChange(change);

    expect(effects.budgetAdjustments).toEqual([{ lineId: 'L1', delta: -eur(50_000) }]);
    expect(effects.contingencyDelta).toBe(0);
  });

  it('US3.4b — tipo 2 negativo contra contingencia: repone la bolsa (delta positivo)', () => {
    const change: ApprovedChange = {
      changeId: 'C4b',
      type: 'costImpact',
      costImpact: -eur(50_000),
      target: 'contingency',
    };

    const effects = applyChange(change);

    expect(effects.contingencyDelta).toBe(eur(50_000)); // positivo = repone contingencia
    expect(effects.budgetAdjustments).toEqual([]);
  });

  it('US3.5 — tipo 3 (alcance): ajusta presupuesto, honorarios y repondera (los nuevos % suman 100)', () => {
    const change: ApprovedChange = {
      changeId: 'C5',
      type: 'scope',
      costImpact: eur(300_000),
      affectedLineIds: ['L1'],
      feeAdjustments: [
        { agentId: 'constructor', deltaFee: eur(20_000) },
        { agentId: 'designer', deltaFee: eur(15_000) },
      ],
      newShares: [
        { agentId: 'promoter', sharePercent: 33 },
        { agentId: 'constructor', sharePercent: 58 },
        { agentId: 'designer', sharePercent: 9 },
      ],
    };

    const effects = applyChange(change);

    expect(effects.budgetAdjustments).toEqual([{ lineId: 'L1', delta: eur(300_000) }]);
    expect(effects.feeAdjustments).toEqual([
      { agentId: 'constructor', deltaFee: eur(20_000) },
      { agentId: 'designer', deltaFee: eur(15_000) },
    ]);
    expect(effects.newShares).not.toBeNull();
    const sumaShares = (effects.newShares ?? []).reduce((acc, s) => acc + s.sharePercent, 0);
    expect(sumaShares).toBe(100);
  });

  it('US3.5b — tipo 3 sin reponderación: ajusta presupuesto y honorarios, pero newShares queda null', () => {
    const change: ApprovedChange = {
      changeId: 'C5b',
      type: 'scope',
      costImpact: eur(300_000),
      affectedLineIds: ['L1'],
      feeAdjustments: [{ agentId: 'constructor', deltaFee: eur(20_000) }],
    };

    const effects = applyChange(change);

    expect(effects.budgetAdjustments).toEqual([{ lineId: 'L1', delta: eur(300_000) }]);
    expect(effects.feeAdjustments).toEqual([{ agentId: 'constructor', deltaFee: eur(20_000) }]);
    expect(effects.newShares).toBeNull();
  });
});
