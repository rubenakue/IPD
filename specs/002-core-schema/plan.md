# Implementation Plan: Esquema núcleo de persistencia + seed de usuarios

**Branch**: `002-core-schema` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-core-schema/spec.md`

## Summary

Modelar en Prisma las entidades del núcleo del dominio IPD (`User`, `Project`, `Phase`, `Agent`, `Budget`, `BudgetLine`, `RealCost`, `Change` mínimo, `ChangeAdjustment`, `AuditEvent`), generar la migración inicial y un script de seed que deje un estado demostrable de extremo a extremo: 5 usuarios (uno por rol) + un proyecto de demo con sus 4 fases y 5 agentes. La regla rectora es la tabla "almacenado vs derivado" de §7: **solo se persiste lo base; todo lo derivado se calcula al vuelo**. Es la capa de datos sobre la que se montarán auth (S08), control económico (S13+) y el FRC/EVM ya implementados (S3–S5).

## Technical Context

**Language/Version**: TypeScript 5.5 (strict), Node 20+ (runtime 22), ESM.

**Primary Dependencies**: Prisma 7 (`prisma` CLI + `@prisma/client` + `@prisma/adapter-pg`), PostgreSQL 17 (Docker, S06). **Nueva**: `argon2` para el hash de contraseñas del seed (cierra el pendiente de hashing de ADR-004).

**Storage**: PostgreSQL. Dinero como `BigInt` (mapea a `BIGINT`): céntimos de un proyecto real (~10^10) superan `Int` de 32 bits (~2,1·10^9), así que `Int` no sirve (ADR-005).

**Testing**: Vitest disponible. Para esta feature de persistencia los tests no son innegociables (la constitución exige TDD solo en los 3 cálculos puros); la validación principal es la migración + el seed + inspección. Opcional: un test ligero de que el seed deja datos coherentes.

**Target Platform**: backend Node (la BD la consumen API y, vía funciones puras, el dominio).

**Project Type**: monorepo single-project (briefing §7). Persistencia bajo `prisma/`.

**Performance Goals**: irrelevante a esta escala (decenas de filas en seed).

**Constraints**: nada derivado se persiste; céntimos enteros; `RealCost` inmutable; sin secretos en el repo (contraseñas de demo hasheadas; valores en claro solo en README).

**Scale/Scope**: 10 modelos + enums + 1 migración + 1 seed.

## Constitution Check

*GATE: debe pasar antes de implementar.*

| Principio | Cumplimiento |
|---|---|
| I. SDD primero | ✓ spec aprobada y clarificada antes de tocar `schema.prisma`. |
| II. TDD en los 3 cálculos | N/A — esta feature no toca `src/lib/calculations/`. Los cálculos siguen verdes. |
| III. TS strict, cero `any` | ✓ el seed en TS strict; Prisma genera tipos; sin `any` ni `@ts-ignore`. |
| IV. Fidelidad al dominio | ✓ nombres de entidad en inglés del briefing, céntimos enteros, **nada derivado se persiste** (verificado contra la tabla §7). |
| V. Seguridad en servidor | ✓ contraseñas hasheadas con argon2 (nunca en claro); el RLS y el filtrado por rol llegan en S08/S10 (no se debilitan aquí). |
| VI. Trazabilidad / libros abiertos | ✓ `AuditEvent` append-only modelado; `RealCost` inmutable con contra-asiento. |
| VII. ADR + lenguaje simple | ✓ stack en ADR-001/005; `argon2` cierra el hashing pendiente de ADR-004 (se anota en el diario; mini-ADR si se quiere formalizar). |

**Resultado: PASA.** Sin violaciones → *Complexity Tracking* vacío.

## Project Structure

### Documentation (this feature)

```text
specs/002-core-schema/
├── spec.md           # QUÉ y POR QUÉ (aprobada, clarify resuelto)
├── plan.md           # Este archivo: el CÓMO
├── data-model.md     # Entidades, campos, relaciones, enums (Phase 1)
├── quickstart.md     # Cómo validar (migrate + seed + inspección)
├── checklists/
│   └── requirements.md
└── tasks.md          # Lo genera /speckit.tasks
```

No se generan `research.md` ni `contracts/`: no hay incógnitas tecnológicas (stack cerrado en ADRs; dudas de modelo resueltas en clarify) ni interfaces externas en esta feature (la persistencia es interna; la API REST es S08+).

### Source Code (repository root)

```text
prisma/
├── schema.prisma          # los 10 modelos + enums (datasource/generator ya de S06)
├── migrations/            # migración inicial generada por `prisma migrate dev`
└── seed.ts                # seed: 5 usuarios + proyecto demo + 4 fases + 5 agentes

src/
├── lib/db/                # (futuro) cliente Prisma con adapter; no obligatorio en S07
└── types/domain.ts        # tipos de cálculo ya existentes (no se tocan)

package.json               # script de seed + config "prisma.seed"; nueva dep runtime: argon2
```

**Structure Decision**: se respeta el layout del briefing (§7). El modelo de persistencia vive en `prisma/`; el seed en `prisma/seed.ts` ejecutado vía `prisma db seed`. La conversión `BigInt`↔`number` (los cálculos puros usan `number`) ocurrirá en la futura capa de acceso a datos (`src/lib/`), no en S07.

## Decisiones de diseño (CÓMO, dentro del stack decidido)

1. **IDs**: `String @id @default(cuid())` en todas las entidades — portable, sin coordinación, legible. (Decisión técnica, no de dominio.)
2. **Dinero**: `BigInt` para todo importe en céntimos (`baseAmount`, `amount`, `delta`, `guaranteedFee`, `feeAtRisk`, `manualForecast`). La capa que alimenta a `calculateFRC/EVM` convertirá a `number` al leer (rango seguro); la BD mantiene precisión exacta.
3. **Enums de Prisma** para los conjuntos cerrados del dominio: `AgentRole` (PROMOTER, DESIGNER, CONSTRUCTOR, PROJECT_MANAGER, OBSERVER), `RealCostType` (NORMAL, REVERSAL), `ChangeType` (INCIDENTAL, COST_IMPACT, SCOPE), `ChangeStatus` (PROPOSED, EVALUATED, APPROVED, REJECTED), `ProjectStatus` (ACTIVE, ARCHIVED), `BudgetStatus` (DRAFT, APPROVED), `AgentStatus` (ACTIVE, INACTIVE), `PhaseName` (VALIDATION, PRE_CONSTRUCTION, CONSTRUCTION, CLOSURE).
4. **Nada derivado como columna** (regla de oro §7): NO existen `currentBudget`, `accruedCost`, `ev`, `frc`, `consumedContingency`, `effectiveForecast`, `phaseStatus`, `voided`. Se calculan. Verificado en revisión (SC-004).
5. **`Phase` y fase activa**: cada `Project` tiene exactamente 4 `Phase` y un puntero `activePhaseId`. Relación circular Project↔Phase resuelta con relaciones nombradas de Prisma (`@relation("ProjectPhases")` y `@relation("ActivePhase")`). El estado de fase es derivado (no columna).
6. **`RealCost` inmutable**: sin `updatedAt`; tipo `NORMAL`/`REVERSAL`; un reversal apunta al original con self-relation `reversalOf`/`reversals` y lleva `reason`. "Anulado" = existe reversal vinculado (derivado).
7. **`User` ≠ `Agent`**: `User` (email único, `passwordHash`, `displayName`). `Agent` une `User`+`Project` con `role` y condiciones FRC; `@@unique([userId, projectId])`. El promotor puede llevar honorarios a 0 (su FRC es solo porcentaje, §9.5).
8. **Autor de acciones**: `RealCost`, avance de `BudgetLine` y `AuditEvent` referencian al `User` que actúa. El contexto de proyecto se infiere por las relaciones. La validación de "quién puede" es de la API (S08+).
9. **`Change` mínimo**: solo `projectId`, `type`, `status`, `title`, `createdAt` — lo justo para sostener `ChangeAdjustment` (FK a `Change` y `BudgetLine`, `delta` con signo). El flujo completo es de la feature de cambios.
10. **`argon2`**: hash de contraseñas en el seed. Dependencia de runtime con build nativo → aprobar su build en `pnpm-workspace.yaml` (como Prisma). Contraseñas de demo en claro solo en README.
11. **Seed idempotente**: upsert por email / borrado controlado en orden inverso de dependencias, para re-ejecutarlo sin duplicar (SC-002, US1/AS2).

## Complexity Tracking

> Sin violaciones de la constitución. Tabla intencionadamente vacía.
