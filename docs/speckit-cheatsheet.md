# Spec Kit / `specify` — Cheatsheet

> Comandos para tener a mano. Windows + PowerShell. Explicación conceptual en
> `docs/spec-driven-development.md`.
> Los comandos `/speckit.*` se escriben **dentro de Claude Code**; los `specify ...` y
> `uv ...`, en la **terminal**.

## Prerrequisitos (verificar)

```powershell
uv --version       # requerido (gestiona la CLI specify)
claude --version   # donde se usan los /speckit.*
```

## Instalar / actualizar la CLI `specify`

```powershell
# Instalar (persistente) desde el repo oficial
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# Alternativa sin instalar (efímero, se descarga cada vez)
uvx --from git+https://github.com/github/spec-kit.git specify <subcomando>

# Comprobar entorno y herramientas de agente detectadas
specify check

# Actualizar la CLI ya instalada
specify self upgrade
```

## Inicializar Spec Kit en ESTE repo

```powershell
# En la raíz del repo (C:\Users\ruben\Dev\IPD).
#   .          -> inicializa en el repo actual (alternativa: --here)
#   --script ps -> genera los scripts en PowerShell (Windows)
specify init . --script ps

# Confirma el flag de integración de agente para TU versión:
specify init --help
#   Segun version:  --ai claude  (antiguas)  |  --integration claude  (recientes)
```

Crea `.specify/` y añade los comandos `/speckit.*` a Claude Code (en `.claude/commands/`,
sin pisar los tuyos).

## El flujo, paso a paso (en Claude Code)

| Orden | Comando | Qué hace |
|------|---------|----------|
| 1 | `/speckit.constitution <principios>` | Crea/actualiza la constitución (`.specify/memory/constitution.md`) |
| 2 | `/speckit.specify <feature>` | Escribe la spec: QUÉ y POR QUÉ (sin tecnología) |
| 3 | `/speckit.clarify` | Resuelve ambigüedades de la spec preguntándote |
| 4 | `/speckit.checklist` | Valida calidad/completitud de los requisitos |
| 5 | `/speckit.plan <stack>` | Plan técnico con tu stack (respeta ADRs) |
| 6 | `/speckit.tasks` | Desglosa en tareas accionables |
| 7 | `/speckit.analyze` | Coherencia spec ↔ plan ↔ tasks (antes de implementar) |
| 8 | `/speckit.implement` | Implementa según el plan |

- Ruta rápida (experimentos): `specify` → `plan` → `tasks` → `implement`.
- Ruta completa (features de negocio IPD): incluye `clarify`, `checklist`, `analyze`.

## El ciclo por feature en IPD

1. Rama de feature (spec-kit detecta la feature por la rama): `git checkout -b 001-frc`
2. `/speckit.specify` → `/speckit.clarify` → `/speckit.checklist`
3. GATE: el stack debe estar en `docs/adr/` antes de `/speckit.plan`
4. `/speckit.plan` → `/speckit.tasks` → `/speckit.analyze`
5. TDD: tests en rojo → `/speckit.implement` (o manual) hasta verde → refactor
6. `/verify` + agente `code-reviewer` → commit (Conventional Commits)

## Workflows (opcional, avanzado)

```powershell
specify workflow run speckit -i spec="..."   # encadena specify->plan->tasks->implement con gates
specify workflow status                       # estado de ejecuciones
```

## Recordatorios IPD

- `/speckit.plan` espera a los ADRs del stack (rol `/stack-architect`).
- Una feature por rama; la constitución y los ADRs mandan.
- La spec no lleva tecnología; el plan sí.
