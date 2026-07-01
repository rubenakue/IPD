# Implementation Plan: FRC servido por rol (flujo G parcial)

**Branch**: `s16-frc-by-role` | **Date**: 2026-07-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-frc-by-role/spec.md`

## Summary

Exponer el Fondo de Riesgo Compartido (FRC) por API y en el frontend, **filtrando el
contenido en el servidor según el rol** del solicitante (§9.5): promotor/PM ven el cuadro
completo; constructor/proyectista ven su propia fila + desviación total + estado; observador
(y agente al 0 %) ven solo el estado agregado (bonus/neutro/malus).

Enfoque técnico: el cálculo puro `calculateFRC()` (S3, en verde) y los derivados de S15
(vigente y previsión a cierre) ya existen; **no se tocan**. Se añade (1) una **proyección
pura por rol** `projectFrcForRole()` que recorta la salida de `calculateFRC()` a lo que cada
rol puede ver, desarrollada con TDD por ser el corazón del innegociable de seguridad; (2) un
**servicio** que arma el `FrcInput` desde el presupuesto aprobado y los agentes (bajo RLS) y
delega en la proyección; (3) un **endpoint** `GET /projects/:projectId/frc` cerrado con
`project.view` (deja pasar a cualquier participante, deniega al no-agente); (4) una **vista**
React role-aware. La respuesta es una **unión discriminada por `visibility`** para que el
servidor no pueda siquiera serializar campos que el rol no debe ver.

## Technical Context

**Language/Version**: TypeScript strict sobre Node 22 (`--experimental-strip-types`), según ADRs.

**Primary Dependencies**: Express 5 + Zod (API), Prisma 7 + `@prisma/adapter-pg` (datos, RLS),
React 19 + Mantine 9 + TanStack Query + React Router (frontend). Sin dependencias nuevas.

**Storage**: PostgreSQL 17 con RLS de 2 capas. **No se crea ni migra esquema**: el FRC es
derivado y no se persiste; el modelo `Agent` ya lleva `role`, `sharePercent`, `guaranteedFee`,
`feeAtRisk` (céntimos) que alimentan el cálculo.

**Testing**: Vitest 4. Unit puro para `projectFrcForRole()` (TDD, sin I/O); test de servidor
con RLS para las tres respuestas por rol; test de componente (jsdom) para la vista.

**Target Platform**: SPA + API REST (misma app monorepo `src/`).

**Project Type**: Web application (backend Express + frontend React en un único `src/`).

**Performance Goals**: N/A (consulta puntual; el cálculo es O(nº agentes), trivial).

**Constraints**: filtrado en servidor (nunca solo frontend); importes en céntimos enteros;
nada derivado se persiste; sin `any`/`@ts-ignore`; `pnpm typecheck` + `pnpm test` verdes.

**Scale/Scope**: 1 endpoint nuevo, 1 función pura nueva + 1 servicio, 1 página + 1 hook,
tipos en `api.ts`, sección `frc` de placeholder → real. Sin migración.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento en este plan |
|-----------|---------------------------|
| I. SDD (spec antes que código) | spec + clarify cerrados; este plan deriva de ellos. ✓ |
| II. TDD en los 3 críticos | `calculateFRC` ya en verde, **no se toca**. La nueva `projectFrcForRole` no es uno de los 3 críticos, pero por ser el filtrado de seguridad se desarrolla TDD (rojo→verde). ✓ |
| III. TS strict, cero `any` | Unión discriminada tipada; sin `any`/`@ts-ignore`. ✓ |
| IV. Fidelidad al dominio | `FRC` derivado **no persistido**; céntimos enteros; `calculateFRC` puro reutilizado; identificadores en inglés, UI en español. ✓ |
| V. Seguridad en el servidor (NON-NEGOTIABLE) | Filtrado por rol en servicio + RLS; la unión discriminada impide serializar campos no permitidos; endpoint deniega al no-agente. ✓ |
| VI. Trazabilidad / libros abiertos | Consulta de solo lectura; no muta datos → sin `AuditEvent` (coherente con `GET /budget/economics`). ✓ |
| VII. ADRs / diario / lenguaje simple | Sin decisión de stack nueva → sin ADR. Entrada de diario al cerrar. ✓ |

**Resultado**: sin violaciones. `Complexity Tracking` vacío.

## Project Structure

### Documentation (this feature)

```text
specs/010-frc-by-role/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones de diseño
├── data-model.md        # Fase 1: entidades/formas de datos (derivadas)
├── quickstart.md        # Fase 1: guía de validación por rol
├── contracts/
│   └── api.md           # Fase 1: contrato del endpoint GET /frc
├── checklists/
│   └── requirements.md  # (de /speckit-specify) 16/16
└── tasks.md             # (lo genera /speckit-tasks — NO aquí)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── calculations/frc.ts        # EXISTENTE — calculateFRC puro (S3). No se toca.
│   └── frc/
│       └── visibility.ts          # NUEVO — projectFrcForRole() puro (proyección por rol)
├── server/
│   ├── projects/
│   │   └── frc.ts                 # NUEVO — getProjectFrc(): arma FrcInput bajo RLS y proyecta
│   ├── permissions/
│   │   ├── matrix.ts              # EXISTENTE — frc.own.view / frc.global.view ya definidos
│   │   └── project-agent.ts       # EXISTENTE — requireProjectPermission / resolveProjectAgent
│   └── routes/projects.ts         # EDIT — registrar GET /projects/:projectId/frc
├── types/
│   ├── domain.ts                  # EXISTENTE — FrcInput/FrcResult/AgentFrcTerms. No se toca.
│   └── api.ts                     # EDIT — ProjectFrcResponse (unión discriminada) + filas
├── hooks/
│   └── useProjectFrc.ts           # NUEVO — TanStack Query (['project-frc', projectId])
├── pages/
│   └── ProjectFrcPage.tsx         # NUEVO — vista role-aware (cuadro / propio / agregado)
├── lib/sections.ts                # EDIT — sección 'frc' → ready: true
└── App.tsx                        # EDIT — ruta real 'frc' → <ProjectFrcPage/>

tests/
├── frc-visibility.test.ts         # NUEVO — unit puro projectFrcForRole (TDD, corazón)
├── server/project-frc.test.ts     # NUEVO — 3 roles → 3 formas (RLS)
└── frontend/project-frc.test.tsx  # NUEVO — vista por rol (jsdom)
```

**Structure Decision**: Web application monorepo en un único `src/` (no hay carpetas
`backend/`/`frontend/` separadas; servidor y SPA conviven). Se sigue el patrón ya establecido
por S15: función pura en `src/lib/` (unit en `tests/*.test.ts`), servicio en
`src/server/projects/` (test en `tests/server/project-*.test.ts`), endpoint en
`routes/projects.ts`, tipos en `types/api.ts`, hook + página en frontend
(`tests/frontend/*.test.tsx`).

## Complexity Tracking

> Sin violaciones de la constitución. Nada que justificar.
