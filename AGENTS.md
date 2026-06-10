# IPD — Plataforma de gestión de proyectos IPD (prototipo)

> **Fuente canónica de contexto para cualquier agente de IA** (Claude Code, Codex, Hermes...).
> Claude Code la carga vía `CLAUDE.md` (que solo contiene `@AGENTS.md`). No dupliques contexto en otros archivos.

## Qué es este proyecto

Prototipo de plataforma web para gestionar proyectos de construcción bajo metodología
**IPD (Integrated Project Delivery)**: libros abiertos, Fondo de Riesgo Compartido (FRC),
control económico con EVM, gestión de cambios tipificada, registro de riesgos/contingencias
e incidencias/decisiones. Cliente de dominio: Vivare. El briefing completo y la documentación
de dominio están en `Doc inicial/` (solo local, ignorado por git: contiene material real de cliente).

## Stack

- **DECIDIDO**: Node 20+, TypeScript strict (prohibido `any` y `@ts-ignore` nuevos), pnpm, React.
- **ABIERTO** (pendiente de ADR — se decide con la entrevista `/stack-architect`): backend/BD,
  librería UI, gestión de estado, routing, framework de tests, auth, gráficos, despliegue.
- Toda decisión de stack/arquitectura queda documentada en `docs/adr/`.

## Layout

- `src/types/domain.ts` — entidades de dominio (el punto de partida de todo)
- `src/lib/calculations/` — lógica de cálculo PURA, sin I/O ni efectos: EVM, FRC, motor de cambios
- `src/lib/api/` — acceso a datos
- `src/components/ui` y `src/components/domain`, `src/pages`, `src/hooks` — frontend React
- `tests/` — tests · `docs/adr/` — ADRs · `docs/diario.md` — diario de desarrollo
- `specs/` y `.specify/` — Spec-Driven Development (GitHub Spec Kit)
- `docs/agents/` — roles canónicos de los agentes especializados (stack, SDD, TDD)

## Comandos (los únicos válidos)

- Typecheck: `pnpm typecheck`
- Tests: `pnpm test` (cuando exista; lo define el ADR de testing)
- Lint: `pnpm lint` (cuando exista)

## Reglas de dominio (innegociables del briefing)

- Entidades de dominio en inglés con estos nombres exactos: `Project`, `Phase`, `Budget`,
  `BudgetLine`, `RealCost`, `Risk`, `Change`, `Incident`, `Decision`, `Agent`, `FRC`.
- Código, identificadores y commits en inglés; UI y textos de negocio en español.
- Los 3 cálculos críticos (`calculateEVM`, `calculateFRC`, `applyChange`) se desarrollan
  con TDD estricto y viven como funciones puras en `src/lib/calculations/`. Sus tests son innegociables.
- La seguridad y el filtrado por rol se aplican en servidor, nunca solo en frontend
  (el promotor tiene vista privada de sus costes de desarrollo).
- Sin secretos en el repo; `.env.example` siempre actualizado.

## Metodología de trabajo (premisas del proyecto)

- **SDD (Spec-Driven Development)** con GitHub Spec Kit: ninguna feature sin spec previa.
  La constitución vive en `.specify/memory/constitution.md`. Flujo: constitution → specify →
  clarify → plan → tasks → implement. Plan completo en `docs/plan-sdd-tdd.md`.
- **TDD**: ciclo red → green → refactor en toda la lógica de cálculo. Cada bug arreglado
  deja un test que lo habría detectado.
- **ADRs**: toda decisión de arquitectura o tecnología → `docs/adr/NNN-titulo.md`.
- Cada sesión de trabajo significativa se anota en `docs/diario.md`.
- **El usuario está aprendiendo SDD y TDD**: cuando los apliques, explica los conceptos
  con lenguaje simple y sin asumir conocimiento previo. Lo mismo con tecnologías web nuevas.

## Definición de "terminado"

Una tarea NO está terminada hasta que: `pnpm typecheck` pasa, los tests pasan,
y no hay `console.log` ni código muerto añadido. El hook de Stop lo verifica;
no intentes terminar con errores de tipos.

## Workflow

- Tareas de >2 archivos: plan primero, código después.
- Un commit por unidad lógica. Nunca `git commit --no-verify` (bloqueado por hook).
- No edites configs de lint/format/types para silenciar errores: arregla el código.
- Antes de instalar una dependencia nueva, propónla y justifica cuál y por qué.
