// Tests del FRC (calculateFRC) — User Story 1 de specs/001-critical-calculations.
// Escritos ANTES de implementar (TDD): deben estar en ROJO hasta la sesión S3.
// Todos los importes en céntimos enteros; `eur()` convierte euros a céntimos para legibilidad.
import { describe, it, expect } from 'vitest';
import { calculateFRC } from '../src/lib/calculations/frc';
import type { FrcInput, FrcResult } from '../src/types/domain';

const eur = (euros: number): number => Math.round(euros * 100);

/** Localiza el resultado de un agente por id (el orden de salida no se asume). */
const agentResult = (result: FrcResult, agentId: string) => {
  const found = result.agents.find((a) => a.agentId === agentId);
  if (!found) throw new Error(`Agente ${agentId} ausente en el resultado`);
  return found;
};

describe('calculateFRC', () => {
  it('US1.1 — reparte el ahorro según el porcentaje de cada agente y la suma cuadra', () => {
    // Vigente 20 M, previsión 19 M → ahorro de 1 M. Reparto 33 / 58 / 9 %.
    const input: FrcInput = {
      currentBudget: eur(20_000_000),
      forecastAtCompletion: eur(19_000_000),
      agents: [
        { agentId: 'promoter', role: 'promoter', sharePercent: 33, guaranteedFee: eur(500_000), feeAtRisk: 0 },
        { agentId: 'constructor', role: 'constructor', sharePercent: 58, guaranteedFee: eur(800_000), feeAtRisk: eur(600_000) },
        { agentId: 'designer', role: 'designer', sharePercent: 9, guaranteedFee: eur(200_000), feeAtRisk: eur(100_000) },
      ],
    };

    const result = calculateFRC(input);

    expect(result.deviation).toBe(eur(1_000_000)); // ahorro positivo
    expect(agentResult(result, 'promoter').bonusMalus).toBe(eur(330_000));
    expect(agentResult(result, 'constructor').bonusMalus).toBe(eur(580_000));
    expect(agentResult(result, 'designer').bonusMalus).toBe(eur(90_000));

    // La suma de los repartos cuadra exactamente con el ahorro total (sin pérdida por redondeo).
    const sumaBonus = result.agents.reduce((acc, a) => acc + a.bonusMalus, 0);
    expect(sumaBonus).toBe(eur(1_000_000));
  });

  it('US1.5 — el resultado total de cada agente es honorarios garantizados + bonus/malus', () => {
    const input: FrcInput = {
      currentBudget: eur(20_000_000),
      forecastAtCompletion: eur(19_000_000),
      agents: [
        { agentId: 'promoter', role: 'promoter', sharePercent: 33, guaranteedFee: eur(500_000), feeAtRisk: 0 },
        { agentId: 'constructor', role: 'constructor', sharePercent: 58, guaranteedFee: eur(800_000), feeAtRisk: eur(600_000) },
        { agentId: 'designer', role: 'designer', sharePercent: 9, guaranteedFee: eur(200_000), feeAtRisk: eur(100_000) },
      ],
    };

    const result = calculateFRC(input);

    expect(agentResult(result, 'promoter').total).toBe(eur(830_000)); // 500.000 + 330.000
    expect(agentResult(result, 'constructor').total).toBe(eur(1_380_000)); // 800.000 + 580.000
    expect(agentResult(result, 'designer').total).toBe(eur(290_000)); // 200.000 + 90.000
  });

  it('US1.2 — en sobrecoste, constructor y proyectista topan su pérdida y el promotor absorbe el exceso', () => {
    // Vigente 20 M, previsión 22 M → sobrecoste de 2 M.
    // Constructor: 58 % serían 1,16 M, pero topa en 600 k (su riesgo) → exceso 560 k.
    // Proyectista: 9 % serían 180 k, pero topa en 100 k → exceso 80 k.
    // Promotor: 33 % (660 k) + exceso de los demás (640 k) = 1,3 M, sin tope.
    const input: FrcInput = {
      currentBudget: eur(20_000_000),
      forecastAtCompletion: eur(22_000_000),
      agents: [
        { agentId: 'promoter', role: 'promoter', sharePercent: 33, guaranteedFee: eur(500_000), feeAtRisk: 0 },
        { agentId: 'constructor', role: 'constructor', sharePercent: 58, guaranteedFee: eur(800_000), feeAtRisk: eur(600_000) },
        { agentId: 'designer', role: 'designer', sharePercent: 9, guaranteedFee: eur(200_000), feeAtRisk: eur(100_000) },
      ],
    };

    const result = calculateFRC(input);

    expect(result.deviation).toBe(-eur(2_000_000)); // sobrecoste negativo
    expect(agentResult(result, 'constructor').bonusMalus).toBe(-eur(600_000));
    expect(agentResult(result, 'designer').bonusMalus).toBe(-eur(100_000));
    expect(agentResult(result, 'promoter').bonusMalus).toBe(-eur(1_300_000));

    // La suma de pérdidas cuadra exactamente con el sobrecoste total.
    const sumaMalus = result.agents.reduce((acc, a) => acc + a.bonusMalus, 0);
    expect(sumaMalus).toBe(-eur(2_000_000));
  });

  it('US1.3 — en equilibrio, bonus/malus es 0 y el total es igual a los honorarios garantizados', () => {
    const input: FrcInput = {
      currentBudget: eur(20_000_000),
      forecastAtCompletion: eur(20_000_000), // previsión = vigente
      agents: [
        { agentId: 'promoter', role: 'promoter', sharePercent: 33, guaranteedFee: eur(500_000), feeAtRisk: 0 },
        { agentId: 'constructor', role: 'constructor', sharePercent: 58, guaranteedFee: eur(800_000), feeAtRisk: eur(600_000) },
        { agentId: 'designer', role: 'designer', sharePercent: 9, guaranteedFee: eur(200_000), feeAtRisk: eur(100_000) },
      ],
    };

    const result = calculateFRC(input);

    expect(result.deviation).toBe(0);
    for (const a of result.agents) {
      expect(a.bonusMalus).toBe(0);
    }
    expect(agentResult(result, 'constructor').total).toBe(eur(800_000)); // solo honorarios garantizados
  });

  it('US1.4 — un agente con 0 % de participación nunca tiene bonus ni malus', () => {
    const input: FrcInput = {
      currentBudget: eur(20_000_000),
      forecastAtCompletion: eur(19_000_000), // hay ahorro, pero el observador no participa
      agents: [
        { agentId: 'promoter', role: 'promoter', sharePercent: 40, guaranteedFee: eur(500_000), feeAtRisk: 0 },
        { agentId: 'constructor', role: 'constructor', sharePercent: 60, guaranteedFee: eur(800_000), feeAtRisk: eur(600_000) },
        { agentId: 'observer', role: 'designer', sharePercent: 0, guaranteedFee: eur(120_000), feeAtRisk: 0 },
      ],
    };

    const result = calculateFRC(input);

    expect(agentResult(result, 'observer').bonusMalus).toBe(0);
    expect(agentResult(result, 'observer').total).toBe(eur(120_000));
  });

  it('US1.6 — reparto no divisible: la suma cuadra al céntimo y el residuo va al de mayor %', () => {
    // Ahorro de 101 céntimos repartido 30/30/40 %. 30 % = 30,3 → 30; 40 % = 40,4 → 40.
    // Faltan 1 céntimo para cuadrar los 101 → se asigna al agente de mayor % (constructor, 40 %).
    // Un Math.round por agente no protege esta regla (FR-008, redondeo determinista).
    const input: FrcInput = {
      currentBudget: 101, // céntimos: caso mínimo para forzar un residuo de redondeo
      forecastAtCompletion: 0,
      agents: [
        { agentId: 'promoter', role: 'promoter', sharePercent: 30, guaranteedFee: 0, feeAtRisk: 0 },
        { agentId: 'designer', role: 'designer', sharePercent: 30, guaranteedFee: 0, feeAtRisk: 0 },
        { agentId: 'constructor', role: 'constructor', sharePercent: 40, guaranteedFee: 0, feeAtRisk: 0 },
      ],
    };

    const result = calculateFRC(input);

    expect(agentResult(result, 'promoter').bonusMalus).toBe(30);
    expect(agentResult(result, 'designer').bonusMalus).toBe(30);
    expect(agentResult(result, 'constructor').bonusMalus).toBe(41); // 40 + el céntimo residual
    const suma = result.agents.reduce((acc, a) => acc + a.bonusMalus, 0);
    expect(suma).toBe(101); // cuadra exactamente con la desviación
  });
});
