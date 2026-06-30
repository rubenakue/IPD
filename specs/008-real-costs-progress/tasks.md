# Tasks: Costes reales, contra-asientos y avance físico (flujo C)

**Feature**: `specs/008-real-costs-progress/` · **Branch**: `s14-real-costs`
**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md),
[quickstart.md](./quickstart.md)

Convención: `- [ ] [TaskID] [P?] [Story?] descripción con ruta`. `[P]` = paralelizable
(archivos distintos, sin dependencias pendientes). Dinero en céntimos (`BigInt`/number en el
borde). Tests con Vitest. La lógica pura se hace en TDD (test → rojo → verde).

---

## Phase 1 — Setup (contratos compartidos)

- [x] T001 [P] Añadir a `src/types/api.ts` los tipos del contrato (ver `contracts/api.md`):
  `RealCostView` (`id`, `amountCents`, `type`, `description`, `reason`, `incurredOn`,
  `recordedByName`, `createdAt`, `voided`, `reversalOfId`), `BudgetLineDetailView`
  (datos de partida + `progressPercent`, `progressUpdatedAt`, `accumulatedCostCents`,
  `costs: RealCostView[]`), `AddRealCostRequest`, `ReverseRealCostRequest`,
  `UpdateProgressRequest`.

---

## Phase 2 — Foundational (bloquea todas las US)

**Migración additiva** (no se reescribe ninguna existente):

- [x] T002 Editar `prisma/schema.prisma`: añadir a `RealCost` los campos `description String`
  e `incurredOn DateTime @db.Date` (fecha del coste). Regenerar el client (`prisma generate`).
- [x] T003 Crear `prisma/migrations/<ts>_real_cost_costs_and_immutability/migration.sql`
  (additiva) con: (a) `ALTER TABLE "RealCost" ADD COLUMN "description" TEXT`, `ADD COLUMN
  "incurredOn" DATE` (+ backfill defensivo y `SET NOT NULL`); (b) CHECK `btrim("description")
  <> ''`; (c) CHECK `progressPercent IS NULL OR (progressPercent BETWEEN 0 AND 100)` en
  `BudgetLine`; (d) **índice único parcial** `CREATE UNIQUE INDEX ... ON "RealCost"
  ("reversalOfId") WHERE "type" = 'REVERSAL'` (una anulación por coste, D2); (e) **trigger**
  `BEFORE UPDATE OR DELETE ON "RealCost"` que lanza excepción `ERRCODE 23514` (inmutabilidad,
  D1). Aplicar con `pnpm exec prisma migrate deploy`.

**Lógica pura (TDD)** — `src/lib/budget/real-costs.ts`:

- [x] T004 [P] Escribir `tests/budget-real-costs.test.ts` (rojo): `accumulatedCostCents`
  (suma con signo: un REVERSAL resta); `summarizeLineCosts` marca `voided` en el NORMAL que
  tiene un REVERSAL vinculado y no en los demás; caso acumulado tras anulación = valor previo.
- [x] T005 Implementar `src/lib/budget/real-costs.ts` (verde): `accumulatedCostCents(costs)`,
  `summarizeLineCosts(costs)` → `{ accumulatedCents, entries: RealCostView[] }` con `voided`
  derivado. Sin I/O, sin casos especiales (suma directa).

---

## Phase 3 — US1 · Imputar coste real y ver el acumulado (P1) 🎯 MVP

**Objetivo**: el constructor/PM imputa costes a una partida (presupuesto APPROVED) y ve el
historial + acumulado. **Test independiente**: imputar dos costes → ambos en el historial,
acumulado = suma, auditoría `realCost.created` por cada uno.

- [x] T006 [US1] Crear `src/server/projects/real-costs.ts` con `getBudgetLineDetail(prisma,
  userId, projectId, lineId)`: carga la partida (validando que es del proyecto) + sus
  `RealCost` ordenados, bajo `withRlsContext`; arma `BudgetLineDetailView` con
  `summarizeLineCosts`. `NOT_FOUND` si la partida no es del proyecto.
- [x] T007 [US1] En `src/server/projects/real-costs.ts`, `addRealCost(...)`: valida
  presupuesto **APPROVED** (si no, `DOMAIN_ERROR`), crea el `RealCost` NORMAL (importe > 0,
  `incurredOn`, `description`, `recordedById`) bajo `withRlsContext`; `safeRecordAuditEvent`
  `realCost.created`. Devuelve el detalle actualizado.
- [x] T008 [US1] En `src/server/routes/projects.ts`: `GET /projects/:projectId/budget/lines/
  :lineId` (`requireProjectPermission 'project.view'`) y `POST .../lines/:lineId/costs`
  (`'realCost.create'`) con validación Zod (`amountCents` int > 0, `incurredOn` fecha,
  `description` no vacía).
- [x] T009 [P] [US1] Hooks `src/hooks/useBudgetLineDetail.ts` (query `['budget-line', lineId]`)
  y `src/hooks/useAddRealCost.ts` (invalida el detalle y `['project-budget', projectId]`).
- [x] T010 [US1] En `src/pages/ProjectBudgetPage.tsx`: abrir **detalle de partida** (modal o
  sección) con el historial de asientos y el coste acumulado, y formulario "Imputar coste"
  (importe €, fecha, descripción) visible para `realCost.create`.
- [x] T011 [US1] `tests/server/project-real-costs.test.ts` (integración US1): imputar 2 costes
  → 201 + acumulado correcto + auditoría; importe ≤ 0 → `VALIDATION_ERROR`; rol sin permiso
  (observador) → `FORBIDDEN`; presupuesto en borrador → `DOMAIN_ERROR`; no-agente → `NOT_FOUND`;
  intento de UPDATE/DELETE directo de un `RealCost` → rechazado por el trigger.
- [x] T012 [P] [US1] `tests/frontend/project-budget-detail.test.tsx`: render del detalle con
  costes y acumulado; el formulario de imputar aparece solo con permiso.

**Checkpoint US1**: imputación + acumulado funcionando de extremo a extremo (MVP entregable).

---

## Phase 4 — US2 · Registrar avance físico (P2)

**Objetivo**: el constructor/PM registra el % de avance (0–100) de una partida. **Test
independiente**: registrar 40% y luego 60% → sustituye, con autor/fecha, auditoría
`progress.updated`.

- [x] T013 [US2] En `src/server/projects/real-costs.ts`, `updateProgress(...)`: valida
  presupuesto **APPROVED**, actualiza `progressPercent` + `progressUpdatedById` +
  `progressUpdatedAt` bajo `withRlsContext`; `safeRecordAuditEvent` `progress.updated`.
  Devuelve el detalle.
- [x] T014 [US2] En `src/server/routes/projects.ts`: `PATCH .../lines/:lineId/progress`
  (`'progress.update'`) con Zod (`progressPercent` int 0–100).
- [x] T015 [P] [US2] Hook `src/hooks/useUpdateProgress.ts` (invalida el detalle de la partida).
- [x] T016 [US2] En el detalle de partida (`ProjectBudgetPage.tsx`): control "Actualizar
  avance" (0–100) visible para `progress.update`, con autor/fecha del último avance.
- [x] T017 [US2] Tests en `tests/server/project-real-costs.test.ts`: 40%→60% sustituye con
  autor/fecha; fuera de 0–100 → `VALIDATION_ERROR`; rol sin permiso → `FORBIDDEN`; presupuesto
  no aprobado → `DOMAIN_ERROR`; imputar un coste NO cambia el avance (§8.7).

**Checkpoint US2**: avance físico registrado e independiente del gasto.

---

## Phase 5 — US3 · Anular un coste con contra-asiento (P3)

**Objetivo**: el PM anula un coste creando un contra-asiento con motivo. **Test
independiente**: imputar → anular como PM con motivo → original intacto, contra-asiento de
signo contrario, acumulado vuelve al previo, original "anulado".

- [x] T018 [US3] En `src/server/projects/real-costs.ts`, `reverseRealCost(...)`: valida
  presupuesto **APPROVED**; carga el original y exige `type = NORMAL` y sin reversal previo
  (si no, `CONFLICT`); crea el `RealCost` REVERSAL (`amount = −original`, `reversalOfId`,
  `reason` obligatorio) bajo `withRlsContext`, mapeando la violación del índice único a
  `CONFLICT`; `safeRecordAuditEvent` `realCost.voided`. Devuelve el detalle.
- [x] T019 [US3] En `src/server/routes/projects.ts`: `POST .../budget/costs/:costId/reversal`
  (`'realCost.reverse'`) con Zod (`reason` no vacío).
- [x] T020 [P] [US3] Hook `src/hooks/useReverseRealCost.ts` (invalida el detalle de la partida
  y `['project-budget', projectId]`).
- [x] T021 [US3] En el detalle de partida: botón "Anular" con campo motivo (solo
  `realCost.reverse`); los asientos anulados se muestran tachados.
- [x] T022 [US3] Tests en `tests/server/project-real-costs.test.ts`: anular crea
  contra-asiento vinculado sin tocar el original + acumulado vuelve al previo + auditoría;
  motivo vacío → `VALIDATION_ERROR`; anular dos veces → `CONFLICT`; anular un contra-asiento →
  `CONFLICT`; constructor intenta anular → `FORBIDDEN`.

**Checkpoint US3**: corrección contable trazable completa (flujo C íntegro).

---

## Phase 6 — Polish & cross-cutting

- [x] T023 [P] Revisar mensajes de error y textos UI en español; sin `console.log` ni código
  muerto; `pnpm typecheck` + `pnpm lint` + `pnpm test` en verde.
- [x] T024 Validar en navegador el flujo C según `quickstart.md` (imputar → avance → anular)
  con cuentas demo; capturar evidencia.
- [x] T025 [P] Anotar la sesión S14 en `docs/diario.md`.

---

## Dependencias y orden

- **Setup (T001)** → **Foundational (T002–T005)** bloquean todas las US.
- **US1 (T006–T012)** = MVP; debe ir primero (US2 y US3 usan el detalle/historial que crea).
- **US2 (T013–T017)** y **US3 (T018–T022)** son independientes entre sí; pueden ir en
  cualquier orden tras US1.
- **Polish (T023–T025)** al final.

Orden TDD dentro de la lógica pura: T004 (rojo) → T005 (verde). En las US, los tests de
integración/UI acompañan a su implementación.

## Ejecución en paralelo (ejemplos)

- Foundational: T004 (test lógica pura) puede escribirse mientras se prepara la migración
  T002/T003 (archivos distintos).
- US1: T009 (hooks) y T012 (test UI) son `[P]` respecto al backend T006–T008.
- US2/US3: una vez cerrada US1, una persona toma US2 y otra US3 (archivos solo se solapan en
  `real-costs.ts`/`projects.ts`/`ProjectBudgetPage.tsx` → coordinar esos tres).

## MVP y entrega incremental

- **MVP = US1** (imputar coste + ver acumulado): ya entrega el núcleo del flujo C.
- Incremento 1: + US2 (avance físico, conecta con EVM de S15).
- Incremento 2: + US3 (anulación contable).

## Validación de formato

Todas las tareas: checkbox `- [ ]`, ID `T0NN`, etiqueta `[US?]` en fases de historia, `[P]`
donde aplica, y ruta de archivo concreta. ✅
