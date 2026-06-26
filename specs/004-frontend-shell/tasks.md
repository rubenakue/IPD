---
description: "Task list — Frontend shell (S11)"
---

# Tasks: Frontend shell (login, proyectos y navegación)

**Input**: Design documents from `/specs/004-frontend-shell/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-consumed.md, quickstart.md

**Tests**: incluidos (tests de UI aprobados — Testing Library + jsdom). No es TDD estricto (eso aplica
solo a los 3 cálculos); aquí los tests cubren el flujo de login y el guard de sesión.

**Organization**: por historia de usuario (US1 → US2 → US3), en orden de prioridad.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ir en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: US1 / US2 / US3 (solo en fases de historia)

## Path Conventions

Monorepo único (ADR-001): frontend en `src/` (entrypoint en la raíz), backend en `src/server/`
(intacto), tests en `tests/frontend/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: instalar el frontend y dejar la SPA arrancando en blanco.

- [x] T001 Proponer e instalar dependencias base React/Vite (ADR-001): `pnpm add react react-dom` y `pnpm add -D vite @vitejs/plugin-react @types/react @types/react-dom`
- [x] T002 Instalar dependencias de UI/estado/routing aprobadas por ADR: `pnpm add @mantine/core @mantine/hooks @mantine/form @mantine/notifications @tanstack/react-query react-router` y `pnpm add -D postcss postcss-preset-mantine postcss-simple-vars`
- [x] T003 Instalar dependencias de test de UI (aprobadas 2026-06-26): `pnpm add -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`
- [x] T004 Crear `index.html` en la raíz (div `#root` + `<script type="module" src="/src/main.tsx">`)
- [x] T005 [P] Crear `vite.config.ts` con `@vitejs/plugin-react` y `server.proxy` de `/api` → backend Express (research D1)
- [x] T006 [P] Crear `postcss.config.cjs` con `postcss-preset-mantine` y `postcss-simple-vars`
- [x] T007 [P] Añadir scripts `dev`, `build`, `preview` (Vite) a `package.json` sin tocar los scripts de backend/test existentes
- [x] T008 Ajustar `tsconfig.json` para el frontend (`jsx: react-jsx`, `lib` con `DOM`/`DOM.Iterable`) sin romper `pnpm typecheck` del backend
- [x] T009 Crear `src/main.tsx` mínimo que monte React en `#root` (sin providers aún) y verificar que `pnpm dev` sirve una página en blanco

**Checkpoint**: la SPA arranca con Vite y el proxy enruta `/api`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: piezas transversales que todas las historias necesitan.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta completar esta fase.

- [x] T010 [P] Implementar el cliente fetch en `src/lib/api/client.ts`: `credentials: 'include'`, base `/api`, parseo de `ApiErrorResponse` (§14.3) a un error tipado (`ApiError`) reutilizando tipos de `src/types/api.ts`
- [x] T011 [P] Crear helper de roles en `src/lib/roles.ts`: mapeo `ProjectRoleCode` → etiqueta UI en español (data-model)
- [x] T012 Configurar el entorno de test de UI: `tests/frontend/setup.ts` (matchers de `@testing-library/jest-dom`) y entorno `jsdom` en la config de Vitest, sin afectar a los tests de cálculo existentes
- [x] T013 Crear el tema Mantine en `src/theme.ts` (tokens mínimos; mockups de `docs/diseño` como referencia visual, research D5)
- [x] T014 Montar providers en `src/main.tsx`: `MantineProvider` (con `theme`), `QueryClientProvider` (TanStack Query) y `BrowserRouter` (React Router v7), envolviendo `<App/>`
- [x] T015 Crear `src/App.tsx` con el esqueleto de rutas (placeholders de elementos): `/login`, `/projects`, `/projects/:projectId/*`, y 404

**Checkpoint**: cliente API, providers y mapa de rutas listos.

---

## Phase 3: User Story 1 — Iniciar sesión (Priority: P1) 🎯 MVP

**Goal**: el usuario se autentica contra la API y obtiene sesión; errores claros en español.

**Independent Test**: con un usuario del seed, login correcto abre sesión; credenciales inválidas
muestran "Email o contraseña incorrectos." (quickstart V1, V2).

### Tests for User Story 1 ⚠️

- [x] T016 [P] [US1] Test del hook/login flow en `tests/frontend/login.test.tsx`: envío correcto → callback de éxito; respuesta 401 → mensaje de error, sin distinguir campo (FR-005)

### Implementation for User Story 1

- [x] T017 [P] [US1] Hook `useLogin` en `src/hooks/useLogin.ts` (mutation TanStack Query → `POST /api/auth/login`; invalida `['me']` al éxito)
- [x] T018 [US1] `LoginPage` en `src/pages/LoginPage.tsx` con `@mantine/form` (email + contraseña, validación de UX), estado de envío y render del error de la API en español
- [x] T019 [US1] Conectar la ruta `/login` en `src/App.tsx` a `LoginPage` y redirigir a `/projects` tras login correcto
- [x] T020 [US1] Hook `useLogout` en `src/hooks/useLogout.ts` (mutation → `POST /api/auth/logout`; limpia la caché de TanStack Query) — usado por el shell en US3 (FR-004)

**Checkpoint**: login funcional de extremo a extremo (MVP).

---

## Phase 4: User Story 2 — Ver mis proyectos con mi rol (Priority: P2)

**Goal**: tras autenticarse, el usuario ve solo sus proyectos con su rol y entra a uno; rutas privadas protegidas.

**Independent Test**: dos usuarios distintos ven listados distintos; sin sesión, una ruta privada
redirige a `/login`; usuario sin proyectos ve estado vacío (quickstart V3, V4, V5).

### Tests for User Story 2 ⚠️

- [x] T021 [P] [US2] Test del guard en `tests/frontend/protected-route.test.tsx`: `['me']` no autenticado → redirección a `/login`; autenticado → render del hijo (FR-003)

### Implementation for User Story 2

- [x] T022 [P] [US2] Hook `useCurrentUser` en `src/hooks/useCurrentUser.ts` (query `['me']` → `GET /api/me`; expone usuario + `projects[]`)
- [x] T023 [US2] `ProtectedRoute` en `src/components/ui/ProtectedRoute.tsx`: estado de carga; 401 → `Navigate` a `/login`; OK → `Outlet` (research D4)
- [x] T024 [P] [US2] Componentes de estado en `src/components/ui/StatePanels.tsx`: carga, vacío y error con reintento (FR-009, FR-014)
- [x] T025 [US2] `ProjectsPage` en `src/pages/ProjectsPage.tsx`: lista `projects[]` con nombre, código y `RoleBadge`; estado vacío; cada fila entra a `/projects/:id/dashboard`
- [x] T026 [US2] Proteger `/projects` y `/projects/:projectId/*` con `ProtectedRoute` en `src/App.tsx`

**Checkpoint**: login → listado de proyectos por usuario, con rutas privadas protegidas.

---

## Phase 5: User Story 3 — Marco de navegación con contexto (Priority: P3)

**Goal**: dentro de un proyecto, cabecera persistente (proyecto/fase/rol) + menú lateral con la
estructura completa; secciones no implementadas como "Próximamente".

**Independent Test**: al entrar en un proyecto, la cabecera muestra proyecto y rol (fase neutra);
el menú lateral navega entre secciones manteniendo contexto; secciones sin implementar muestran
"Próximamente"; se puede volver al listado y cerrar sesión (quickstart V6, V7, V8).

### Implementation for User Story 3

- [x] T027 [P] [US3] `RoleBadge` en `src/components/domain/RoleBadge.tsx` (etiqueta de rol en español vía `src/lib/roles.ts`)
- [x] T028 [US3] `ProjectContext` en `src/context/ProjectContext.tsx`: deriva el proyecto activo de `projects[]` por `:projectId`; si no pertenece al usuario, no muestra datos (FR-007, FR-016)
- [x] T029 [P] [US3] `ProjectContextHeader` en `src/components/domain/ProjectContextHeader.tsx`: nombre de proyecto, rol y fase en estado neutro "—" (research D3, FR-010)
- [x] T030 [P] [US3] `SideNav` en `src/components/domain/SideNav.tsx`: estructura completa de módulos (§6.1); secciones no implementadas marcadas como "Próximamente" (FR-011, FR-011a)
- [x] T031 [US3] `AppLayout` en `src/components/ui/AppLayout.tsx` con Mantine `AppShell` (header + navbar) componiendo `ProjectContextHeader` y `SideNav`, con acción de volver a `/projects` y botón de cerrar sesión (usa `useLogout`)
- [x] T032 [P] [US3] `ProjectDashboardPage` (placeholder "Próximamente") en `src/pages/ProjectDashboardPage.tsx`
- [x] T033 [P] [US3] `SectionPlaceholderPage` (placeholder genérico por sección) en `src/pages/SectionPlaceholderPage.tsx`
- [x] T034 [US3] Montar el layout `/projects/:projectId` con `AppLayout` + `ProjectContext` en `src/App.tsx`: `index` → dashboard; rutas hijas (budget, real-costs, frc, changes, risks, incidents, decisions, agents, settings) → `SectionPlaceholderPage`

**Checkpoint**: shell navegable completo con contexto y placeholders.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T035 [P] `NotFoundPage` en `src/pages/NotFoundPage.tsx` y ruta comodín en `src/App.tsx`
- [x] T036 Manejo global de sesión expirada: el cliente API señaliza `UNAUTHENTICATED` y la app redirige a `/login` con aviso (FR-013, quickstart V9)
- [x] T037 Verificar accesos directos a proyecto ajeno/inexistente (FR-007, `AppLayout`) y servidor caído (FR-014, `ErrorState`) — implementado; verificación en vivo en T039
- [x] T038 `pnpm typecheck` + `pnpm lint` + `pnpm test` en verde (48/48); sin `console.log` ni código muerto
- [x] T039 Validación en navegador (smoke test 2026-06-26): V1 login, V3 guard, V4 listado por rol, V6 dashboard+contexto, V7 menú lateral, V8 logout — OK con `promotor@ipd.demo`. V2/V5/V9/V10 cubiertos por tests/diseño.
- [x] T040 Entrada en `docs/diario.md` cerrando S11

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. BLOQUEA todas las historias.
- **US1 (Phase 3)**: depende de Foundational. MVP.
- **US2 (Phase 4)**: depende de Foundational; usa `useLogin`/`/me` pero es testeable aparte.
- **US3 (Phase 5)**: depende de Foundational; integra `useCurrentUser` (US2) y `useLogout` (US1).
- **Polish (Phase 6)**: depende de las historias deseadas completas.

### User Story Dependencies

- **US1 (P1)**: independiente tras Foundational.
- **US2 (P2)**: independiente tras Foundational (comparte el cliente API).
- **US3 (P3)**: se apoya en piezas de US1 (logout) y US2 (`useCurrentUser`); su valor completo llega tras ellas.

### Within Each User Story

- Los tests marcados se escriben antes de dar por buena la implementación.
- Hooks/cliente antes que páginas; páginas antes que integración de rutas.

### Parallel Opportunities

- Setup: T005, T006, T007 en paralelo.
- Foundational: T010, T011 en paralelo (archivos distintos).
- US1: T016 y T017 en paralelo.
- US2: T021, T022, T024 en paralelo.
- US3: T027, T029, T030, T032, T033 en paralelo (componentes/páginas independientes).

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 (Setup) → 2. Phase 2 (Foundational) → 3. Phase 3 (US1, login).
4. **STOP y validar** login (quickstart V1, V2). Demo posible.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. + US1 (login) → validar → MVP.
3. + US2 (listado de proyectos + guard) → validar → cumple el criterio del hito S11.
4. + US3 (shell de navegación) → validar → H5/S11 completo.

---

## Notes

- [P] = archivos distintos sin dependencias pendientes.
- La seguridad NO se implementa en el frontend (FR-016): el guard solo reacciona a 401/403 del servidor.
- Commit por unidad lógica (Conventional Commits, en inglés). Nunca `--no-verify`.
- Parar en cualquier checkpoint para validar la historia de forma independiente.
