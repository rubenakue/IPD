# Tasks: Derivados económicos y alertas de desviación

**Feature**: `specs/009-derived-metrics/` · **Branch**: `s15-derived-metrics`
**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md),
[quickstart.md](./quickstart.md)

Convención: `- [ ] [TaskID] [P?] [Story?] descripción con ruta`. `[P]` = paralelizable.
Dinero en céntimos. **Sin migración** (modelo ya completo). La lógica pura se hace en TDD.

---

## Phase 1 — Setup (contratos compartidos)

- [x] T001 [P] Añadir a `src/types/api.ts`: `AlertLevel = 'normal' | 'warning' | 'alert'`;
  `EconomicsLineView` (id, code, name, baseAmountCents, adjustmentsCents, currentBudgetCents,
  accumulatedCostCents, progressPercent, manualForecastCents, forecastCents, varianceCents,
  variancePercent (number|null), alertLevel); `EconomicsChapterView` (chapterCode/Name + mismos
  agregados + lines); `ProjectEconomicsResponse` (budgetStatus, canUpdateForecast, chapters,
  totals); `SetForecastRequest` (`manualForecastCents: number | null`).

---

## Phase 2 — Foundational (bloquea las US) — lógica pura (TDD)

- [x] T002 [P] Escribir `tests/budget-derived.test.ts` (rojo): `deriveBudgetLine` — vigente =
  base + ajustes; previsión default = max(coste, vigente) y manual prioritaria; desviación € =
  vigente − previsión y % sobre vigente; `variancePercent` null y `alertLevel` normal cuando
  vigente = 0; umbrales (4% normal, 5% warning, 10% alert); agregación de capítulo/total que
  **recalcula** el % sobre el vigente agregado (no promedia).
- [x] T003 Implementar `src/lib/budget/derived.ts` (verde): `deriveBudgetLine(input)` y
  `summarizeEconomics(lines)` (agregados por capítulo y total), con constantes
  `WARNING_PERCENT = 5` y `ALERT_PERCENT = 10`. Sin I/O. Reutiliza `accumulatedCostCents` (S14)
  donde aplique.

---

## Phase 3 — US1 · Tabla de control económico con derivados y alertas (P1) 🎯 MVP

**Objetivo**: cualquier agente ve la tabla con vigente, coste real, previsión, desviación €/% y
alertas. **Test independiente**: con costes conocidos, los derivados y subtotales cuadran y la
partida en sobrecoste se resalta.

- [x] T004 [US1] Crear `src/server/projects/economics.ts` con `getProjectEconomics(prisma,
  userId, projectId)`: bajo `withRlsContext`, carga el presupuesto + líneas con sus `realCosts`
  (acumulado), `adjustments` (Σ delta) y `manualForecast`; arma `ProjectEconomicsResponse` con
  `deriveBudgetLine` + `summarizeEconomics`. Si no hay presupuesto o está en DRAFT → `chapters:
  []`, `totals` en cero y `budgetStatus` correspondiente.
- [x] T005 [US1] En `src/server/routes/projects.ts`: `GET /projects/:projectId/budget/economics`
  (o `/economics`) con `requireProjectPermission 'project.view'`; incluye `canUpdateForecast =
  hasPermission(role, 'forecast.update')`.
- [x] T006 [P] [US1] Hook `src/hooks/useProjectEconomics.ts` (query `['project-economics',
  projectId]`).
- [x] T007 [US1] En `src/pages/ProjectBudgetPage.tsx`: cuando el presupuesto está **APPROVED**,
  mostrar la **tabla económica** (columnas: base, ajustes, vigente, coste real, avance %,
  previsión, desviación €, desviación %) agrupada por capítulos con subtotales y total, y
  **resaltar** las filas según `alertLevel` (warning/alert). En DRAFT, mantener la tabla de
  carga de S13.
- [x] T008 [US1] `tests/server/project-economics.test.ts` (integración): cuadre de vigente,
  previsión y desviación; partida con coste > vigente → previsión = coste, desviación negativa,
  alerta; partida sin costes → previsión = vigente, desviación 0; subtotales/total cuadran;
  no-agente → `NOT_FOUND`; presupuesto en DRAFT → `chapters` vacío.
- [x] T009 [P] [US1] `tests/frontend/project-economics.test.tsx`: render de la tabla con
  derivados y una fila resaltada por alerta.

**Checkpoint US1**: tabla económica completa con alertas (MVP entregable).

---

## Phase 4 — US2 · Afinar la previsión a cierre (override manual) (P2)

**Objetivo**: el constructor/PM fija o elimina la previsión manual de una partida. **Test
independiente**: fijar manual > default cambia previsión/desviación/alerta; eliminar vuelve al
default.

- [x] T010 [US2] En `src/server/projects/economics.ts`, `setLineForecast(prisma, userId,
  projectId, lineId, manualForecastCents | null)`: valida presupuesto **APPROVED** y que la
  partida es del proyecto; persiste `manualForecast` bajo `withRlsContext`; `safeRecordAuditEvent`
  `forecast.updated`. Devuelve la vista económica actualizada.
- [x] T011 [US2] En `src/server/routes/projects.ts`: `PATCH .../budget/lines/:lineId/forecast`
  (`requireProjectPermission 'forecast.update'`) con Zod (`manualForecastCents` int positivo
  **o** null).
- [x] T012 [P] [US2] Hook `src/hooks/useSetForecast.ts` (invalida `['project-economics',
  projectId]`).
- [x] T013 [US2] En la tabla económica (`ProjectBudgetPage.tsx`): por fila, un control "Previsión"
  (visible para `canUpdateForecast`) que abre un modal para fijar la previsión manual (> 0) o
  **limpiarla** (volver al default).
- [x] T014 [US2] Tests en `tests/server/project-economics.test.ts`: fijar manual recalcula
  previsión/desviación/alerta; eliminar (null) vuelve al default; valor ≤ 0 → `VALIDATION_ERROR`;
  rol sin permiso (observador) → `FORBIDDEN`; presupuesto no aprobado → `DOMAIN_ERROR`; auditoría
  `forecast.updated`.

**Checkpoint US2**: override de previsión funcionando y reflejado en la foto económica.

---

## Phase 5 — Polish & cross-cutting

- [x] T015 [P] Sin `console.log` ni código muerto; `pnpm typecheck` + `pnpm lint` + `pnpm test`
  en verde.
- [x] T016 Validar en navegador la tabla económica y el override según `quickstart.md` (proyecto
  aprobado con costes), capturar evidencia.
- [x] T017 [P] Anotar la sesión S15 en `docs/diario.md`.

---

## Dependencias y orden

- **Setup (T001)** → **Foundational (T002–T003)** bloquean las US.
- **US1 (T004–T009)** = MVP; va primero (US2 reusa el endpoint/hook de economics).
- **US2 (T010–T014)** tras US1.
- **Polish (T015–T017)** al final.

Orden TDD: T002 (rojo) → T003 (verde). Tests de integración/UI acompañan a su US.

## Ejecución en paralelo (ejemplos)

- T002 (test puro) mientras se perfila T001 (tipos).
- US1: T006 (hook) y T009 (test UI) son `[P]` respecto al backend T004–T005.
- US2: T012 (hook) `[P]`; T010/T011/T013 comparten `economics.ts`/`projects.ts`/
  `ProjectBudgetPage.tsx` → secuencial entre ellas.

## MVP y entrega incremental

- **MVP = US1** (tabla de derivados + alertas): ya entrega la foto económica completa.
- Incremento 1: + US2 (override de previsión manual).

## Validación de formato

Todas las tareas: checkbox `- [ ]`, ID `T0NN`, `[US?]` en fases de historia, `[P]` donde aplica,
y ruta de archivo concreta. ✅
