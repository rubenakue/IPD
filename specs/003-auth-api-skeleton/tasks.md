---
description: "Task list for feature: Autenticación y roles por proyecto"
---

# Tasks: Autenticación y roles por proyecto

**Input**: Design documents from `specs/003-auth-api-skeleton/`

**Prerequisites**: plan.md ✓, spec.md ✓, quickstart.md ✓ (no hay data-model/research/contracts; ver plan.md)

**Tests**: la constitución exige TDD solo en los 3 cálculos puros. Esta feature no los toca. Se incluye **un** test de integración del contrato HTTP (US4) como red de regresión de SC-001/SC-002 (no TDD-first): `[TEST]`.

## Reparto por sesión

- **S08 (esta sesión)** = Phase 1 (Setup) + Phase 2 (Foundational = US4, contrato HTTP).
- **S09** = Phase 3 (US1, login/sesión).
- **S10** = Phase 4 (US2) + Phase 5 (US3), permisos en dos capas.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ir en paralelo (archivos distintos, sin dependencias).
- **[Story]**: a qué User Story sirve (US1–US4).

---

## Phase 1: Setup (S08) — infraestructura compartida

- [x] T001 Proponer (gate) e instalar dependencias: `express` y `zod` (prod), `@types/express` y `@types/node` (dev). `express-session`/`connect-pg-simple` NO (son de S09). En `package.json`.
- [x] T002 [P] Añadir script `"dev:server": "node --env-file=.env --experimental-strip-types --watch src/server/index.ts"` en `package.json`.
- [ ] T003 [P] Documentar `PORT=3000` en `.env.example` (sin secretos) y reflejarlo en `.env` local. ⚠️ **Pendiente**: en esta sesión `.env*` está bloqueado por permisos (lectura y escritura); lo añade Rubén. No bloquea S08: `config.ts` usa `PORT=3000` por defecto.
- [x] T004 [P] Añadir `"prisma"` al `include` de `tsconfig.json` para que `pnpm typecheck` cubra `prisma/seed.ts` (habilitado por `@types/node`).
- [x] T005 Crear el árbol de carpetas de `src/server/` (`routes/`, `middlewares/`, `errors/`).

**Checkpoint**: dependencias listas, `pnpm typecheck` sigue verde (incl. `seed.ts`), estructura creada.

---

## Phase 2: Foundational — US4 Contrato HTTP base (S08) 🎯 entrega de la sesión

**Goal**: una API Express bajo `/api` que arranca, responde a `/api/health` y devuelve todos sus errores con el formato §14.3 a través de un middleware único, con validación Zod lista.

**Independent Test**: `curl /api/health` → `{status:"ok"}`; ruta inexistente → `NOT_FOUND`; entrada inválida (test) → `VALIDATION_ERROR`; toda respuesta de error con la forma `{error:{code,message,details}}`.

- [x] T006 [P] [US4] `src/types/api.ts`: tipo `ErrorCode` (unión cerrada §14.3) y forma `ApiErrorResponse = { error: { code, message, details } }`. Contrato compartido con el frontend (no en `domain.ts`).
- [x] T007 [P] [US4] `src/server/errors/api-error.ts`: clase `ApiError` (`code`, `httpStatus`, `message`, `details`), mapa `ERROR_STATUS` (code→HTTP) y helpers (`ApiError.notFound`, `.unauthenticated`, `.forbidden`, `.validation`).
- [x] T008 [US4] `src/server/config.ts`: leer y validar `process.env` con Zod (`PORT` entero, default 3000; `NODE_ENV`). Falla clara si la config es inválida.
- [x] T009 [US4] `src/server/middlewares/error-handler.ts`: middleware final que traduce `ApiError` / `ZodError` / error desconocido al formato §14.3; `INTERNAL_ERROR` genérico sin filtrar trazas (FR-020); log del error real en servidor.
- [x] T010 [P] [US4] `src/server/middlewares/not-found.ts`: 404 de ruta no resuelta → `ApiError.notFound()`.
- [x] T011 [P] [US4] `src/server/middlewares/validate.ts`: `validate(schema)` que valida `params`/`query`/`body` con Zod y delega el `ZodError` al error handler como `VALIDATION_ERROR` (pieza reutilizable para S09).
- [x] T012 [P] [US4] `src/server/routes/health.ts`: `GET /health` → `200 { status: 'ok' }` (sin envoltorio, sin auth, sin BD).
- [x] T013 [US4] `src/server/app.ts`: `createApp()` que monta el JSON parser, el router `/api` (con `/health`), el `not-found` y el `error-handler` en orden; devuelve la app sin escuchar. (Depende de T007–T012.)
- [x] T014 [US4] `src/server/index.ts`: importa `createApp()` y `loadConfig()`, hace `app.listen(PORT)` con log de arranque. (Depende de T008, T013.)
- [x] T015 [TEST] [US4] `tests/server/contract.test.ts`: con `fetch` nativo y `app.listen(0)` (puerto efímero), verifica health, `NOT_FOUND`, `VALIDATION_ERROR` (montando `validate` en una app de prueba) y la forma del error. Sin `supertest`.

**Checkpoint (Hecho de S08)**: `curl localhost:3000/api/health` responde; un error devuelve el JSON estándar; `pnpm typecheck`, `pnpm lint` y `pnpm test` pasan.

---

## Phase 3: US1 — Iniciar y mantener una sesión segura (S09)

**Goal**: login/logout/me con sesión en Postgres y cookie `httpOnly`.

- [ ] T016 [US1] Proponer e instalar `express-session` + `connect-pg-simple` (+ tipos). Mini-decisión/diario.
- [ ] T017 [US1] Capa de acceso a datos `src/lib/db` (cliente Prisma con `@prisma/adapter-pg`, `DATABASE_URL`).
- [ ] T018 [US1] Middleware de sesión (store en Postgres, cookie `httpOnly`, `secure` según entorno).
- [ ] T019 [US1] `POST /api/login` (valida con Zod, verifica argon2, abre sesión; error genérico si falla — FR-005).
- [ ] T020 [US1] `POST /api/logout` (invalida la sesión).
- [ ] T021 [US1] `GET /api/me` (identidad + proyectos donde participa — FR-004).
- [ ] T022 [US1] Middleware `requireAuth` (no autenticado → `UNAUTHENTICATED`).
- [ ] T023 [TEST] [US1] Tests de login OK / credenciales inválidas / sesión / logout.

**Checkpoint**: SC-003 y SC-007 verificables.

---

## Phase 4: US2 — Permisos por rol aplicados en servidor (S10)

**Goal**: la matriz §15 aplicada en servidor; el constructor no recibe costes privados del promotor.

- [ ] T024 [US2] Resolver el `Agent` (rol) del usuario en el proyecto de la ruta.
- [ ] T025 [US2] Middleware `requireRole(...)` / `requirePermission(action)` derivado de la matriz §15.
- [ ] T026 [US2] Tabla/мodelo de permisos (acción × rol) como única fuente de verdad, alineada con §15.
- [ ] T027 [US2] Red de seguridad **RLS** en Postgres (políticas por proyecto/rol; `SET LOCAL` con la identidad).
- [ ] T028 [US2] Garantizar exclusión de costes privados del promotor en la respuesta (FR-009), no solo en UI.
- [ ] T029 [TEST] [US2] Tests por rol contra la matriz §15 (incl. el caso constructor vs costes privados).

**Checkpoint**: SC-004 y SC-006 verificables.

---

## Phase 5: US3 — El rol pertenece al proyecto, no a la persona (S10)

**Goal**: `User ≠ Agent`; mismo usuario con roles distintos por proyecto; solo ve sus proyectos.

- [ ] T030 [US3] Listado de proyectos filtrado por participación (`Agent` activo) — FR-011.
- [ ] T031 [US3] Resolución de rol por proyecto sin estado global (FR-007/FR-012).
- [ ] T032 [TEST] [US3] Test: misma cuenta, PM en A y Observador en B, permisos correctos en cada uno.

**Checkpoint**: SC-005 verificable.

---

## Phase 6: Polish & Cross-Cutting (S08 lo que aplica)

- [x] T033 [S08] Mini-**ADR-009** `docs/adr/009-input-validation.md`: elección de Zod (cierra §20.2.1).
- [x] T034 [S08] Entrada en `docs/diario.md`; marcar checkboxes (este `tasks.md` y `docs/roadmap.md` S8).
- [x] T035 [S08] `pnpm typecheck` + `pnpm lint` + `pnpm test` (27/27) verdes. Único `console` añadido: log de arranque (`index.ts`) y log servidor del `INTERNAL_ERROR` (`error-handler.ts`, FR-020), ambos intencionales; sin código muerto.

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: sin dependencias; primero.
- **Phase 2 (Foundational/US4)**: depende de Phase 1. **Es el entregable de S08** y bloquea a US1–US3.
  - T006, T007 en paralelo. T008 tras Zod (T001). T009 tras T007. T010/T011/T012 en paralelo tras T007. T013 tras T007–T012. T014 tras T008+T013. T015 al final.
- **Phase 3 (US1)**: depende de Phase 2 → **S09**.
- **Phases 4–5 (US2, US3)**: dependen de Phase 2 (y se apoyan en US1) → **S10**.
- **Phase 6**: cierre documental de S08 (ADR, diario, checkboxes, validación).

## Notes

- `[P]` = archivos distintos, sin dependencias entre sí.
- `[Story]` mapea cada tarea a su User Story para trazabilidad.
- Commits por unidad lógica, en inglés, Conventional Commits; separar docs de código; nunca `--no-verify`.
- El test `[TEST]` de US4 no es TDD-first (no es uno de los 3 cálculos): es red de regresión del contrato.
