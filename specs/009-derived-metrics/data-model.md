# Data Model — Derivados económicos (S15)

> No hay cambios de esquema. Todo el almacenamiento ya existe; esta feature **lee** datos fuente
> y **calcula** derivados al vuelo. El único dato que escribe es `BudgetLine.manualForecast`.

## Entidades fuente (existentes)

| Entidad / campo | Tipo | Uso en S15 |
|-----------------|------|------------|
| `BudgetLine.baseAmount` | BigInt (céntimos) | base del vigente |
| `BudgetLine.manualForecast` | BigInt? (céntimos) | **previsión manual** (se escribe: > 0 o null) |
| `BudgetLine.progressPercent` | Int? (0–100) | avance mostrado en la tabla (de S14) |
| `ChangeAdjustment.delta` | BigInt (céntimos, con signo) | sumandos del vigente (hoy 0; H8) |
| `RealCost.amount` | BigInt (céntimos, con signo) | coste real acumulado (Σ, de S14) |

## Derivados (NO se persisten)

Calculados en `src/lib/budget/derived.ts` por partida, y agregados por capítulo y proyecto:

| Derivado | Fórmula |
|----------|---------|
| `currentBudgetCents` (vigente) | `baseAmount + Σ adjustments.delta` |
| `accumulatedCostCents` | `Σ realCost.amount` (los reversal restan) — regla de S14 |
| `forecastCents` (previsión a cierre) | `manualForecast ?? max(accumulatedCost, currentBudget)` |
| `varianceCents` (desviación €) | `currentBudget − forecast` (+ ahorro / − sobrecoste) |
| `variancePercent` (desviación %) | `currentBudget ≠ 0 ? variance / currentBudget × 100 : null` |
| `alertLevel` | `\|variancePercent\| ≥ 10 → alert; ≥ 5 → warning; else normal` (null → normal) |

Subtotales de capítulo y total de proyecto: suma de `currentBudget`, `accumulatedCost`,
`forecast`, `variance`; `variancePercent`/`alertLevel` del grupo **recalculados** sobre su
`currentBudget` agregado.

## Reglas de validación (servidor)

- **Fijar previsión manual**: valor entero en céntimos **> 0**; presupuesto **APPROVED**;
  partida del proyecto. Rol: constructor o PM (`forecast.update`).
- **Eliminar previsión manual**: `manualForecast = null` → vuelve al default. Mismas
  precondiciones de rol/estado.
- **Consultar economics**: cualquier agente del proyecto (`project.view`); no-agente → denegado.

## Auditoría

`forecast.updated` (best-effort, `safeRecordAuditEvent`) al fijar o eliminar la previsión manual,
con autor, momento y la partida afectada.

## Constantes

`WARNING_PERCENT = 5`, `ALERT_PERCENT = 10` (umbrales de alerta, en `src/lib/budget/derived.ts`).
