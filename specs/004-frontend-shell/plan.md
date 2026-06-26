# Implementation Plan: Frontend shell (login, proyectos y navegación)

**Branch**: `s11-frontend-shell` | **Date**: 2026-06-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-frontend-shell/spec.md`

## Summary

Montar la primera capa de frontend de la plataforma IPD: una SPA React (Vite) con autenticación
real contra la API existente, listado de proyectos del usuario con su rol, y un marco de
navegación (app shell) con cabecera de contexto y menú lateral. El backend de H4 ya cubre la
autenticación y entrega el usuario con sus proyectos vía `GET /api/me`; esta feature **consume**
esa API y no añade lógica de seguridad ni de negocio en cliente. Enfoque técnico: Vite + React +
TypeScript strict, Mantine para UI/AppShell, TanStack Query para datos de servidor, React Router v7
para rutas, y un proxy de Vite (`/api` → backend) para que la cookie `httpOnly` de sesión viaje en
el mismo origen sin CORS.

## Technical Context

**Language/Version**: TypeScript 5.5 (strict, cero `any`), Node ≥22, ESM (`"type": "module"`).

**Primary Dependencies**: React + ReactDOM, Vite + `@vitejs/plugin-react`, Mantine
(`@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/notifications`; ADR-002),
TanStack Query (`@tanstack/react-query`; ADR-003), React Router v7 (`react-router`; ADR-007).
Tipos de contrato compartidos desde `src/types/api.ts` (ya existente).

**Storage**: N/A en cliente. La fuente de verdad es la API REST (PostgreSQL en servidor). El
estado de servidor lo cachea TanStack Query; el estado de UI usa React nativo (ADR-003).

**Testing**: Vitest (ya instalado). Tests de unidad para piezas puras (cliente API, mapeo de
roles, lógica del guard). Tests de componente/integración de UI requieren dependencias nuevas
(jsdom + Testing Library) → ver "Dependencias a proponer".

**Target Platform**: navegador moderno de escritorio (responsive fino fuera de alcance, por spec).

**Project Type**: Web application — SPA frontend en `src/` + backend Express existente en
`src/server/`, en el mismo repositorio (monorepo único, ADR-001).

**Performance Goals**: flujo login→ver proyectos completable en <1 min (SC-001); carga inicial
de la SPA y respuesta de navegación percibida como instantánea en desarrollo. Sin objetivos
duros de throughput (prototipo).

**Constraints**: cookie de sesión `httpOnly` con `sameSite=lax` (ADR-004/009) → el frontend se
sirve en el mismo origen que la API mediante **proxy de Vite** en desarrollo (sin CORS). El
frontend NO decide visibilidad de datos sensibles (FR-016): confía en el filtrado del servidor.

**Scale/Scope**: ~5 usuarios de seed, pocos proyectos por usuario. Superficie de S11: pantalla de
login, listado de proyectos, layout de proyecto (cabecera + menú lateral), dashboard placeholder y
secciones placeholder "Próximamente". ~5-7 rutas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento en este plan |
|---|---|
| **I. SDD — spec antes que código** | Spec 004 escrita, clarificada y validada antes de este plan. ✅ |
| **II. TDD en los 3 cálculos** | No aplica: el shell no toca `calculateEVM/FRC/applyChange`. No se modifican. ✅ |
| **III. TypeScript strict, cero `any`** | Frontend en TS strict; sin `any` ni `@ts-ignore` nuevos. ✅ |
| **IV. Fidelidad al dominio** | Nombres de entidad en inglés (reutiliza `src/types/api.ts`); UI y textos en español; sin persistir nada derivado (el cliente no calcula ni guarda derivados). Dinero en céntimos no aplica en S11. ✅ |
| **V. Seguridad en el servidor (NON-NEGOTIABLE)** | El frontend no implementa autorización: redirige según respuestas 401/403 y muestra solo lo que el servidor entrega (FR-007, FR-016). Ocultar UI nunca sustituye al filtrado de servidor. ✅ |
| **VI. Trazabilidad y libros abiertos** | `auth.login`/`auth.logout` ya se auditan en backend; el frontend no añade ni elimina auditoría. ✅ |
| **VII. ADRs + diario + lenguaje simple** | Se respetan ADR-001/002/003/004/007 sin cambiarlos. Decisión de integración (proxy de Vite) documentada en `research.md`; si se considera decisión de arquitectura, se elevará a mini-ADR. Diario al cerrar la sesión. ✅ |

**Resultado del gate: PASS.** Sin violaciones; no se requiere *Complexity Tracking*.

**Punto de aprobación previo (Workflow / constitución):** antes de instalar, se proponen las
dependencias nuevas (ver "Dependencias a proponer"). Las de los ADR-002/003/007 ya están
justificadas; React/Vite derivan de ADR-001; Testing Library/jsdom no están en ningún ADR y
requieren visto bueno explícito.

## Project Structure

### Documentation (this feature)

```text
specs/004-frontend-shell/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md        # Fase 1 (/speckit-plan)
├── quickstart.md        # Fase 1 (/speckit-plan)
├── contracts/           # Fase 1 (/speckit-plan)
│   └── api-consumed.md  # Endpoints existentes que el frontend consume
├── checklists/
│   └── requirements.md  # Calidad de spec (ya creado)
└── tasks.md             # Fase 2 (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

Monorepo único (ADR-001). El backend en `src/server/` queda intacto. Se añade el frontend SPA
sobre las carpetas ya creadas (hoy solo con `.gitkeep`) y los archivos de arranque en la raíz.

```text
index.html                      # NUEVO — entrypoint Vite
vite.config.ts                  # NUEVO — plugin React + proxy /api → backend
postcss.config.cjs              # NUEVO — preset Mantine
src/
├── main.tsx                    # NUEVO — bootstrap React + MantineProvider + QueryClient + Router
├── App.tsx                     # NUEVO — definición de rutas
├── theme.ts                    # NUEVO — tema Mantine (tokens; referencia visual: docs/diseño)
├── pages/                      # Pantallas (hoy vacío)
│   ├── LoginPage.tsx
│   ├── ProjectsPage.tsx
│   ├── ProjectDashboardPage.tsx     # placeholder "Próximamente"
│   └── SectionPlaceholderPage.tsx   # placeholder genérico por sección
├── components/
│   ├── ui/                     # ProtectedRoute, AppShell layout, estados vacío/error/carga
│   └── domain/                 # RoleBadge, ProjectContextHeader, SideNav
├── hooks/                      # useCurrentUser, useLogin, useLogout
├── lib/
│   └── api/                    # cliente fetch (credentials: include) + manejo ApiErrorResponse
├── types/
│   └── api.ts                  # EXISTENTE — contrato compartido (reutilizado, no duplicado)
└── server/                     # EXISTENTE — sin cambios en S11
tests/
└── frontend/                   # tests de unidad de las piezas puras del frontend
```

**Structure Decision**: se mantiene el monorepo único del ADR-001. El frontend reutiliza el
contrato `src/types/api.ts` como única fuente de tipos compartida con el backend (sin duplicar
formas). El entrypoint de Vite vive en la raíz; el código de la SPA en `src/` (excluyendo
`src/server`). El proxy de Vite encapsula la integración con la API en desarrollo.

## Complexity Tracking

No aplica: el Constitution Check pasa sin violaciones.
