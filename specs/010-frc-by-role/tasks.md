# Tasks: FRC servido por rol (flujo G parcial)

**Feature**: `specs/010-frc-by-role/` · **Branch**: `s16-frc-by-role`
**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md),
[quickstart.md](./quickstart.md)

Convención: `- [ ] [TaskID] [P?] [Story?] descripción con ruta`. `[P]` = paralelizable.
Dinero en céntimos. **Sin migración** (el modelo `Agent` ya lleva `sharePercent`/
`guaranteedFee`/`feeAtRisk`). `calculateFRC` (S3) **no se toca**. La lógica pura se hace en TDD.

---

## Phase 1 — Setup (contratos compartidos)

- [x] T001 [P] Añadir a `src/types/api.ts`: `FrcFundStatus = 'bonus' | 'neutral' | 'malus'`;
  `FrcVisibility = 'global' | 'own' | 'aggregate'`; `FrcAgentRow` (agentId, displayName,
  role: ProjectRoleCode, bonusMalusCents, guaranteedFeeCents, totalCents); base con
  `budgetStatus: BudgetStatusCode | null` y `fundStatus`; `FrcGlobalResponse` (visibility
  'global', deviationCents, agents: FrcAgentRow[]); `FrcOwnResponse` (visibility 'own',
  deviationCents, own: FrcAgentRow | null); `FrcAggregateResponse` (visibility 'aggregate',
  sin deviationCents/agents/own); y la unión `ProjectFrcResponse`.

---

## Phase 2 — Foundational (bloquea las US) — lógica pura (TDD)

**⚠️ Es el corazón del innegociable de seguridad (Principio V): el filtrado por rol.**

- [x] T002 [P] Escribir `tests/frc-visibility.test.ts` (rojo): `fundStatusFromDeviation` (>0
  bonus, <0 malus, 0 neutral); `projectFrcForRole(result, requester, agents)` produce
  `visibility` correcta por rol — PROMOTER/PROJECT_MANAGER → `global` con todas las filas y
  `deviationCents`; DESIGNER/CONSTRUCTOR con fila propia → `own` con su fila + `deviationCents`;
  DESIGNER/CONSTRUCTOR al 0 % → `aggregate` (FR-011); OBSERVER → `aggregate` **sin** las claves
  `deviationCents`/`agents`/`own` (SC-004); la salida `own` **nunca** contiene la fila de otro agente (SC-003); en `global`,
  `Σ agents[].bonusMalusCents === deviationCents` (SC-002).
- [x] T003 Implementar `src/lib/frc/visibility.ts` (verde): `fundStatusFromDeviation(cents)`
  y `projectFrcForRole(result: FrcResult, requester: {role, agentId}, agents)` puros (sin I/O),
  que mapean la salida de `calculateFRC` a `ProjectFrcResponse` según la matriz
  (`hasPermission(role, 'frc.global.view'|'frc.own.view')`). Reutiliza `hasPermission` de
  `src/server/permissions/matrix.ts` (o recibe los flags ya resueltos para mantener la pureza).

---

## Phase 3 — US1 · Consultar el FRC filtrado por rol desde la API (P1) 🎯 MVP

**Objetivo**: tres logins distintos → tres respuestas distintas del **mismo** endpoint, con el
filtrado en el servidor. **Test independiente**: sobre un presupuesto aprobado con desviación
conocida, promotor/constructor/observador reciben `global`/`own`/`aggregate` coherentes con §9.5,
verificable contra la API cruda.

- [x] T004 [US1] Crear `src/server/projects/frc.ts` con `getProjectFrc(prisma, userId, projectId,
  requester)`: bajo `withRlsContext`, carga el presupuesto; si no está **APPROVED** → respuesta
  "sin datos" (`fundStatus: 'neutral'`, sin filas, `budgetStatus` real). Si aprobado: calcula
  **vigente total** y **previsión total** reutilizando `deriveBudgetLine` + `summarizeEconomics`
  (S15); carga los `Agent` del proyecto con su `user` (displayName), filtra a partes del fondo
  (PROMOTER/CONSTRUCTOR/DESIGNER con `sharePercent > 0`), arma `AgentFrcTerms[]`, llama a
  `calculateFRC(...)`, y proyecta con `projectFrcForRole(result, requester, agents)` mapeando cada
  fila a `FrcAgentRow` (displayName + rol expuesto).
- [x] T005 [US1] En `src/server/routes/projects.ts`: `GET /projects/:projectId/frc` con
  `requireAuth` + `requireProjectPermission(prisma, 'project.view')` (deja pasar al observador,
  deniega al no-agente → FR-004); pasa `req.projectAgent` (role + agentId) a `getProjectFrc`.
- [x] T006 [US1] `tests/server/project-frc.test.ts` (integración, RLS): con presupuesto aprobado y
  desviación conocida — promotor → `global` con todos los agentes y `Σ bonusMalus == deviationCents`
  (SC-002); constructor → `own` con su fila, **sin** `agents` y sin la fila de otros (SC-003);
  observador → `aggregate` **sin** `deviationCents`/`agents`/`own` (SC-004); no-agente → `NOT_FOUND`
  (SC-005); agente al 0 % (p. ej. un designer 0 %) → `aggregate` sin importes (FR-011);
  presupuesto en DRAFT → `fundStatus: 'neutral'` sin filas.

**Checkpoint US1**: endpoint filtrado por rol demostrable solo con la API (MVP entregable).

---

## Phase 4 — US2 · Ver el FRC en el frontend según mi rol (P2)

**Objetivo**: la vista de FRC muestra cuadro completo / propio / agregado según el rol,
consumiendo el endpoint filtrado. **Test independiente**: por rol, la vista renderiza el
contenido correcto y el estado del fondo.

- [x] T007 [P] [US2] Hook `src/hooks/useProjectFrc.ts` (TanStack Query, clave `['project-frc',
  projectId]`) que consume `GET /projects/:projectId/frc` y devuelve `ProjectFrcResponse`.
- [x] T008 [US2] Crear `src/pages/ProjectFrcPage.tsx`: render por `visibility` —
  `global`: tabla de agentes (nombre, rol, bonus/malus, honorarios, total) + desviación total +
  badge de estado; `own`: tarjeta con su resultado + desviación + estado; `aggregate`: solo el
  badge de estado (bonus/neutro/malus) y, si aplica, aviso "no participas en el fondo".
  UI en español; céntimos → euros solo en presentación. Estados de carga/vacío (sin presupuesto
  aprobado → mensaje).
- [x] T009 [US2] Enrutar la sección: en `src/lib/sections.ts` marcar `frc` como `ready: true`; en
  `src/App.tsx` excluir `'frc'` del filtro de placeholders y añadir la ruta real
  `path="frc"` → `<ProjectFrcPage/>`.
- [x] T010 [P] [US2] `tests/frontend/project-frc.test.tsx` (jsdom): mockeando cada forma de
  respuesta, la vista renderiza el cuadro completo (global), la tarjeta propia (own) y el badge
  agregado (aggregate), y muestra el estado del fondo.

**Checkpoint US2**: vista de FRC role-aware funcionando sobre el endpoint filtrado.

---

## Phase 5 — Polish & cross-cutting

- [x] T011 [P] Sin `console.log` ni código muerto; `pnpm typecheck` + `pnpm lint` + `pnpm test`
  en verde.
- [x] T012 Validar en navegador según `quickstart.md`: login como promotor, constructor y
  observador sobre el proyecto demo (presupuesto aprobado con desviación) y comprobar las tres
  vistas; capturar evidencia.
- [x] T013 [P] Anotar la sesión S16 en `docs/diario.md`.

---

## Dependencias y orden

- **Setup (T001)** → **Foundational (T002–T003)** bloquean las US.
- **US1 (T004–T006)** = MVP; el endpoint depende de la función pura (T003) y de los tipos (T001).
- **US2 (T007–T010)** tras US1 (la vista consume el endpoint filtrado).
- **Polish (T011–T013)** al final.

Orden TDD: T002 (rojo) → T003 (verde). Los tests de integración/UI acompañan a su US.

## Ejecución en paralelo (ejemplos)

- T002 (test puro) mientras se perfila T001 (tipos).
- US1: el test de servidor T006 se escribe junto a T004–T005 (comparten `frc.ts`/`projects.ts` →
  secuencial entre T004 y T005).
- US2: T007 (hook) y T010 (test UI) son `[P]` respecto a T008/T009.

## MVP y entrega incremental

- **MVP = US1**: el endpoint filtrado por rol ya demuestra el innegociable (tres logins → tres
  respuestas) sin necesidad de frontend.
- Incremento 1: + US2 (la vista role-aware).

## Validación de formato

Todas las tareas: checkbox `- [ ]`, ID `T0NN`, `[US?]` en fases de historia, `[P]` donde aplica,
y ruta de archivo concreta. ✅
