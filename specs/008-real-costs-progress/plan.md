# Implementation Plan: Costes reales, contra-asientos y avance físico (flujo C)

**Branch**: `s14-real-costs` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-real-costs-progress/spec.md`

## Summary

Permitir al constructor/PM imputar **costes reales** a las partidas de un presupuesto
**aprobado**, anularlos con un **contra-asiento** (solo PM), y registrar el **avance físico**
de cada partida. Todo bajo Libros Abiertos: los asientos son inmutables, "anulado" y el coste
acumulado son **derivados**, y el avance es un dato registrado (nunca inferido del gasto).
El modelo de datos ya existe (S07); esta feature añade la lógica pura de agregación, los
endpoints REST con permisos de servidor + RLS, dos refuerzos de integridad en BBDD
(inmutabilidad de `RealCost` y unicidad de la anulación) y la vista de detalle de partida.

## Technical Context

**Language/Version**: TypeScript strict (Node 22, runtime `--experimental-strip-types`)

**Primary Dependencies**: Express 5 + Zod (API), Prisma 7 + `@prisma/adapter-pg` (PostgreSQL 17),
React 19 + Mantine 9 + TanStack Query + React Router (frontend), Vitest 4 (tests)

**Storage**: PostgreSQL 17. Entidades ya existentes (migración `core_schema`): `RealCost`
(con enum `RealCostType` NORMAL/REVERSAL, `reversalOfId`, `reason`, CHECK
`RealCost_reversal_fields_check`) y `BudgetLine.progressPercent`/`progressUpdatedById`/
`progressUpdatedAt`. RLS ya cubre ambas tablas (S10).

**Testing**: Vitest (unit para la lógica pura de agregación; integración HTTP para endpoints
con permisos/RLS; UI con Testing Library + jsdom)

**Target Platform**: App web (API REST :3000 + SPA Vite :5173 con proxy `/api`)

**Project Type**: Web (backend `src/server` + frontend `src/`), monorepo único

**Performance Goals**: N/A específico (flujo de gestión de baja frecuencia; sin hot paths)

**Constraints**: dinero en céntimos enteros (`BigInt`); nada derivado se persiste (acumulado,
"anulado", EV se calculan al vuelo); permisos en servidor + RLS; sin `any`/`@ts-ignore`

**Scale/Scope**: prototipo; decenas de partidas y asientos por proyecto

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. SDD**: spec + clarify completos antes de este plan ✅
- **II. TDD en los 3 cálculos críticos**: la agregación de coste acumulado NO es uno de los 3
  críticos (`calculateEVM`/`calculateFRC`/`applyChange`), pero es **lógica pura** → vive en
  `src/lib/` y se cubre con tests unitarios (no se exige el ciclo red-green estricto, pero se
  testea). El EVM/FRC que consumirán estos datos son de S15+ y mantienen su TDD. ✅
- **III. TS strict, cero `any`** ✅
- **IV. Fidelidad al dominio**: nombre `RealCost` exacto; importes en céntimos `BigInt`;
  acumulado y "anulado" **derivados** (no persistidos); lógica pura sin I/O en `src/lib/`. ✅
- **V. Seguridad en servidor**: permisos `realCost.create`/`realCost.reverse`/`progress.update`
  (matriz S10) verificados en servidor + RLS por proyecto. ✅
- **VI. Trazabilidad**: `AuditEvent` append-only (`realCost.created`/`voided`/`progress.updated`);
  `RealCost` inmutable, la corrección es un contra-asiento, no una edición. ✅
- **VII. Decisiones documentadas**: sin tecnología nueva → sin ADR nuevo. Los refuerzos de
  integridad en BBDD (trigger de inmutabilidad, índice único de anulación) siguen el patrón
  ya establecido en S13. ✅

**Resultado**: PASS. Sin violaciones → sin entradas en *Complexity Tracking*.

## Project Structure

### Documentation (this feature)

```text
specs/008-real-costs-progress/
├── plan.md              # Este archivo
├── research.md          # Decisiones D1–D7
├── data-model.md        # RealCost, avance de partida, derivados
├── quickstart.md        # Validación del flujo C
├── contracts/
│   └── api.md           # Endpoints REST
└── tasks.md             # (lo genera /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── budget/
│       └── real-costs.ts        # NUEVO: lógica pura (acumulado, "anulado")
├── server/
│   ├── projects/
│   │   └── real-costs.ts        # NUEVO: imputar, anular, avance, detalle de partida
│   └── routes/
│       └── projects.ts          # +endpoints costs/reversal/progress + detalle de línea
├── types/
│   └── api.ts                   # +RealCostView, BudgetLineDetailView, requests
├── hooks/
│   ├── useBudgetLineDetail.ts   # NUEVO
│   ├── useAddRealCost.ts        # NUEVO
│   ├── useReverseRealCost.ts    # NUEVO
│   └── useUpdateProgress.ts     # NUEVO
└── pages/
    └── ProjectBudgetPage.tsx    # +detalle de partida (modal/sección) con historial

prisma/migrations/
└── <ts>_real_cost_immutability/ # NUEVO: trigger inmutabilidad RealCost + índice único
                                 # de anulación (+ CHECK progressPercent 0–100)

tests/
├── budget-real-costs.test.ts        # NUEVO: lógica pura de agregación
├── server/project-real-costs.test.ts # NUEVO: integración (imputar/anular/avance/permisos)
└── frontend/project-budget-detail.test.tsx # NUEVO: UI de detalle de partida
```

**Structure Decision**: se mantiene la estructura web del proyecto. La lógica de agregación
es pura en `src/lib/budget/` (testeable sin I/O); el acceso a datos y la autorización en
`src/server/projects/` + `routes/`; la UI extiende `ProjectBudgetPage`. La migración es
**additiva** (no se reescribe ninguna existente).

## Complexity Tracking

> Sin violaciones de la constitución → sin entradas.
