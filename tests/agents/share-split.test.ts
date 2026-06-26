import { describe, expect, it } from 'vitest';
import { validateShareSplit } from '../../src/lib/agents/share-split.ts';

describe('validateShareSplit', () => {
  it('marca completo cuando la suma es 100', () => {
    const result = validateShareSplit([{ sharePercent: 33 }, { sharePercent: 58 }, { sharePercent: 9 }]);
    expect(result.sum).toBe(100);
    expect(result.isComplete).toBe(true);
  });

  it('no marca completo cuando la suma es menor que 100', () => {
    const result = validateShareSplit([{ sharePercent: 50 }, { sharePercent: 40 }]);
    expect(result.sum).toBe(90);
    expect(result.isComplete).toBe(false);
  });

  it('no marca completo cuando la suma supera 100', () => {
    const result = validateShareSplit([{ sharePercent: 60 }, { sharePercent: 50 }]);
    expect(result.sum).toBe(110);
    expect(result.isComplete).toBe(false);
  });

  it('trata el conjunto vacío como suma 0 (no completo)', () => {
    const result = validateShareSplit([]);
    expect(result.sum).toBe(0);
    expect(result.isComplete).toBe(false);
  });

  it('cuenta los agentes a 0% (PM/observador) sin romper el total', () => {
    const result = validateShareSplit([
      { sharePercent: 100 },
      { sharePercent: 0 },
      { sharePercent: 0 },
    ]);
    expect(result.sum).toBe(100);
    expect(result.isComplete).toBe(true);
  });
});
