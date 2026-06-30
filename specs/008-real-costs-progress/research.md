# Research — Costes reales, contra-asientos y avance físico (S14 / flujo C)

Decisiones técnicas que resuelven el "cómo". No hay tecnología nueva (todo con el stack de los
ADRs 001–010). El modelo de datos ya existe (S07); estas decisiones cubren los huecos.

## D1 — Inmutabilidad de `RealCost` (FR-003)

**Decisión**: defensa en dos capas. (1) **No exponer** endpoints de edición/borrado de
`RealCost`. (2) **Trigger** `BEFORE UPDATE` en `RealCost` que lanza excepción (`ERRCODE 23514`).
Solo UPDATE: bloquear `DELETE` en el trigger también impediría el borrado **en cascada** de un
proyecto (ciclo de vida legítimo); el borrado de asientos individuales ya queda cubierto por la
ausencia de endpoint y por RLS.

**Rationale**: §8.8 — un coste imputado nunca se edita ni se borra; la corrección es un
contra-asiento. El trigger replica el patrón de inmutabilidad ya usado para la base del
presupuesto en S13 y cierra la puerta aunque alguien llame por fuera de la API.

**Alternativas**: solo capa de aplicación (rechazada: un innegociable contable merece refuerzo
en BBDD); `REVOKE UPDATE/DELETE` por rol (rechazada: el rol `ipd_app` necesita esos permisos
para otras tablas; un trigger es más quirúrgico y expresa la intención).

## D2 — "Una sola anulación, no anidada" (FR-016)

**Decisión**: (1) **índice único parcial** `CREATE UNIQUE INDEX ... ON "RealCost"("reversalOfId")
WHERE "type" = 'REVERSAL'` → un coste solo puede tener un contra-asiento. (2) En la capa de
aplicación, al anular: cargar el original y exigir `type = NORMAL` (no se anula un
contra-asiento) y que no tenga ya un reversal vinculado (preflight para devolver `CONFLICT`
limpio en vez de chocar con el índice).

**Rationale**: el CHECK existente `RealCost_reversal_fields_check` ya garantiza que un REVERSAL
lleva `reversalOfId` + `reason` no vacío y que un NORMAL no los lleva; falta impedir la doble
anulación (índice) y la anulación de un reversal (app). El índice es la red dura; el preflight
da el error de negocio claro.

**Alternativas**: solo app (rechazada: una carrera de dos anulaciones simultáneas dejaría dos
contra-asientos; el índice único lo impide a nivel BBDD).

## D3 — Precondición: presupuesto APPROVED (FR-017)

**Decisión**: verificación en la **capa de aplicación**. Imputar coste, anular y registrar
avance cargan la partida con su `Budget` y exigen `status = APPROVED`; si no, `DOMAIN_ERROR`.

**Rationale**: es una **regla de negocio** (cuándo tiene sentido la operación), no un invariante
de integridad de fila. La verificación en servidor es suficiente y testeable; un trigger sería
sobre-ingeniería. Nota importante: el trigger de S13 `prevent_approved_budgetline_base_mutation`
vigila solo los campos **base** de la partida (`code`, `name`, `baseAmount`, capítulo), **no**
`progressPercent` ni `progressUpdated*` → registrar avance sobre un presupuesto aprobado **no**
lo dispara. Imputar/anular costes tampoco, porque `RealCost` es otra tabla.

**Alternativas**: permitir en DRAFT (descartado en clarify: costes contra partidas aún
editables/borrables generan huérfanos).

## D4 — Coste acumulado y condición "anulado" (FR-005, FR-007)

**Decisión**: función **pura** en `src/lib/budget/real-costs.ts`:
- `accumulatedCostCents(costs)` = `Σ amount` (los REVERSAL, de signo contrario, restan) → "suma
  sin casos especiales" (§9.4).
- `isVoided(cost, allCosts)` = el apunte es `NORMAL` y existe un `REVERSAL` con
  `reversalOfId === cost.id`.
- `summarizeLineCosts(costs)` → `{ accumulatedCents, entries: [{...cost, voided}] }`.

**Rationale**: nada derivado se persiste (Constitución IV). Pura y testeable sin I/O; los
importes se manejan en céntimos (number en el borde de vista, BigInt en BD).

**Alternativas**: calcular en SQL (rechazada: la regla de dominio vive mejor como función pura
testeable y reutilizable por EVM/FRC en S15+).

## D5 — Avance físico (FR-009..FR-011)

**Decisión**: `updateProgress` actualiza `progressPercent` + `progressUpdatedById` +
`progressUpdatedAt` de la `BudgetLine` bajo `withRlsContext`. Validación de rango 0–100 con Zod
en servidor, **más** un CHECK additivo `progressPercent BETWEEN 0 AND 100` en BBDD (hoy solo lo
documenta un comentario). El MVP guarda el último valor (sin histórico).

**Rationale**: §8.7 — el avance se registra, no se infiere. El CHECK es defensa barata y
coherente con el resto del esquema. Autor + fecha quedan para trazabilidad.

**Alternativas**: tabla de histórico de avances (diferida: el briefing la marca como ampliación).

## D6 — API REST

**Decisión** (todas bajo `requireAuth` + `requireProjectPermission` + RLS):
- `GET  /api/projects/:projectId/budget/lines/:lineId` — detalle de partida: asientos
  (con `voided`), acumulado y avance. Permiso `project.view`.
- `POST /api/projects/:projectId/budget/lines/:lineId/costs` — imputar coste. `realCost.create`.
- `POST /api/projects/:projectId/budget/costs/:costId/reversal` — anular. `realCost.reverse`.
- `PATCH /api/projects/:projectId/budget/lines/:lineId/progress` — avance. `progress.update`.

**Rationale**: encaja con los endpoints de presupuesto de S13 (`/budget/...`) y con el flujo C
("abrir detalle de partida"). El contra-asiento se crea con `POST .../reversal` (acción), no
con `DELETE` (no se borra nada). El acumulado y "anulado" se sirven derivados en el detalle.

**Alternativas**: inflar el `GET /budget` global con todos los asientos (rechazada: el detalle
por partida es más liviano y casa con el flujo).

## D7 — Frontend

**Decisión**: en `ProjectBudgetPage`, cada partida abre un **detalle** (modal o sección) con:
historial de asientos (los anulados, tachados), coste acumulado, formulario "Imputar coste"
(constructor/PM), botón "Anular" con motivo (solo PM) y "Actualizar avance" (constructor/PM).
Hooks TanStack Query que invalidan el detalle de la partida y el presupuesto.

**Rationale**: el flujo C parte del detalle de partida; reutiliza patrones de S12/S13 (hooks,
`ApiError`, gating por permiso en servidor, UI solo cosmética).

**Alternativas**: página dedicada `/budget/lines/:id` (posible, pero un modal mantiene el
contexto de la tabla; se decide en implementación según ergonomía).
