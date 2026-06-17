// Tests del EVM (calculateEVM) — User Story 2 de specs/001-critical-calculations.
// Escritos ANTES de implementar (TDD): deben estar en ROJO hasta la sesión S4.
// Regla clave (§9.6): una métrica que no se puede calcular es `null` ("sin datos"), NUNCA 0.
import { describe, it, expect } from 'vitest';
import { calculateEVM } from '../src/lib/calculations/evm';
import type { EvmInput } from '../src/types/domain';

const eur = (euros: number): number => Math.round(euros * 100);

describe('calculateEVM', () => {
  it('US2.1 — calcula las siete métricas con datos completos', () => {
    // BAC 20 M (una partida al 30 % → EV 6 M), AC 6,5 M, PV 7 M.
    const input: EvmInput = {
      lines: [{ lineId: 'L1', currentBudget: eur(20_000_000), progressPercent: 30 }],
      actualCostEntries: [{ amount: eur(6_500_000) }],
      plannedValue: eur(7_000_000),
    };

    const r = calculateEVM(input);

    expect(r.bac).toBe(eur(20_000_000));
    expect(r.ev).toBe(eur(6_000_000));
    expect(r.ac).toBe(eur(6_500_000));
    expect(r.pv).toBe(eur(7_000_000));
    expect(r.cv).toBe(-eur(500_000)); // EV − AC
    expect(r.sv).toBe(-eur(1_000_000)); // EV − PV
    expect(r.cpi).toBeCloseTo(0.923, 3); // EV / AC, ratio sin redondear
    expect(r.spi).toBeCloseTo(0.857, 3); // EV / PV
    // EAC = round(BAC × AC / EV) = round(2 000 000 000 × 650 000 000 / 600 000 000) en céntimos.
    // OJO (hallazgo para S4): BAC × AC ≈ 1,3·10^18 SUPERA Number.MAX_SAFE_INTEGER (≈ 9·10^15).
    // La implementación deberá calcularlo sin desbordar (BigInt o reordenando), no de forma ingenua.
    expect(r.eac).toBe(2_166_666_667); // ≈ 21.666.666,67 €
    expect(r.etc).toBe(1_516_666_667); // EAC − AC
    expect(r.vac).toBe(-166_666_667); // BAC − EAC (negativo: se prevé acabar por encima del presupuesto)
  });

  it('US2.2 — sin planificación (PV ausente): PV, SV y SPI son "sin datos"; CV y CPI sí se calculan', () => {
    const input: EvmInput = {
      lines: [{ lineId: 'L1', currentBudget: eur(20_000_000), progressPercent: 30 }],
      actualCostEntries: [{ amount: eur(6_500_000) }],
      plannedValue: null,
    };

    const r = calculateEVM(input);

    expect(r.pv).toBeNull();
    expect(r.sv).toBeNull();
    expect(r.spi).toBeNull();
    expect(r.cv).toBe(-eur(500_000)); // no depende de PV
    expect(r.cpi).toBeCloseTo(0.923, 3);
  });

  it('US2.3 — sin avance (EV ausente): EV y todos sus derivados son "sin datos"', () => {
    const input: EvmInput = {
      lines: [{ lineId: 'L1', currentBudget: eur(20_000_000), progressPercent: null }],
      actualCostEntries: [{ amount: eur(6_500_000) }],
      plannedValue: eur(7_000_000),
    };

    const r = calculateEVM(input);

    expect(r.bac).toBe(eur(20_000_000)); // el presupuesto vigente sí existe
    expect(r.ev).toBeNull();
    expect(r.cv).toBeNull();
    expect(r.sv).toBeNull();
    expect(r.cpi).toBeNull();
    expect(r.spi).toBeNull();
    expect(r.eac).toBeNull();
    expect(r.etc).toBeNull();
    expect(r.vac).toBeNull();
  });

  it('US2.4 — coste real cero (AC = 0): CPI/EAC/ETC/VAC son "sin datos", pero CV = EV', () => {
    const input: EvmInput = {
      lines: [{ lineId: 'L1', currentBudget: eur(20_000_000), progressPercent: 30 }],
      actualCostEntries: [], // sin asientos → AC = 0
      plannedValue: eur(7_000_000),
    };

    const r = calculateEVM(input);

    expect(r.ac).toBe(0);
    expect(r.cpi).toBeNull(); // división por cero
    expect(r.eac).toBeNull();
    expect(r.etc).toBeNull();
    expect(r.vac).toBeNull();
    expect(r.cv).toBe(eur(6_000_000)); // CV = EV − 0 = EV
  });

  it('US2.5 — AC es la suma neta de asientos: el contra-asiento (anulación) resta', () => {
    const input: EvmInput = {
      lines: [{ lineId: 'L1', currentBudget: eur(20_000_000), progressPercent: 30 }],
      actualCostEntries: [{ amount: eur(6_500_000) }, { amount: -eur(500_000) }], // imputación + anulación
      plannedValue: eur(7_000_000),
    };

    const r = calculateEVM(input);

    expect(r.ac).toBe(eur(6_000_000)); // 6,5 M − 0,5 M
  });
});
