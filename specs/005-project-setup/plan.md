# Implementation Plan: Setup de proyecto (crear proyecto y configurar agentes)

**Branch**: `s12-project-setup` | **Date**: 2026-06-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-project-setup/spec.md`

## Summary

Completar el flujo A: un usuario autenticado crea un proyecto (queda como PM, se generan sus 4 fases
con Validación activa) y el PM configura sus agentes (rol, usuario **existente** por email, % de
reparto FRC con suma 100% al confirmar, honorarios base y en riesgo), con auditoría
`project.created` y `agent.added`. El modelo de datos ya existe (schema de S07); esta feature añade
**endpoints REST nuevos**, su **lógica de servidor** (creación transaccional, validación, permisos
y RLS) y las **pantallas** sobre el shell de S11. La invitación de usuarios nuevos queda fuera
(spec 006 / issue #37): aquí solo se asignan usuarios existentes.

## Technical Context

**Language/Version**: TypeScript 5.5 strict (cero `any`), Node ≥22, ESM. Frontend React 19 + Vite;
backend Express 5.

**Primary Dependencies**: Ya instaladas. Backend: Express, Prisma 7 (`@prisma/adapter-pg`), Zod.
Frontend: Mantine 9 (`@mantine/form`, `@mantine/core`, `@mantine/notifications`), TanStack Query,
React Router. **No se prevén dependencias nuevas.**

**Storage**: PostgreSQL + Prisma. **Sin migración de tablas** (Project, Phase, Agent, AuditEvent ya
existen). Sí una **migración additiva de políticas RLS** para permitir la creación de proyecto (ver
research D1).

**Testing**: Vitest. Integración de API (patrón H4: `fetch` + `app.listen(0)` + BD real,
`fileParallelism:false`). Tests de la función pura de validación de reparto. Tests de UI (Testing
Library + jsdom) para los formularios clave.

**Target Platform**: navegador de escritorio (SPA) + API REST.

**Project Type**: Web application — monorepo único (frontend `src/`, backend `src/server/`).

**Performance Goals**: crear proyecto y configurar agentes percibido como instantáneo; sin
objetivos duros (prototipo). SC-001: crear proyecto en <2 min.

**Constraints**: dinero en **céntimos** (`BigInt`: `guaranteedFee`, `feeAtRisk`); **nada derivado se
persiste** (la suma de reparto y el "setup completo" se calculan al vuelo, no se guardan);
seguridad y permisos **en servidor** (crear = autenticado; gestionar agentes = PM, vía
`agent.manage` + RLS); UI en español.

**Scale/Scope**: pocos proyectos y agentes por proyecto (prototipo). Superficie S12: ~3-4 endpoints
nuevos, 1 función pura, 2-3 pantallas/formularios.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento |
|---|---|
| **I. SDD** | Spec 005 + clarify hechos y acotados antes de este plan. ✅ |
| **II. TDD 3 cálculos** | No se tocan `calculateEVM/FRC/applyChange`. La validación de suma de reparto NO es uno de los tres críticos; se testea, pero sin el rito TDD innegociable. ✅ |
| **III. TS strict, cero `any`** | Back y front en TS strict. ✅ |
| **IV. Fidelidad al dominio** | Entidades en inglés (Project/Phase/Agent); honorarios en céntimos `BigInt`; UI en español; **nada derivado se persiste** (suma y "completitud" se calculan, no se guardan). ✅ |
| **V. Seguridad en el servidor (NON-NEGOTIABLE)** | Crear proyecto = `requireAuth`; gestionar agentes = `requireProjectPermission('agent.manage')` (solo PM) + RLS. Tests de que un no-PM recibe rechazo. ✅ |
| **VI. Trazabilidad** | `project.created` y `agent.added` vía `recordAuditEvent` (append-only). ✅ |
| **VII. ADRs + diario** | Sin decisión de stack nueva → sin ADR en S12 (la invitación, que sí requería ADR, se movió a la spec 006). El patrón RLS de creación se documenta en research. Diario al cerrar. ✅ |

**Resultado del gate: PASS.** Sin violaciones; no se requiere *Complexity Tracking*. El reto RLS de
creación (research D1) es de implementación, no una violación constitucional.

## Project Structure

### Documentation (this feature)

```text
specs/005-project-setup/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── api.md           # Endpoints REST nuevos (crear proyecto, agentes)
├── checklists/requirements.md
└── tasks.md             # (/speckit-tasks)
```

### Source Code (repository root)

Backend en `src/server/` (intacto lo de H4), frontend en `src/` (sobre el shell de S11). Archivos
nuevos marcados con ＋, modificados con ✎.

```text
src/
├── types/
│   └── api.ts                 # ✎ contratos: CreateProject, Agent, AddAgent, AgentsConfig
├── lib/
│   └── agents/
│       └── share-split.ts     # ＋ función pura: suma y validación de reparto (compartida front/back)
├── server/
│   ├── routes/
│   │   └── projects.ts        # ✎ añade POST /projects y subrutas de /agents
│   ├── projects/
│   │   ├── create-project.ts  # ＋ creación transaccional (Project + 4 Phases + Agent PM + audit)
│   │   └── agents.ts          # ＋ listar/añadir/editar agentes + validación
│   └── db/rls.ts              # (existente) withRlsContext
├── pages/
│   ├── NewProjectPage.tsx     # ＋ formulario de creación de proyecto
│   └── ProjectAgentsPage.tsx  # ＋ pantalla de agentes (sección "Agentes" del SideNav, hoy placeholder)
├── hooks/
│   ├── useCreateProject.ts    # ＋ mutation → POST /api/projects (invalida ['me'])
│   ├── useProjectAgents.ts    # ＋ query  → GET  /api/projects/:id/agents
│   ├── useAddAgent.ts         # ＋ mutation → POST /api/projects/:id/agents
│   └── useUpdateAgent.ts      # ＋ mutation → PATCH /api/projects/:id/agents/:agentId
└── components/domain/         # ＋ tabla/form de agentes según haga falta

prisma/migrations/             # ＋ migración additiva de políticas RLS para creación de proyecto

tests/
├── server/                    # ＋ integración: crear proyecto, agentes, permisos (no-PM), email inexistente
└── frontend/                  # ＋ formularios de creación y de agentes
```

**Structure Decision**: monorepo único (ADR-001). La validación de reparto vive como **función pura
compartida** en `src/lib/agents/` (el frontend la usa para el aviso de suma; el backend para validar
al confirmar), reutilizando el patrón de `src/lib/calculations/`. Los contratos van en
`src/types/api.ts` (fuente única ya usada por S11).

## Complexity Tracking

No aplica: el Constitution Check pasa sin violaciones.
