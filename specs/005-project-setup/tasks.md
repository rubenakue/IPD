---
description: "Task list — Setup de proyecto (S12)"
---

# Tasks: Setup de proyecto (crear proyecto y configurar agentes)

**Input**: Design documents from `/specs/005-project-setup/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluidos. Los tests de integración de servidor son clave por el criterio de seguridad
(un no-PM no gestiona agentes) y por el reto RLS de creación. La función pura de reparto se testea.
No es TDD estricto (eso es solo para EVM/FRC/applyChange).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ir en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: US1 / US2 (solo en fases de historia)

## Path Conventions

Monorepo único (ADR-001): backend `src/server/`, frontend `src/`, tests `tests/server/` y
`tests/frontend/`. Sin migración de tablas; sí migración SQL additiva de políticas RLS.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: contratos y andamiaje compartidos. Sin dependencias nuevas (todo ya instalado).

- [x] T001 Añadir los contratos de S12 a `src/types/api.ts`: `CreateProjectRequest`, `CreateProjectResponse`, `AgentView`, `AddAgentRequest`, `UpdateAgentRequest`, `ProjectAgentsResponse` (con `agents`, `shareSum`, `isComplete`), reutilizando `ProjectRoleCode`.
- [x] T002 [P] Crear el esqueleto de la función pura `validateShareSplit` en `src/lib/agents/share-split.ts` (firma + tipo de retorno `{ sum, isComplete }`; cuerpo mínimo).

**Checkpoint**: tipos compartidos disponibles para back y front.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: piezas que bloquean ambas historias (validación pura, contexto RLS de creación y
políticas RLS). **Ninguna historia empieza hasta completar esta fase.**

- [x] T003 [P] Test de unidad de `validateShareSplit` en `tests/agents/share-split.test.ts`: casos suma 100, ≠100 (90/110), conjunto vacío, agentes a 0% (PM/observador) que no rompen el total.
- [x] T004 Implementar `validateShareSplit` en `src/lib/agents/share-split.ts` hasta poner T003 en verde (suma de `sharePercent`, `isComplete = sum === 100`).
- [x] T005 Extender `src/server/db/rls.ts` con una variante de contexto **sin** `projectId` (`withUserRlsContext`, solo `SET LOCAL ipd.current_user_id`) para el bootstrap de creación de proyecto (research D1), sin romper `withRlsContext` existente.
- [x] T006 Migración SQL additiva `20260626120000_project_creation_rls`: helper `app_project_has_no_agents` (SECURITY DEFINER) + política `Project_insert_bootstrap` (INSERT con usuario presente) + `Agent_insert_bootstrap` (auto-alta PM solo si el proyecto no tiene agentes aún — evita auto-añadirse a proyectos ajenos). Phase/UPDATE activePhase ya cubiertos por S10 tras insertar el Agent PM. Aplicada con `prisma migrate deploy`.

**Checkpoint**: reparto validable, contexto y políticas RLS listas para crear bajo `ipd_app`.

---

## Phase 3: User Story 1 — Crear un proyecto IPD (Priority: P1) 🎯 MVP

**Goal**: un usuario autenticado crea un proyecto, queda como PM y se generan sus 4 fases (Validación activa).

**Independent Test**: login con un usuario del seed → "Nuevo proyecto" → aparece en su listado con rol PM y, al entrar, tiene 4 fases con Validación activa (quickstart V1, V2).

### Tests for User Story 1 ⚠️

- [x] T007 [P] [US1] Test de integración en `tests/server/create-project.test.ts`: crear proyecto bajo contexto de usuario → existe Project + 4 Phases (Validación activa) + Agent PM del creador + audit `project.created`; código duplicado → `CONFLICT`; body inválido → `VALIDATION_ERROR`. Verifica que se ejecuta bajo RLS (`ipd_app`). **4/4 verde.**

### Implementation for User Story 1

- [x] T008 [US1] Creación transaccional en `src/server/projects/create-project.ts`: Project y Agent PM con `$executeRaw` SIN RETURNING (el RETURNING del ORM dispara la SELECT policy y falla en el bootstrap) → luego 4 Phases (createMany) → UPDATE activePhaseId=VALIDATION; ids con `randomUUID`; comprobación previa de unicidad del código; `project.created` best-effort.
- [x] T009 [US1] `POST /api/projects` (con `requireAuth` + Zod) en `src/server/routes/projects.ts`, delegando en `create-project.ts`; conflicto de código → `CONFLICT` (P2002/P2010).
- [ ] T010 [P] [US1] Hook `useCreateProject` en `src/hooks/useCreateProject.ts` (mutation → `POST /api/projects`; al éxito invalida `['me']`).
- [ ] T011 [US1] `NewProjectPage` en `src/pages/NewProjectPage.tsx` con `@mantine/form` (nombre, código, **cliente** obligatorios; descripción opcional), manejo de error (código duplicado) y navegación a `/projects/:id/agents` al crear.
- [ ] T012 [US1] Enlazar la creación en la UI: botón "Nuevo proyecto" en `src/pages/ProjectsPage.tsx` y ruta `/projects/new` (protegida) en `src/App.tsx`.

**Checkpoint**: crear proyecto funcional de extremo a extremo (MVP del flujo A).

---

## Phase 4: User Story 2 — Configurar los agentes del proyecto (Priority: P2)

**Goal**: el PM añade/edita agentes (usuario existente por email, rol, % FRC, honorarios) con validación de suma 100% al confirmar.

**Independent Test**: sobre un proyecto, el PM añade agentes por email existente; email inexistente se rechaza; un no-PM no puede; la suma 100% habilita confirmar (quickstart V3–V9).

### Tests for User Story 2 ⚠️

- [ ] T013 [P] [US2] Test de integración en `tests/server/project-agents.test.ts`: añadir agente con email existente (audit `agent.added`); email inexistente → rechazo sin crear usuario; **no-PM → `FORBIDDEN`** (verificado contra servidor); usuario ya agente → `CONFLICT`; varios agentes del mismo rol permitidos; `sharePercent` fuera de 0–100 / honorarios negativos → `VALIDATION_ERROR`.

### Implementation for User Story 2

- [ ] T014 [US2] Implementar la lógica de agentes en `src/server/projects/agents.ts`: listar (con `shareSum`/`isComplete` vía `validateShareSplit`), resolver usuario por email (rechazo si no existe), añadir y editar; conversión euros→céntimos en el borde; todo bajo `withRlsContext`.
- [ ] T015 [US2] Añadir `GET`/`POST`/`PATCH` `/api/projects/:projectId/agents` en `src/server/routes/projects.ts` (`GET` con `project.view`; `POST`/`PATCH` con `requireProjectPermission('agent.manage')`), delegando en `agents.ts`.
- [ ] T016 [P] [US2] Hooks en `src/hooks/`: `useProjectAgents` (query `['project-agents', projectId]`), `useAddAgent` y `useUpdateAgent` (mutations que invalidan esa query).
- [ ] T017 [US2] `ProjectAgentsPage` en `src/pages/ProjectAgentsPage.tsx`: tabla de agentes + formulario de alta/edición (`@mantine/form`), aviso de suma en vivo con `validateShareSplit`, y botón "Confirmar" deshabilitado si la suma ≠ 100%.
- [ ] T018 [US2] Conectar la ruta real `/projects/:projectId/agents` a `ProjectAgentsPage` en `src/App.tsx` (sustituye el placeholder de la sección "Agentes" del SideNav de S11).

**Checkpoint**: flujo A completo (crear proyecto → configurar agentes con suma validada).

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T019 [P] [US2] (Opcional) Test de UI en `tests/frontend/project-agents.test.tsx`: el botón "Confirmar" se habilita solo cuando la suma de reparto es 100%.
- [ ] T020 Verificar auditoría (`project.created`, `agent.added`) sin datos sensibles (quickstart V8).
- [ ] T021 `pnpm typecheck` + `pnpm lint` + `pnpm test` en verde; sin `console.log` ni código muerto.
- [ ] T022 Ejecutar la validación de `quickstart.md` (V1–V9) en el navegador, incluida V7 (no-PM → `FORBIDDEN`) verificada contra el servidor.
- [ ] T023 Entrada en `docs/diario.md` cerrando S12.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. BLOQUEA ambas historias (validación, RLS).
- **US1 (Phase 3)**: depende de Foundational. MVP.
- **US2 (Phase 4)**: depende de Foundational; en la práctica se prueba sobre un proyecto creado por US1.
- **Polish (Phase 5)**: depende de las historias completadas.

### User Story Dependencies

- **US1 (P1)**: independiente tras Foundational.
- **US2 (P2)**: usa el proyecto creado en US1 para su prueba de extremo a extremo, pero su lógica (añadir agentes) es testeable de forma aislada con un proyecto sembrado.

### Within Each User Story

- Tests de integración antes de dar por buena la implementación.
- Lógica de servicio (`create-project.ts`/`agents.ts`) antes que las rutas; rutas antes que el frontend.

### Parallel Opportunities

- Setup: T002 en paralelo con T001.
- Foundational: T003 (test) en paralelo con la preparación de T005/T006.
- US1: T007 (test) y T010 (hook) en paralelo con la lógica de servidor.
- US2: T013 (test) y T016 (hooks) en paralelo con `agents.ts`.

---

## Implementation Strategy

### MVP First (US1)

1. Setup → 2. Foundational (incluida la migración RLS, lo más delicado) → 3. US1 (crear proyecto).
4. **STOP y validar** V1/V2 (crear proyecto → listado con PM → 4 fases).

### Incremental Delivery

1. Setup + Foundational → base lista (validación + RLS).
2. + US1 → crear proyecto demostrable (MVP del flujo A).
3. + US2 → configurar agentes con suma 100% → flujo A completo.

---

## Notes

- [P] = archivos distintos sin dependencias pendientes.
- La seguridad se valida en servidor: `agent.manage` (solo PM) + RLS; el test de no-PM (T013) es innegociable.
- El reto técnico es T005/T006 (crear bajo RLS): abordar con el test T007 como red de seguridad.
- Commit por unidad lógica (Conventional Commits, en inglés). Nunca `--no-verify`.
- La invitación de usuarios por email inexistente NO se implementa aquí (spec 006 / issue #37).
