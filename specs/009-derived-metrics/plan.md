# Implementation Plan: Derivados económicos y alertas de desviación

**Branch**: `s15-derived-metrics` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-derived-metrics/spec.md`

## Summary

Servir, sobre el presupuesto aprobado, la **tabla de control económico** con los derivados por
partida, capítulo y proyecto: presupuesto vigente (base + Σ ajustes), coste real acumulado,
previsión a cierre (`max(coste, vigente)` o manual), desviación € y %, y nivel de alerta
(constantes 5%/10%). Permitir al constructor/PM **fijar o eliminar** la previsión manual de una
partida (único dato persistido; el resto es derivado, §7). Toda la aritmética vive en una
**función pura** reutilizable; el servidor la alimenta con los datos fuente bajo RLS y el
frontend muestra la tabla con resaltado de alertas.

## Technical Context

**Language/Version**: TypeScript strict (Node 22, `--experimental-strip-types`)

**Primary Dependencies**: Express 5 + Zod, Prisma 7 + `@prisma/adapter-pg` (PostgreSQL 17),
React 19 + Mantine 9 + TanStack Query, Vitest 4

**Storage**: PostgreSQL. Todo ya existe: `BudgetLine.manualForecast` (BigInt? céntimos),
`ChangeAdjustment.delta` (BigInt céntimos con signo), `RealCost` (S14). **No hay migración.**

**Testing**: Vitest — unit para la función pura de derivados (cuadre al céntimo y umbrales),
integración HTTP para `GET economics` y el override de previsión (permisos/RLS), UI para la
tabla.

**Target Platform**: App web (API REST :3000 + SPA Vite :5173)

**Project Type**: Web (backend `src/server` + frontend `src/`)

**Performance Goals**: N/A (flujo de consulta de baja frecuencia)

**Constraints**: **nada derivado se persiste** (vigente, previsión, desviación, alerta se
calculan al consultar; solo `manualForecast` se almacena); dinero en céntimos enteros; permisos
en servidor + RLS; sin `any`/`@ts-ignore`

**Scale/Scope**: prototipo; decenas de partidas por proyecto

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. SDD**: spec + clarify completos ✅
- **II. TDD en los 3 cálculos críticos**: la derivación económica NO es uno de los 3
  (`calculateEVM`/`calculateFRC`/`applyChange`), pero es **lógica pura** → `src/lib/budget/` con
  tests unitarios (cuadre y umbrales). El EVM/FRC que consumirán estos datos llegan en S16. ✅
- **III. TS strict, cero `any`** ✅
- **IV. Fidelidad al dominio**: importes en céntimos; **nada derivado se persiste** (solo
  `manualForecast`); lógica pura sin I/O en `src/lib/`; desviación = vigente − previsión, como
  en `src/types/domain.ts`. ✅
- **V. Seguridad en servidor**: consulta = `project.view` (cualquier agente); override de
  previsión = `forecast.update` (constructor/PM), verificado en servidor + RLS. ✅
- **VI. Trazabilidad**: el override de previsión deja `AuditEvent` (`forecast.updated`). ✅
- **VII. Decisiones documentadas**: sin tecnología nueva → sin ADR. ✅

**Resultado**: PASS. Sin violaciones → sin *Complexity Tracking*.

## Project Structure

### Documentation (this feature)

```text
specs/009-derived-metrics/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/api.md
└── tasks.md   # (lo genera /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── lib/budget/
│   └── derived.ts              # NUEVO: lógica pura (vigente, previsión, desviación, alerta)
├── server/projects/
│   └── economics.ts            # NUEVO: getProjectEconomics + setLineForecast (bajo RLS)
├── server/routes/projects.ts   # +GET /economics, +PATCH /budget/lines/:id/forecast
├── types/api.ts                # +EconomicsView/línea/capítulo, AlertLevel, SetForecastRequest
├── hooks/
│   ├── useProjectEconomics.ts  # NUEVO
│   └── useSetForecast.ts       # NUEVO
└── pages/ProjectBudgetPage.tsx # tabla económica (derivados + alertas) cuando APPROVED;
                                # override de previsión en el detalle de partida (S14)

tests/
├── budget-derived.test.ts            # NUEVO: lógica pura
├── server/project-economics.test.ts  # NUEVO: integración (cuadre, permisos, override)
└── frontend/project-economics.test.tsx # NUEVO: tabla con derivados y resaltado
```

**Structure Decision**: estructura web existente. La aritmética en `src/lib/budget/derived.ts`
(pura, testeable); el acceso a datos y autorización en `src/server/projects/economics.ts` +
rutas; la UI amplía `ProjectBudgetPage` (tabla económica cuando el presupuesto está aprobado;
en borrador sigue la tabla de carga de S13). Sin migración (modelo ya completo).

## Complexity Tracking

> Sin violaciones de la constitución → sin entradas.
