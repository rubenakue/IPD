# Diario de desarrollo — IPD

Una entrada por sesión de trabajo. Breve y honesto.

## 2026-06-11

- **Horas trabajadas:** 2.5
- **Qué hice:** Entrevista completa de stack con `/stack-architect`. Decididas todas las piezas: backend Express + PostgreSQL + Prisma, frontend Mantine + TanStack Query, auth por sesiones, dominio en céntimos, FRC al vuelo, motor de cambios puro. 8 ADRs documentados (001-008).
- **Qué bloqueó:** Nada. El rol hizo su trabajo sin fricciones.
- **Cómo lo resolví / qué usé de Claude Code:** El rol fue Claude Code mismo (stack-architect); la guía en lenguaje llano simplificó decisiones complejas, me cuestionó la propuesta MariaDB por RLS, y cada ADR quedó escrito con contexto y TODO exactos.
- **Estado del sprint:** Adelantado. Stack cerrado, depende que rápido fluya SDD y tdd-harness.

## 2026-06-12

- **Qué hice:** Sesión S01 del roadmap (delegada por completo a Claude Code, en rama `001-critical-calculations`). Inicializado GitHub Spec Kit (`.specify/` + skills `speckit-*`), redactada la constitución del proyecto (`.specify/memory/constitution.md`, v1.0.0, 7 principios) y escrita la primera spec completa de los tres cálculos críticos (FRC/EVM/applyChange) con su `clarify` resuelto, plan y tasks (`specs/001-critical-calculations/`).
- **Qué bloqueó:** Dos fricciones menores: (1) Spec Kit inyectó un bloque en `CLAUDE.md` que rompía la regla "CLAUDE.md solo @AGENTS.md" → revertido. (2) La doc del proyecto sugería `--script ps`, pero este entorno ejecuta bash → inicializado con `--script sh` para que los `/speckit.*` funcionen aquí.
- **Cómo lo resolví / qué usé de Claude Code:** Al ser sesión delegada, las preguntas de `/speckit.clarify` las resolvió el propio agente citando `docs/concepto-global.md` (§9.5/§9.6/§9.10) y quedaron registradas en la sección Clarifications de la spec para mi revisión. La spec incluye casos numéricos exactos al céntimo que guiarán los tests de S2.
- **Estado del sprint:** Adelantado. SDD montado; siguiente: S02 (`/tdd-harness`, tests en rojo).

## 2026-06-17

- **Qué hice:** Sesión S02 del roadmap (`/tdd-harness`, rama `002-tdd-harness`, delegada). Montado el harness de tests: **Vitest 4** + **ESLint 10** (flat config, cero `any`), con scripts `test`/`test:watch`/`lint`. Definidos los tipos de entrada/salida de los tres cálculos en `src/types/domain.ts` (céntimos enteros, "sin datos" = `null`), creados los esqueletos puros (`frc.ts`/`evm.ts`/`change.ts` con `throw new Error('Not implemented')`) y escritos los tres archivos de test (17 casos) cubriendo todos los escenarios de aceptación de la spec. Los tres cálculos quedan **en rojo**: ese es el estado correcto antes de implementar (S3–S5).
- **Qué bloqueó:** (1) ESLint linteaba los hooks `.cjs` de `.claude/` y `.codex/` (90 errores ajenos al producto) → resuelto excluyéndolos en `ignores` (el lint solo vigila el código de negocio). (2) Duda de si el hook de Stop o un git hook bloquearían el cierre con tests en rojo → verificado que el Stop solo hace `tsc --noEmit` (no tests) y que no hay pre-commit real: TDD y los hooks conviven sin fricción.
- **Hallazgo:** escribir el test del EVM destapó que `EAC = round(BAC × AC / EV)` desborda `Number.MAX_SAFE_INTEGER` en el producto intermedio (~1,3·10^18). Anotado en el test y en `tasks.md` para implementarlo sin pérdida de precisión en S4. Es justo lo que el TDD debe revelar pronto.
- **Cómo lo resolví / qué usé de Claude Code:** el rol `tdd-harness` en modo profesor (red-green-refactor explicado, rojo mostrado de verdad en terminal). El harness es agnóstico: las implementaciones llegarán de test en test, spec en mano. La revisión automática del PR #27 (Codex) detectó 3 mejoras P2 que apliqué: ajustes de cambio **por partida** en el modelo de dominio (en vez de un total a repartir) y dos casos de test que faltaban (PV=0 en EVM, reparto no divisible en FRC) → de 17 a 20 tests.
- **Estado del sprint:** En camino. Harness listo y los 3 cálculos en rojo; siguiente: S03 (`calculateFRC` hasta verde).

## 2026-06-17 (sesión S03)

- **Qué hice:** Sesión S03 del roadmap (rama `003-calculate-frc`, delegada). Implementado `calculateFRC` **en verde**: los 6 tests de FRC pasan. Traducidas las 7 reglas de reparto de §9.5 a una función pura. Decisión de diseño clave: el promotor actúa como **"sumidero"** —absorbe su parte + el exceso que supera el fondo en riesgo de los demás + el residuo de redondeo—, lo que cumple a la vez la regla 4 (el promotor absorbe el exceso) y la 7 (la suma de repartos cuadra al céntimo con la desviación). EVM y `applyChange` siguen en rojo (S04/S05).
- **Qué bloqueó:** Nada reseñable. Matiz aclarado: la "reponderación de %" que el roadmap lista en el ciclo de FRC es en realidad responsabilidad de `applyChange` (tipo 3, S05); `calculateFRC` solo **consume** los porcentajes vigentes que recibe. Es separación de responsabilidades, no un hueco.
- **Cómo lo resolví / qué usé de Claude Code:** ciclo TDD con el rojo de S02 como red de seguridad; cada caso de §9.5 verificado al céntimo (incluido el de redondeo no divisible que añadió la revisión del PR #27). El paso *refactor* no necesitó cambios: la función nació con helpers puros y nombrados, sin duplicar la lógica de redondeo.
- **Estado del sprint:** Adelantado. Primer cálculo crítico en verde; siguiente: S04 (`calculateEVM`, atento al desbordamiento del EAC ya anotado en S02).

## AAAA-MM-DD

- **Horas trabajadas:**
- **Qué hice:**
- **Qué bloqueó:**
- **Cómo lo resolví / qué usé de Claude Code:**
- **Estado del sprint:** En camino | Con retraso | Adelantado
