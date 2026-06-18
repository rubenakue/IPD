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

- **Qué hice:** Sesión S03 del roadmap (rama `003-calculate-frc`, delegada). Implementado `calculateFRC` **en verde**: los 7 tests de FRC pasan (6 de S02 + 1 que añadió la revisión del PR #28). Traducidas las 7 reglas de reparto de §9.5 a una función pura. Decisión de diseño clave: el promotor actúa como **"sumidero"** —absorbe su parte + el exceso que supera el fondo en riesgo de los demás + el residuo de redondeo—, lo que cumple a la vez la regla 4 (el promotor absorbe el exceso) y la 7 (la suma de repartos cuadra al céntimo con la desviación). EVM y `applyChange` siguen en rojo (S04/S05).
- **Qué bloqueó:** Nada reseñable. Matiz aclarado: la "reponderación de %" que el roadmap lista en el ciclo de FRC es en realidad responsabilidad de `applyChange` (tipo 3, S05); `calculateFRC` solo **consume** los porcentajes vigentes que recibe. Es separación de responsabilidades, no un hueco.
- **Cómo lo resolví / qué usé de Claude Code:** ciclo TDD con el rojo de S02 como red de seguridad; cada caso de §9.5 verificado al céntimo (incluido el de redondeo no divisible que añadió la revisión del PR #27). El paso *refactor* no necesitó cambios: la función nació con helpers puros y nombrados, sin duplicar la lógica de redondeo. La revisión del PR #28 (Codex) cazó un bug sutil: en sobrecoste **sin** agotamiento del fondo, el promotor absorbía el céntimo de redondeo en lugar de asignarlo al agente de mayor % (mezclaba la regla 7 con la 4). Lo arreglé separando el sobrecoste en dos fases —reparto proporcional con residuo al mayor %, y exceso de los topados al promotor— con un test que lo reproduce (US1.7, red→green).
- **Estado del sprint:** Adelantado. Primer cálculo crítico en verde; siguiente: S04 (`calculateEVM`, atento al desbordamiento del EAC ya anotado en S02).

## 2026-06-17 (sesión S04)

- **Qué hice:** Sesión S04 del roadmap (rama `004-calculate-evm`, delegada). Implementado `calculateEVM` **en verde** (6/6): las fórmulas exactas de §9.6 (CV, SV, CPI, SPI, EAC, ETC, VAC) y TODOS los estados "sin datos" (sin avance → EV y derivados; AC=0 → CPI/EAC/ETC/VAC pero CV=EV; PV=0 o sin plan → PV/SV/SPI). El EV nace del avance físico por partida; el AC es neto de contra-asientos.
- **Qué bloqueó:** El hallazgo de S02 se materializó: `EAC = BAC × AC / EV` desborda `Number.MAX_SAFE_INTEGER` en el producto intermedio (~1,3·10^18). Resuelto calculando **solo el EAC con `BigInt`** y redondeando al céntimo; el resto de métricas caben de sobra en `number` seguro. El test US2.1 (que ya esperaba el valor correcto) pasó con esta técnica.
- **Cómo lo resolví / qué usé de Claude Code:** ciclo TDD con la red roja de S02 como guía; cada regla de "sin datos" verificada contra su caso. El paso *refactor* no necesitó cambios: un helper puro por agregación (BAC/EV/AC/PV) y cada métrica con su condición de `null` explícita.
- **Estado del sprint:** Adelantado. Dos de los tres cálculos críticos en verde (13/21 tests); siguiente y último del trío: S05 (`applyChange`).

## 2026-06-17 (sesión S05) — 🎉 Hito H2 cerrado

- **Qué hice:** Sesión S05 del roadmap (rama `005-apply-change`, delegada). Implementado `applyChange` **en verde** (8/8): los tres tipos de cambio de §9.10 — tipo 1 (incidental, sin efectos), tipo 2 (impacto en coste con destino dual contingencia/presupuesto, honorarios intactos), tipo 3 (alcance: ajuste de presupuesto + honorarios + reponderación opcional). Devuelve **efectos** (deltas por partida, movimiento de contingencia, cambios de honorarios, nuevos %), sin tocar BD (ADR-006). **Con esto la suite entera queda VERDE: 22/22** (FRC 7 + EVM 7 + applyChange 8). 🎉 **Hito H2 "Corazón en verde" cerrado**: los tres cálculos críticos del briefing, completos, puros y testeados con TDD.
- **Qué bloqueó:** Nada. El modelo de entrada (`lineAdjustments` por partida, ajustado en la revisión del PR #27) encajó directo: `applyChange` solo propaga los efectos del cambio aprobado, sin inventar repartos.
- **Cómo lo resolví / qué usé de Claude Code:** ciclo TDD con la red roja de S02; un `switch` exhaustivo sobre el tipo de cambio y un helper por tipo. Refactor no necesario (la función nació declarativa). Pasada de coherencia (T014): tipos compartidos en `domain.ts`, céntimos enteros y "sin datos"=`null` consistentes en los tres cálculos, sin duplicar lógica de redondeo (cada uno tiene la suya, específica).
- **Estado del sprint:** Adelantado. **H2 cerrado** (corazón económico en verde). Siguiente hito: H3 — Persistencia (S06 spec de persistencia → S07 Prisma/Postgres en Docker).

## 2026-06-17 (sesión S06) — arranca el hito H3 (Persistencia)

- **Qué hice:** Sesión S06 del roadmap (rama `006-db-prisma-setup`, delegada). Levantado **PostgreSQL 17 en Docker** (contenedor `ipd-postgres`, BD `ipd`, puerto 5432) e inicializado **Prisma 7.8.0** (`prisma` -D + `@prisma/client`). `npx prisma init` generó `prisma/schema.prisma` (datasource PostgreSQL) y `prisma.config.ts`. Conexión Prisma↔Postgres **verificada**: `prisma migrate dev` responde "Already in sync" (aún sin modelos → sin migración basura; el esquema es S07).
- **Qué bloqueó:** Tres fricciones del stack moderno, todas resueltas. (1) pnpm 11 bloquea los build scripts de Prisma → aprobados en `pnpm-workspace.yaml` (`allowBuilds`), porque pnpm 11 ya no lee el campo `pnpm` de `package.json`. (2) Prisma 7 genera `prisma.config.ts` con `import "dotenv/config"`, pero evité añadir `dotenv` usando la carga nativa de `.env` de Node 22 (`process.loadEnvFile`). (3) Los archivos `.env*` están protegidos por permisos (no los puedo leer ni escribir): la credencial la pone Rubén (ver abajo).
- **Cómo lo resolví / qué usé de Claude Code:** verifiqué la conexión pasando `DATABASE_URL` inline al comando (Node prioriza el entorno sobre el `.env`), demostrando que toda la tubería funciona sin que el agente toque el secreto. `pnpm typecheck` / `lint` / `test` (23/23) siguen verdes.
- **Configuración local (credencial):** el `DATABASE_URL` vive en `.env` (gitignored); el formato y el placeholder están en `.env.example`. Las credenciales nunca se escriben en archivos versionados.
- **Estado del sprint:** En camino. BD viva y Prisma conectado; siguiente: S07 (esquema núcleo + seed, guiado por la tabla "almacenado vs derivado" de §7).

## 2026-06-18 (sesión S07)

- **Qué hice:** Sesión S07 del roadmap (rama `002-core-schema`, **flujo SDD completo** con Spec Kit: specify → clarify → plan → tasks → implement). Modelado el núcleo de persistencia en Prisma: `schema.prisma` con 10 modelos (`User`, `Project`, `Phase`, `Agent`, `Budget`, `BudgetLine`, `RealCost`, `Change` mínimo, `ChangeAdjustment`, `AuditEvent`) y 8 enums, migración inicial `core_schema`, y `prisma/seed.ts` que deja un estado demostrable: 5 usuarios (uno por rol), proyecto demo `DEMO-001` con sus 4 fases y 5 agentes. Contraseñas hasheadas con **argon2** (cierra el pendiente de ADR-004). Regla de oro respetada: **ninguna magnitud derivada se persiste** (§7).
- **Clarify (decisiones de Rubén):** (1) incluir `Change` mínimo para sostener `ChangeAdjustment`; (2) el seed crea proyecto demo + agentes, no solo usuarios; (3) hashear ya con argon2.
- **Qué bloqueó:** (1) Prisma 7 (generador `prisma-client`) genera el cliente como **TypeScript con imports sin extensión**, incompatible con el runner ESM nativo de Node → resuelto con `importFileExtension = "ts"` en el generador + `node --experimental-strip-types` (cero dependencias, sin `tsx`). (2) el cliente generado (`src/generated/`) no debe lintarse → añadido a `ignores` de ESLint. (3) `argon2` tiene build nativo → aprobado en `pnpm-workspace.yaml`.
- **Cómo lo resolví / qué usé de Claude Code:** flujo SDD guiado con los comandos `/speckit.*`; las 3 dudas de modelo las decidió Rubén en `clarify`. Validación: migración aplicada, seed idempotente (re-ejecutado sin duplicar), `pnpm typecheck`/`lint`/`test` (23/23) verdes.
- **Estado del sprint:** En camino. H3 (Persistencia) con BD modelada y sembrada; siguiente: S08 (spec de auth + esqueleto Express).

## 2026-06-18 (sesión S08) — arranca el hito H4 (API y auth)

- **Qué hice:** Sesión S08 (rama `003-auth-api-skeleton`, **flujo SDD completo**). Spec única **"autenticación y roles por proyecto"** (specify → clarify → plan → tasks) que cubre el QUÉ/PORQUÉ de login/sesión (S09) y de los permisos por rol en servidor con la matriz §15 (S10), con el contrato de error §14.3. Implementado solo el **esqueleto de la API** (fase Foundational, US4): **Express 5** bajo `/api` con `createApp()` separado del arranque (`index.ts`), `GET /api/health`, **contrato de error estándar** (clase `ApiError` + middleware único que normaliza `ApiError`/`ZodError`/desconocido; `INTERNAL_ERROR` sin filtrar trazas) y **validación con Zod** (config de entorno + middleware `validate()` reutilizable para S09). De paso, `prisma/seed.ts` entra por fin en el `typecheck`.
- **Clarify (decisiones de Rubén):** (1) una sola spec auth+roles, no dos; (2) estructura modular de `src/server/` (index/app + routes/middlewares/errors), puerto 3000 configurable por `PORT`; (3) solo los errores se envuelven (§14.3), el éxito va directo; (4) **Zod** como validador + **mini-ADR-009** (cierra §20.2.1).
- **Qué bloqueó:** (1) Express 5 cambió el enrutado wildcard y `req.query` es de solo lectura → not-found montado sin path y `validate()` solo valida (no reasigna). (2) Meter `seed.ts` (importa con extensión `.ts`) en el typecheck exigió `allowImportingTsExtensions` + `"prisma"` en `include` (habilitado por `@types/node`). (3) `.env*` sigue bloqueado por permisos: no pude documentar `PORT=3000` en `.env.example` (T003 pendiente para Rubén; no afecta, `config.ts` usa 3000 por defecto).
- **Cómo lo resolví / qué usé de Claude Code:** flujo SDD reproducido con los **scripts oficiales de Spec Kit** (`create-new-feature.sh`, `setup-plan.sh`, `setup-tasks.sh`), porque los slash `/speckit.*` no estaban cargados como comandos en esta sesión — mismos artefactos. Verificación doble: **27/27 tests** verdes (4 nuevos del contrato HTTP, con `fetch` nativo + puerto efímero, sin `supertest`) **y** arranque real con `node --experimental-strip-types` + `curl /api/health` → `{"status":"ok"}` y un error → JSON §14.3. `typecheck`/`lint`/`test` verdes. Único `console` añadido: arranque del server y log del `INTERNAL_ERROR` (intencionales, FR-020).
- **Estado del sprint:** En camino. H4 arrancado: esqueleto de la API listo y spec de auth+permisos escrita; siguiente: S09 (login/sesiones con `express-session` + `connect-pg-simple`).

## AAAA-MM-DD

- **Horas trabajadas:**
- **Qué hice:**
- **Qué bloqueó:**
- **Cómo lo resolví / qué usé de Claude Code:**
- **Estado del sprint:** En camino | Con retraso | Adelantado
