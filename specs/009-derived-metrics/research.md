# Research — Derivados económicos y alertas (S15)

Sin tecnología nueva. El modelo de datos ya existe; estas decisiones fijan el "cómo".

## D1 — Lógica pura de derivados

**Decisión**: `src/lib/budget/derived.ts` con una función por partida y una agregación:
- `deriveBudgetLine({ baseAmountCents, adjustmentsCents, accumulatedCostCents, manualForecastCents })`
  → `{ currentBudgetCents, forecastCents, varianceCents, variancePercent, alertLevel }`.
  - `currentBudgetCents = base + adjustments`.
  - `forecastCents = manualForecastCents ?? max(accumulatedCostCents, currentBudgetCents)`.
  - `varianceCents = currentBudgetCents − forecastCents` (positivo = ahorro; negativo =
    sobrecoste; coherente con `domain.ts` `BudgetVariance`).
  - `variancePercent = currentBudgetCents !== 0 ? (varianceCents / currentBudgetCents) * 100 : null`.
  - `alertLevel = abs(variancePercent) >= 10 → 'alert'; >= 5 → 'warning'; else 'normal'`
    (constantes `WARNING_PERCENT = 5`, `ALERT_PERCENT = 10`; `null` → `'normal'`).
- Agregación por capítulo/proyecto: suma de `currentBudget`, `accumulatedCost`, `forecast`,
  `variance`; el `variancePercent`/`alertLevel` del grupo se **recalculan** sobre su
  `currentBudget` agregado (no se promedian los % de las líneas).

**Rationale**: nada derivado se persiste (Constitución IV); pura y testeable sin I/O; reutiliza
`accumulatedCostCents` (S14) para el coste. Umbrales como constantes (clarify).

**Alternativas**: calcular en SQL (rechazado: la regla de dominio se testea mejor como función
pura y la reusará el FRC/EVM en S16).

## D2 — Presupuesto vigente y ajustes (sin motor de cambios)

**Decisión**: `adjustmentsCents` de una partida = Σ `ChangeAdjustment.delta` de esa partida. El
motor de cambios (H8) no existe aún, así que no hay `ChangeAdjustment` y la suma es 0 → vigente
= base. La consulta incluye los adjustments (hoy lista vacía) para que el vigente quede correcto
en cuanto existan. **Nota:** cuando H8 introduzca estados de `Change`, la suma se filtrará por
cambios **aprobados**; hoy no hay con qué filtrar.

**Rationale**: additivo y sin deuda (clarify); la lógica del vigente ya contempla ajustes.

## D3 — Previsión manual (override)

**Decisión**: `manualForecastCents` (campo existente `BudgetLine.manualForecast`) se **fija**
con un valor **> 0** o se **elimina** (set a `null`) para volver al default. `setLineForecast`
valida presupuesto **APPROVED**, valida el valor (> 0 o null), persiste bajo `withRlsContext` y
registra `forecast.updated`. El trigger de inmutabilidad de base de S13 vigila los campos base,
**no** `manualForecast`, así que no se dispara (igual que el avance en S14).

**Rationale**: clarify (manual > 0; eliminar para default). Es el único dato que esta feature
escribe.

## D4 — API

**Decisión** (bajo `requireAuth` + `requireProjectPermission` + RLS):
- `GET /api/projects/:projectId/economics` — vista económica enriquecida (capítulos → líneas con
  derivados + subtotales + total). Permiso `project.view`. Si no hay presupuesto o está en
  borrador, devuelve vacío/estado correspondiente.
- `PATCH /api/projects/:projectId/budget/lines/:lineId/forecast` — fijar/eliminar previsión
  manual. Permiso `forecast.update`. Body `{ manualForecastCents: number | null }`.

**Rationale**: endpoint de lectura **separado** del `GET /budget` de S13 (que sirve la base para
carga/edición) → no rompe su contrato ni mezcla base con derivados. El override cuelga de la
partida, consistente con S14.

**Alternativas**: ampliar `BudgetView` con derivados (rechazado: rompería el contrato/tests de
S13 y mezclaría responsabilidades).

## D5 — Frontend

**Decisión**: `ProjectBudgetPage` muestra, cuando el presupuesto está **APPROVED**, la **tabla
económica** (columnas: base, ajustes, vigente, coste real, avance %, previsión, desviación €/%)
con filas resaltadas por `alertLevel`, alimentada por `GET economics`. En borrador sigue la
tabla de carga de S13. El override de previsión se hace desde el **detalle de partida** (modal
de S14): un campo "Previsión manual" con guardar/limpiar (visible para `forecast.update`). Hooks
`useProjectEconomics` (query) y `useSetForecast` (invalida economics + el detalle).

**Rationale**: evolución natural de la tabla de presupuesto; reutiliza el modal de detalle de
S14 para el override.

**Alternativas**: ruta `/economics` separada (posible; se decide en implementación según
ergonomía, pero la tabla en `/budget` cuando está aprobado es lo más directo).
