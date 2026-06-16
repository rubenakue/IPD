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

## AAAA-MM-DD

- **Horas trabajadas:**
- **Qué hice:**
- **Qué bloqueó:**
- **Cómo lo resolví / qué usé de Claude Code:**
- **Estado del sprint:** En camino | Con retraso | Adelantado
