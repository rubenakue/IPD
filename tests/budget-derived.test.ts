import { describe, expect, it } from 'vitest';
import {
  ALERT_PERCENT,
  WARNING_PERCENT,
  deriveBudgetLine,
  summarizeEconomics,
} from '../src/lib/budget/derived.ts';

describe('derived economics (lógica pura)', () => {
  it('umbrales de alerta declarados como constantes 5/10', () => {
    expect(WARNING_PERCENT).toBe(5);
    expect(ALERT_PERCENT).toBe(10);
  });

  it('partida sin costes: previsión = vigente, desviación 0, normal', () => {
    const d = deriveBudgetLine({
      baseAmountCents: 5_000_00,
      adjustmentsCents: 0,
      accumulatedCostCents: 0,
      manualForecastCents: null,
    });
    expect(d.currentBudgetCents).toBe(5_000_00);
    expect(d.forecastCents).toBe(5_000_00);
    expect(d.varianceCents).toBe(0);
    expect(d.variancePercent).toBe(0);
    expect(d.alertLevel).toBe('normal');
  });

  it('coste por encima del vigente: previsión = coste, desviación negativa, alerta', () => {
    const d = deriveBudgetLine({
      baseAmountCents: 5_000_00,
      adjustmentsCents: 0,
      accumulatedCostCents: 6_000_00,
      manualForecastCents: null,
    });
    expect(d.forecastCents).toBe(6_000_00);
    expect(d.varianceCents).toBe(-1_000_00);
    expect(d.variancePercent).toBe(-20);
    expect(d.alertLevel).toBe('alert');
  });

  it('el vigente suma los ajustes', () => {
    const d = deriveBudgetLine({
      baseAmountCents: 5_000_00,
      adjustmentsCents: 1_000_00,
      accumulatedCostCents: 0,
      manualForecastCents: null,
    });
    expect(d.currentBudgetCents).toBe(6_000_00);
  });

  it('la previsión manual tiene prioridad sobre la regla por defecto', () => {
    const d = deriveBudgetLine({
      baseAmountCents: 10_000_00,
      adjustmentsCents: 0,
      accumulatedCostCents: 2_000_00,
      manualForecastCents: 11_000_00,
    });
    expect(d.forecastCents).toBe(11_000_00);
    expect(d.varianceCents).toBe(-1_000_00);
    expect(d.variancePercent).toBe(-10);
    expect(d.alertLevel).toBe('alert');
  });

  it('umbrales: 4% normal, 5% atención, 10% alerta', () => {
    const at = (forecast: number) =>
      deriveBudgetLine({
        baseAmountCents: 1_000_00,
        adjustmentsCents: 0,
        accumulatedCostCents: 0,
        manualForecastCents: forecast,
      }).alertLevel;
    expect(at(1_040_00)).toBe('normal'); // -4%
    expect(at(1_050_00)).toBe('warning'); // -5%
    expect(at(1_100_00)).toBe('alert'); // -10%
  });

  it('vigente 0: variancePercent null y nivel normal', () => {
    const d = deriveBudgetLine({
      baseAmountCents: 0,
      adjustmentsCents: 0,
      accumulatedCostCents: 0,
      manualForecastCents: null,
    });
    expect(d.variancePercent).toBeNull();
    expect(d.alertLevel).toBe('normal');
  });

  it('agrega sumando importes y RECALCULA el % sobre el vigente agregado', () => {
    const a = deriveBudgetLine({ baseAmountCents: 10_000_00, adjustmentsCents: 0, accumulatedCostCents: 0, manualForecastCents: null }); // ahorro 0
    const b = deriveBudgetLine({ baseAmountCents: 10_000_00, adjustmentsCents: 0, accumulatedCostCents: 12_000_00, manualForecastCents: null }); // -20%
    const total = summarizeEconomics([a, b]);
    expect(total.currentBudgetCents).toBe(20_000_00);
    expect(total.forecastCents).toBe(22_000_00); // 10000 + 12000
    expect(total.varianceCents).toBe(-2_000_00);
    expect(total.variancePercent).toBe(-10); // sobre 20000, no el promedio de 0% y -20%
    expect(total.alertLevel).toBe('alert');
  });
});
