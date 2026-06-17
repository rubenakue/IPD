---
description: "Task list — cálculos económicos críticos (FRC, EVM, applyChange)"
---

# Tasks: Cálculos económicos críticos (FRC, EVM, motor de cambios)

**Input**: `specs/001-critical-calculations/` (spec.md, plan.md)

**Tests**: SÍ son obligatorios (SC-006 de la spec; son los tres cálculos innegociables con TDD estricto). Cada cálculo se escribe en rojo antes de implementarlo.

**Organización**: por user story (US1 FRC, US2 EVM, US3 applyChange), cada una independiente y testeable por separado. Mapeo a sesiones del roadmap entre paréntesis.

## Format: `[ID] [P?] [Story] Descripción`

- **[P]**: puede ir en paralelo (archivo distinto, sin dependencia).
- Rutas exactas incluidas.

## Path Conventions

Single project (briefing §7): `src/lib/calculations/`, `src/types/`, `tests/` en la raíz.

---

## Phase 1: Setup (infraestructura compartida) — sesión S2

**Purpose**: harness de pruebas y linting listos; estructura de archivos creada.

- [x] T001 Instalar y configurar Vitest: `pnpm add -D vitest`; scripts `"test": "vitest run"` y `"test:watch": "vitest"` en `package.json` (proponer la dependencia antes de instalar, principio de la constitución).
- [x] T002 [P] Configurar ESLint + script `pnpm lint` (exigido por el briefing antes del primer código de negocio).
- [x] T003 [P] Crear los archivos esqueleto en `src/lib/calculations/`: `frc.ts`, `evm.ts`, `change.ts`, cada uno exportando su función y lanzando `throw new Error('Not implemented')`.

**Checkpoint**: `pnpm lint` y `pnpm typecheck` pasan; `pnpm test` no encuentra errores de configuración.

---

## Phase 2: Foundational (prerrequisito bloqueante) — sesión S2

**Purpose**: los tipos de dominio que las tres funciones y sus tests necesitan. BLOQUEA todas las user stories.

**⚠️ CRITICAL**: ninguna story puede empezar hasta tener estos tipos.

- [x] T004 Definir en `src/types/domain.ts` los tipos de entrada/salida mínimos: condiciones de `Agent` (porcentaje de reparto, honorarios base, honorarios en riesgo, rol), estado económico (presupuesto vigente total y por partida, coste real acumulado, previsión a cierre, contingencia), entrada/salida de FRC, entrada/salida de EVM (con métricas `number | null` para "sin datos"), y entrada (cambio aprobado) / salida (efectos) de `applyChange`. Importes en céntimos enteros (`number`). Sin `any`.

**Checkpoint**: `pnpm typecheck` pasa con los tipos definidos y los esqueletos compilando.

---

## Phase 3: User Story 1 — FRC (Priority: P1) 🎯 MVP — sesión S3

**Goal**: `calculateFRC` devuelve el resultado por agente (bonus/malus + total) exacto al céntimo.

**Independent Test**: ejecutar `tests/frc.test.ts` con los escenarios US1 y ver que pasan.

### Tests for User Story 1 (escribir PRIMERO, deben FALLAR)

- [x] T005 [P] [US1] Escribir `tests/frc.test.ts` cubriendo los 5 escenarios de aceptación US1: ahorro repartido, sobrecoste con agotamiento (exceso al promotor), equilibrio, agente al 0 %, y resultado total = garantizados + bonus/malus. Verificar que fallan (rojo).

### Implementation for User Story 1

- [x] T006 [US1] Implementar `calculateFRC` en `src/lib/calculations/frc.ts`: desviación = vigente − previsión; reparto por porcentaje; límite de pérdida = honorarios en riesgo (constructor/proyectista); promotor sin límite y absorbe el exceso; redondeo determinista que cuadra la suma. Iterar caso a caso hasta verde.
- [x] T007 [US1] Refactor con los tests en verde (claridad, nombres, sin duplicación). Sin cambiar comportamiento.

**Checkpoint**: `tests/frc.test.ts` verde; `frc.ts` sin I/O.

---

## Phase 4: User Story 2 — EVM (Priority: P2) — sesión S4

**Goal**: `calculateEVM` devuelve CV, SV, CPI, SPI, EAC, ETC, VAC y los estados "sin datos" correctos.

**Independent Test**: ejecutar `tests/evm.test.ts` con los escenarios US2.

### Tests for User Story 2 (escribir PRIMERO, deben FALLAR)

- [x] T008 [P] [US2] Escribir `tests/evm.test.ts` cubriendo: cálculo completo, sin planificación (PV/SV/SPI = null), sin avance (EV y derivados = null), AC = 0 (CPI/EAC/ETC/VAC = null pero CV = EV), y AC neto de contra-asientos. Verificar que fallan (rojo).

### Implementation for User Story 2

- [x] T009 [US2] Implementar `calculateEVM` en `src/lib/calculations/evm.ts`: fórmulas de §9.6; `EV = Σ (vigente × % avance)`; EAC = `round(BAC × AC / EV)`; cada métrica no calculable devuelve `null`. Iterar hasta verde.
- [x] T010 [US2] Refactor con tests en verde.

**Checkpoint**: `tests/evm.test.ts` verde, incluidos todos los casos "sin datos".

---

## Phase 5: User Story 3 — applyChange (Priority: P3) — sesión S5

**Goal**: `applyChange` devuelve los efectos correctos por tipo de cambio, sin escribir nada.

**Independent Test**: ejecutar `tests/change.test.ts` con los escenarios US3.

### Tests for User Story 3 (escribir PRIMERO, deben FALLAR)

- [x] T011 [P] [US3] Escribir `tests/change.test.ts` cubriendo: tipo 1 (efectos vacíos), tipo 2 contra contingencia, tipo 2 ajuste de presupuesto, tipo 2 negativo, tipo 3 (presupuesto + honorarios + reponderación opcional que suma 100 %). Verificar que fallan (rojo).

### Implementation for User Story 3

- [ ] T012 [US3] Implementar `applyChange` en `src/lib/calculations/change.ts`: devuelve estructura de efectos según tipo; no ejecuta escrituras; ajustes admiten valores negativos. Iterar hasta verde.
- [ ] T013 [US3] Refactor con tests en verde.

**Checkpoint**: `tests/change.test.ts` verde. 🎉 Los tres cálculos en verde = hito H2 cerrado.

---

## Phase 6: Polish & Cross-Cutting — cierre de S5

- [ ] T014 Pasada de coherencia: nombres y tipos compartidos en `domain.ts` consistentes entre los tres cálculos; sin duplicación de helpers (p. ej. redondeo).
- [ ] T015 `/verify` (typecheck + lint + tests) y entrada en `docs/diario.md`.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** y **Foundational (Phase 2)** → sesión S2; bloquean todo lo demás.
- **US1 (Phase 3)** → S3; **US2 (Phase 4)** → S4; **US3 (Phase 5)** → S5. Son independientes entre sí una vez existen los tipos (T004): podrían hacerse en cualquier orden, pero el roadmap fija FRC → EVM → applyChange por valor de demo y curva de aprendizaje.
- Dentro de cada story: **test (rojo) antes que implementación (verde) antes que refactor**.
- **Polish (Phase 6)** → al final, con todo verde.

## Parallel Opportunities

- T002 y T003 en paralelo (archivos distintos).
- Los tres archivos de test (T005, T008, T011) son independientes entre sí; si se quisiera, podrían escribirse seguidos, pero cada uno debe estar rojo antes de implementar su cálculo.

## Notes

- [P] = archivos distintos, sin dependencia.
- Verificar que cada test falla antes de implementar (un test que nace en verde es sospechoso — constitución, principio II).
- Commit por cálculo (uno por unidad lógica): `feat(calculations): implement calculateFRC`, etc.
- Estos cálculos son la base; la persistencia (S7) y la API (S16, S20) los consumirán después.
- **S02 (tdd-harness):** T001–T004 hechos y los tres archivos de test (T005/T008/T011) escritos y **en rojo** (20 casos, todos `Not implemented`). Tras la revisión del PR #27: `ApprovedChange` lleva los ajustes **por partida** (`lineAdjustments`), no un total + IDs (concepto §7, tabla "datos almacenados"); añadidos los casos PV=0 (EVM) y reparto no divisible (FRC). S3–S5 arrancan directamente en la implementación (verde) + refactor.
- **Hallazgo S02 para S4:** en `EAC = round(BAC × AC / EV)`, el producto `BAC × AC` (~1,3·10^18) supera `Number.MAX_SAFE_INTEGER` (~9·10^15). La implementación de `calculateEVM` debe evitar el desbordamiento (p. ej. `BigInt` intermedio o reordenar la operación). Anotado en `tests/evm.test.ts`.
