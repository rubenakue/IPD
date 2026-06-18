---
description: "Task list — esquema núcleo de persistencia + seed (S07)"
---

# Tasks: Esquema núcleo de persistencia + seed de usuarios

**Input**: `specs/002-core-schema/` (spec.md, plan.md, data-model.md, quickstart.md)

**Tests**: NO obligatorios (la constitución exige TDD solo en los 3 cálculos puros; esta feature es persistencia). La validación es migración + seed + inspección + revisión del modelo.

**Organización**: el modelo de datos es un único `schema.prisma` (Foundational, bloquea todo); el seed es un único `prisma/seed.ts`. Las user stories se mapean a las porciones del seed (US1 usuarios, US2 proyecto/fases/agentes) y a verificaciones del modelo (US3/US4/US5).

## Path Conventions

Single project (briefing §7): `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/`.

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: dependencias y scripts listos para modelar y sembrar.

- [x] T001 Proponer e instalar `argon2` como dependencia de runtime (`pnpm add argon2`) y aprobar su build nativo en `pnpm-workspace.yaml` (`allowBuilds`), igual que Prisma.
- [x] T002 Configurar la ejecución del seed: añadir el script `"db:seed"` en `package.json` y la config `prisma.seed` (ejecutar `prisma/seed.ts` con el runner de TS de Node 22 — `node --experimental-strip-types` — o `tsx` si fuese necesario; decidir sin añadir deps innecesarias).

**Checkpoint**: `pnpm install` sin builds ignorados; el comando de seed está declarado.

---

## Phase 2: Foundational (prerrequisito BLOQUEANTE)

**Purpose**: el esquema y la migración inicial. **Bloquea todas las user stories** (sin tablas no hay seed ni nada).

**⚠️ CRITICAL**: ninguna story puede empezar hasta tener el esquema migrado.

- [x] T003 Escribir `prisma/schema.prisma`: los 8 enums y los 10 modelos (`User`, `Project`, `Phase`, `Agent`, `Budget`, `BudgetLine`, `RealCost`, `Change`, `ChangeAdjustment`, `AuditEvent`) según `data-model.md`, con relaciones (incluida la circular `Project`↔`Phase` con relaciones nombradas), `@@unique` indicados, importes en `BigInt`. **Sin columnas derivadas** (§7).
- [x] T004 Generar y aplicar la migración inicial: `npx prisma migrate dev --name core_schema`. Verificar que aplica sin errores y regenera el cliente con los 10 modelos.

**Checkpoint**: migración aplicada; `pnpm typecheck` pasa con el cliente generado.

---

## Phase 3: User Story 1 — Identidades de acceso sembradas (Priority: P1) 🎯 MVP

**Goal**: el seed crea las 5 cuentas de demo (una por rol) con contraseña hasheada.

**Independent Test**: ejecutar el seed sobre base limpia y ver 5 usuarios distinguibles por rol, sin contraseñas en claro; re-ejecutarlo no duplica.

- [x] T005 [US1] Crear `prisma/seed.ts`: instanciar el cliente Prisma (con `@prisma/adapter-pg`) y un helper de hash con `argon2`; sembrar los 5 `User` (uno por rol-objetivo) con **upsert por email** (idempotente).
- [x] T006 [US1] Documentar las contraseñas de demo (valores ficticios, no secretos reales) en el `README`.

**Checkpoint**: tras el seed, 5 usuarios en BD; contraseñas hasheadas.

---

## Phase 4: User Story 2 — Estructura de un proyecto IPD (Priority: P1)

**Goal**: el seed deja un proyecto demo con sus 4 fases y 5 agentes vinculados a las cuentas.

**Independent Test**: tras el seed, el proyecto tiene 4 fases en orden, `activePhaseId`→VALIDATION, y 5 agentes (uno por rol) con condiciones FRC.

- [x] T007 [US2] En `prisma/seed.ts`, crear el `Project` demo con sus 4 `Phase` fijas (orden 0–3) y fijar `activePhaseId` a la fase `VALIDATION`.
- [x] T008 [US2] En `prisma/seed.ts`, crear los 5 `Agent` (uno por rol) vinculando cada `User` al proyecto, con `sharePercent`/`guaranteedFee`/`feeAtRisk` de demo coherentes (los % de los participantes en FRC suman 100; observador 0).

**Checkpoint**: el seed deja el estado demostrable de extremo a extremo (US1 + US2).

---

## Phase 5: Verificación del modelo — US3/US4/US5 (Priority: P2/P3)

**Purpose**: confirmar que el esquema (ya construido en T003) cumple las reglas de estas stories. Son revisiones, no código nuevo.

- [x] T009 [US3] Verificar en `schema.prisma` que `Budget`/`BudgetLine` modelan base + avance físico (con autor/fecha) + previsión manual, que `ChangeAdjustment` está vinculado a `Change` y `BudgetLine`, y que **no** existe columna de presupuesto vigente.
- [x] T010 [US4] Verificar que `RealCost` es inmutable (sin `updatedAt`), con `type` normal/reversal, self-relation `reversalOf` y `reason`; "anulado" no es columna.
- [x] T011 [US5] Verificar que `AuditEvent` es append-only y registra actor/acción/entidad/momento.

**Checkpoint**: el modelo respeta inmutabilidad, contra-asiento y trazabilidad.

---

## Phase 6: Polish & cierre

- [x] T012 Ejecutar `pnpm db:seed` e inspeccionar (Prisma Studio o consulta) que hay 5 usuarios, 1 proyecto, 4 fases y 5 agentes; el seed es idempotente.
- [x] T013 Revisión §7 (SC-004): confirmar que ninguna magnitud derivada (`currentBudget`, `accruedCost`, `ev`, `frc`, `consumedContingency`, `effectiveForecast`, `phaseStatus`, `voided`) existe como columna.
- [x] T014 `pnpm typecheck` (y `pnpm lint` sobre `prisma/seed.ts`); commit `feat(db): core schema + user seed`; entrada en `docs/diario.md`; cerrar checkboxes de la issue #8.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → primero.
- **Foundational (Phase 2)** → bloquea todo lo demás (el seed necesita las tablas).
- **US1 (Phase 3)** y **US2 (Phase 4)** → tras Foundational; US2 depende de que existan los `User` de US1 (los agentes los referencian). Orden: US1 → US2.
- **Verificación (Phase 5)** → tras T003 (revisa el esquema); puede solaparse con el seed.
- **Polish (Phase 6)** → al final, con seed ejecutado.

## Parallel Opportunities

- T006 (README) puede ir en paralelo a T007/T008 (archivos distintos).
- Las verificaciones T009/T010/T011 son independientes entre sí (solo leen el esquema).

## Notes

- `argon2` es la única dependencia nueva (FR-011); proponer antes de instalar (regla del proyecto).
- El seed es **idempotente** (upsert/borrado controlado) para re-ejecutarse sin duplicar (SC-002).
- Commit único de la feature: `feat(db): core schema + user seed` (más el de docs si se separa).
- El seed íntegro "Hotel Azahar" (escenario económico completo) es de S17; aquí solo el estado mínimo demostrable.
