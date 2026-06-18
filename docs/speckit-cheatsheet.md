# Spec Kit / `specify` — Cheatsheet

> Comandos para tener a mano. Windows + PowerShell. Explicación conceptual en
> `docs/spec-driven-development.md`.
> Los comandos de agente dependen del adaptador local disponible; `specify ...` y
> `uv ...` se ejecutan en la terminal.

## Prerrequisitos (verificar)

```powershell
uv --version       # requerido (gestiona la CLI specify)
specify check      # comprueba CLI y entorno
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

Crea `.specify/` y puede añadir comandos al agente elegido. Los adaptadores de agente
(`.claude`, `.codex`, `.agents`) son locales e ignorados por git.

## El flujo, paso a paso

| Orden | Comando | Qué hace |
|------|---------|----------|
| 1 | `constitution` | Crea/actualiza la constitución (`.specify/memory/constitution.md`) |
| 2 | `specify <feature>` | Escribe la spec: QUÉ y POR QUÉ (sin tecnología) |
| 3 | `clarify` | Resuelve ambigüedades de la spec preguntándote |
| 4 | `checklist` | Valida calidad/completitud de los requisitos |
| 5 | `plan <stack>` | Plan técnico con tu stack (respeta ADRs) |
| 6 | `tasks` | Desglosa en tareas accionables |
| 7 | `analyze` | Coherencia spec ↔ plan ↔ tasks (antes de implementar) |
| 8 | `implement` | Implementa según el plan |

- Ruta rápida (experimentos): `specify` → `plan` → `tasks` → `implement`.
- Ruta completa (features de negocio IPD): incluye `clarify`, `checklist`, `analyze`.

## El ciclo por feature en IPD

1. Rama de feature (spec-kit detecta la feature por la rama): `git checkout -b 001-frc`
2. `specify` → `clarify` → `checklist`
3. GATE: el stack debe estar en `docs/adr/` antes de `plan`
4. `plan` → `tasks` → `analyze`
5. TDD: tests en rojo → `implement` (o manual) hasta verde → refactor
6. `pnpm typecheck` + `pnpm lint` + `pnpm test` + agente `code-reviewer` → commit (Conventional Commits)

## Workflows (opcional, avanzado)

```powershell
specify workflow run speckit -i spec="..."   # encadena specify->plan->tasks->implement con gates
specify workflow status                       # estado de ejecuciones
```

## Recordatorios IPD

- `plan` usa los ADRs del stack; si falta una decisión, usa `stack-architect` / `$ipd-stack-architect`.
- Una feature por rama; la constitución y los ADRs mandan.
- La spec no lleva tecnología; el plan sí.
