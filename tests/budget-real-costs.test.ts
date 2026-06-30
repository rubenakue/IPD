import { describe, expect, it } from 'vitest';
import { accumulatedCostCents, voidedCostIds } from '../src/lib/budget/real-costs.ts';

describe('real costs (lógica pura)', () => {
  it('suma los asientos con signo: un contra-asiento resta', () => {
    expect(accumulatedCostCents([])).toBe(0);
    expect(
      accumulatedCostCents([
        { amountCents: 15_000_00 },
        { amountCents: -15_000_00 },
        { amountCents: 10_000_00 },
      ]),
    ).toBe(10_000_00);
  });

  it('marca como anulado el NORMAL que tiene un contra-asiento vinculado', () => {
    const ids = voidedCostIds([
      { id: 'a', type: 'NORMAL', reversalOfId: null },
      { id: 'r', type: 'REVERSAL', reversalOfId: 'a' },
      { id: 'b', type: 'NORMAL', reversalOfId: null },
    ]);
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(false);
    expect(ids.has('r')).toBe(false);
  });

  it('el acumulado tras anular vuelve al valor previo a esa imputacion', () => {
    const costs = [
      { id: 'a', amountCents: 150_00, type: 'NORMAL' as const, reversalOfId: null },
      { id: 'b', amountCents: 100_00, type: 'NORMAL' as const, reversalOfId: null },
      { id: 'r', amountCents: -150_00, type: 'REVERSAL' as const, reversalOfId: 'a' },
    ];
    expect(accumulatedCostCents(costs)).toBe(100_00);
    expect([...voidedCostIds(costs)]).toEqual(['a']);
  });
});
