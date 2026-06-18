# Spec-Driven Development (SDD) en IPD

> Guía de aprendizaje + referencia. Explica qué es SDD, cómo funciona GitHub Spec Kit
> y su CLI `specify`, y cómo se aplica en este proyecto.
> Para los comandos sueltos tienes `docs/speckit-cheatsheet.md`.

## 1. Qué es SDD (en una frase)

Spec-Driven Development = primero escribes y apruebas la *especificación* (QUÉ debe
hacer una feature y POR QUÉ, **sin hablar de tecnología**); el código es una
consecuencia de esa spec, no al revés.

Contraste:
- Forma habitual ("vibe coding"): describes a medias lo que quieres y el agente
  improvisa código. Los malentendidos aparecen tarde, ya metidos en el código.
- SDD: la spec es la fuente de verdad. Se refina y valida antes de programar. El
  agente implementa contra una spec aprobada.

## 2. Por qué SDD encaja en IPD

- El dominio IPD es conceptualmente difícil (FRC, EVM, los 3 tipos de cambio). Un
  error en el modelo se arrastra a todo. La spec obliga a fijar el QUÉ antes de teclear.
- El briefing ya pide una "constitución" del proyecto y ADRs: SDD lo formaliza.
- Estás aprendiendo: la spec en lenguaje de negocio te deja revisar y decidir sin leer código.

## 3. Las piezas de Spec Kit

- **Spec Kit**: toolkit open source de GitHub (`github/spec-kit`). Implementa SDD para agentes de IA.
- **CLI `specify`**: la herramienta de terminal. Está escrita en Python y se ejecuta con
  **uv** (Astral). No es una dependencia de tu proyecto Node.
- **Artefactos** (todos en Markdown, versionados en git):
  - **Constitución** — `.specify/memory/constitution.md`: los principios innegociables.
    Es la ley suprema; toda spec y todo plan la respetan.
  - **Spec** — `specs/NNN-nombre/spec.md`: el QUÉ y el PORQUÉ de una feature.
  - **Plan** — `specs/NNN-nombre/plan.md`: el CÓMO técnico (ya con tu stack).
  - **Tasks** — `specs/NNN-nombre/tasks.md`: lista de tareas accionables.

## 4. Prerrequisitos

- `uv` — ✓ 0.11.19 (instalado).
- CLI `specify` — verificar con `specify check`.
- Agente IA — usa el adaptador local que tengas: Claude (`.claude/commands`) o Codex (`.agents/skills`).

## 5. Instalación (resumen; detalle en el cheatsheet)

1. Instala la CLI con uv: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git`
2. Comprueba el entorno: `specify check`
3. Inicializa Spec Kit en este repo (Windows → scripts PowerShell): `specify init . --script ps`
   (confirma el flag de integración de agente con `specify init --help`).
   - Crea `.specify/` y puede añadir comandos al agente elegido. Esos adaptadores son locales e ignorados por git.

## 6. El flujo SDD completo

Cada paso produce un artefacto que alimenta al siguiente:

1. **constitution** — crea/actualiza la constitución (principios del proyecto).
2. **specify** — describe la feature: QUÉ y POR QUÉ. Cero tecnología.
3. **clarify** — el agente te pregunta las ambigüedades; tú las resuelves.
4. **checklist** — valida que los requisitos están completos y sin ambigüedad.
5. **plan** — el CÓMO técnico, ya con tu stack (respeta ADRs y constitución).
6. **tasks** — desglosa el plan en tareas pequeñas y ordenadas.
7. **analyze** — comprueba coherencia entre spec, plan y tasks ANTES de implementar.
8. **implement** — ejecuta las tareas y construye la feature.

Ruta rápida (experimentos): specify → plan → tasks → implement.
Ruta completa (features de negocio IPD): añade clarify, checklist y analyze como puertas de calidad.

Detalle importante: Spec Kit detecta la feature activa por la **rama git** (p. ej. `001-frc`).
Cambiar de feature = cambiar de rama. Trabaja una feature por rama.

## 7. Cómo se aplica en IPD (concreto)

- **Constitución de IPD**: codifica los innegociables del briefing y de `AGENTS.md`: TDD
  estricto en `calculateEVM`/`calculateFRC`/`applyChange`; TypeScript strict sin `any`;
  nombres de entidades en inglés (`Project`, `Budget`, `FRC`...); "libros abiertos" como
  principio de producto; seguridad y filtrado por rol en servidor; toda decisión técnica →
  ADR; sin secretos; explicaciones en lenguaje simple.
- **GATE con el stack**: el plan técnico usa `docs/adr/001..008`, que ya fijan el stack.
  Si falta una decisión nueva, pasa por `stack-architect` / `$ipd-stack-architect`.
- **Primera spec de ejemplo**: el **FRC** (estado del Fondo de Riesgo Compartido por agente:
  honorarios garantizados + bonus/malus + resultado proyectado "si el proyecto cerrara hoy").
- **Las tres capas — SDD ↔ ADR ↔ TDD**:
  - SDD/spec = QUÉ y POR QUÉ (negocio).
  - ADR = CON QUÉ (tecnología elegida y por qué).
  - TDD/tests = la spec traducida a comprobaciones ejecutables; el código existe para ponerlas en verde.
- **Dónde encaja con tus roles**: `sdd-speckit` / `$ipd-sdd-speckit` enseña y guía el flujo;
  luego cada feature sigue los pasos de Spec Kit con el adaptador disponible.

## 8. Errores comunes a evitar

- Meter tecnología en la spec (frameworks, APIs): eso va en el plan, no en la spec.
- Saltarse clarify/analyze en features con ambigüedad: se paga en la implementación.
- Editar la constitución a la ligera: está protegida por hook (pide confirmación). Cambiarla
  es una decisión consciente, no un trámite.

## 9. Referencias

- Repo: https://github.com/github/spec-kit
- Docs: https://github.github.io/spec-kit/
- Tu plan de trabajo: `docs/plan-sdd-tdd.md` · Roles locales: `.agents/roles/`
