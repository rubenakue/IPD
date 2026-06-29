# Implementation Plan: Presupuesto objetivo (flujo B)

**Branch**: `s13-target-budget` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-target-budget/spec.md`

## Summary

Implementar la carga manual del presupuesto objetivo: el PM crea implícitamente un `Budget`
en borrador al añadir la primera partida, gestiona partidas individuales agrupadas por capítulo,
lo aprueba como línea base inmutable y cualquier agente del proyecto puede consultarlo agrupado
con subtotales. Excel/importación, presupuesto vigente, desviaciones, costes reales, FRC y EVM
quedan fuera de S13.

## Technical Context

**Language/Version**: TypeScript strict, Node >=22, ESM. Frontend React + Vite; backend Express.

**Primary Dependencies**: Ya instaladas. Express, Prisma, PostgreSQL, Zod, Mantine, TanStack Query,
React Router y Vitest. No se añaden dependencias.

**Storage**: PostgreSQL + Prisma. Migración additiva: `BudgetLine.chapterCode` y
`BudgetLine.chapterName`, constraints de datos base y triggers de inmutabilidad.

**Testing**: Vitest. Unit tests para agrupación/validación; integración API con app real y BD;
tests de frontend con Testing Library/jsdom.

**Target Platform**: Aplicación web en navegador + API REST.

**Project Type**: Monorepo web app; frontend en `src/`, backend en `src/server/`, Prisma en
`prisma/`.

**Performance Goals**: Un PM puede cargar 20 partidas y aprobar en una sesión de trabajo; los
totales/subtotales se calculan al céntimo con enteros.

**Constraints**: Dinero en céntimos enteros; nada derivado se persiste; permisos en servidor y RLS;
UI en español; identificadores en inglés; presupuesto aprobado no se reabre ni muta su base.

**Scale/Scope**: Prototipo con decenas de partidas por presupuesto; tabla Mantine simple sin
nueva librería.

## Constitution Check

| Principle | Result |
|---|---|
| SDD spec before code | Spec 007 y checklist existen sin clarificaciones pendientes. PASS |
| TDD critical calculations | No se modifican `calculateEVM`, `calculateFRC` ni `applyChange`. PASS |
| TypeScript strict | Sin `any` ni relajación de configuración. PASS |
| IPD domain fidelity | `Budget`/`BudgetLine`; dinero en céntimos; base inmutable + ajustes futuros. PASS |
| Server-side security | `project.view` para consulta, `budget.upload` para mutaciones, todo bajo RLS. PASS |
| Traceability | `budget.approved` se registra en `AuditEvent` dentro de la transacción de aprobación. PASS |
| ADRs and learning | Stack ya decidido; sin ADR nuevo. Diario al cierre. PASS |

No hay violaciones constitucionales; no se requiere Complexity Tracking.

## Project Structure

### Documentation

```text
specs/007-target-budget/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code

```text
prisma/
├── schema.prisma
└── migrations/20260629120000_target_budget_chapters/
    └── migration.sql

src/
├── types/api.ts
├── lib/
│   ├── api/client.ts
│   └── budget/summary.ts
├── server/
│   ├── projects/budget.ts
│   └── routes/projects.ts
├── hooks/
│   ├── useProjectBudget.ts
│   ├── useAddBudgetLine.ts
│   ├── useUpdateBudgetLine.ts
│   ├── useDeleteBudgetLine.ts
│   └── useApproveBudget.ts
├── pages/ProjectBudgetPage.tsx
├── App.tsx
└── lib/sections.ts

tests/
├── budget-summary.test.ts
├── server/project-budget.test.ts
└── frontend/project-budget.test.tsx
```

**Structure Decision**: reutilizar los patrones S12 existentes: contratos compartidos en
`src/types/api.ts`, servicio de proyecto bajo `src/server/projects`, rutas agregadas en
`src/server/routes/projects.ts`, hooks TanStack Query en `src/hooks`, y pantalla Mantine en
`src/pages`.

## Complexity Tracking

No aplica.

