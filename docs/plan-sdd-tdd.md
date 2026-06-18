# Plan de trabajo: SDD + TDD + stack-architect

> Cómo se trabaja en este proyecto desde el minuto cero. El contexto común vive en
> `AGENTS.md`. Los roles personales viven en `.agents/roles/` y se invocan mediante
> adaptadores locales: Claude Code (`.claude/commands` y `.claude/agents`) y Codex
> (`.agents/skills` y `.codex/agents`). `.agents`, `.claude` y `.codex` son locales
> e ignorados por git.

## Los dos conceptos, en una frase cada uno

- **SDD (Spec-Driven Development)**: primero se escribe y aprueba la *spec* (qué debe
  hacer la feature y por qué, sin hablar de tecnología); el código se deriva de ella.
  Herramienta: GitHub Spec Kit (`specify`), con la constitución del proyecto en
  `.specify/memory/constitution.md` como ley suprema.
- **TDD (Test-Driven Development)**: primero se escribe un test que falla (**red**),
  luego el código mínimo que lo hace pasar (**green**), luego se limpia (**refactor**).
  En este proyecto es obligatorio en los 3 cálculos críticos: `calculateEVM`,
  `calculateFRC` y `applyChange`.

Cómo encajan: la spec dice QUÉ construir; los tests traducen la spec a comprobaciones
ejecutables; el código solo existe para poner los tests en verde. SDD y TDD son la
misma filosofía a dos alturas distintas.

## Orden de arranque (los roles y sus dependencias)

```
1. stack-architect / $ipd-stack-architect  ─► ADR nuevo solo si falta una decision
2. sdd-speckit / $ipd-sdd-speckit          ─► constitucion + specs + plan/tasks
3. tdd-harness / $ipd-tdd-harness          ─► TDD incremental sobre Vitest
```

1. **`stack-architect` / `$ipd-stack-architect`** (primero, es el cimiento). Entrevista en lenguaje llano:
   te explica cada concepto, te da opciones con pros/contras y recomendación, y lo
   documenta todo en `docs/adr/`. Salida clave: el framework de tests, que desbloquea TDD.
2. **`sdd-speckit` / `$ipd-sdd-speckit`**. Instala Spec Kit (`uv` ya está instalado ✓), redacta la
   constitución contigo y crea specs. Puede arrancar sin tocar código; el plan técnico
   usa los ADRs ya aceptados.
3. **`tdd-harness` / `$ipd-tdd-harness`**. Con el framework decidido: configura los tests, crea los
   esqueletos puros en `src/lib/calculations/` y deja los tests de los 3 cálculos
   EN ROJO, listos para el ciclo red-green-refactor.

**Modo recomendado**: secuencial, en este mismo repo, una sesión por rol (eres una
sola persona y vas a interactuar con cada rol). La alternativa del documento original
(worktrees `../IPD-stack`, `../IPD-sdd`, `../IPD-tdd` con ramas `agents/*` e integración
manual) sigue siendo válida si algún día quieres paralelizar, pero añade fricción de
merge que ahora no compensa.

## El ciclo de cada feature (una vez hecho el arranque)

1. **Spec** — Spec Kit `specify`: qué y por qué, cero tecnología.
2. **Clarify** — Spec Kit `clarify`: el agente te pregunta las ambigüedades; respóndelas.
3. **Plan** — Spec Kit `plan`: cómo se implementa con NUESTRO stack (respeta ADRs y constitución).
4. **Tasks** — Spec Kit `tasks`: lista de tareas pequeñas y ordenadas.
5. **Red** — tests primero para la lógica de la feature (si toca cálculo, obligatorio).
6. **Green** — Spec Kit `implement` o implementación manual: código mínimo hasta verde.
7. **Refactor** — limpiar con la red de seguridad en verde.
8. **Verificar** — `pnpm typecheck`, `pnpm lint`, `pnpm test` + agente `code-reviewer` antes de commitear.
9. **Commit** (Conventional Commits) y entrada en `docs/diario.md` si la sesión fue significativa.

## Reglas de oro mientras aprendes

- Si un paso no lo entiendes, dilo: todos los roles tienen orden de explicarse en
  lenguaje simple. No avances con dudas — la spec mal entendida se paga en código.
- Rojo no es fracaso: un test en rojo ANTES de implementar es la señal de que el
  test sirve. Desconfía del test que nace en verde.
- La constitución y los ADRs mandan. Si el agente propone algo que los contradice,
  o se cambia el ADR (conscientemente, documentándolo) o se cambia la propuesta.
- Una spec por feature, una feature por rama si quieres orden: `feature/<nombre-spec>`.

## Estado de prerequisitos (10-jun-2026)

| Pieza | Estado |
|---|---|
| Node 22 / git / pnpm | ✓ instalados |
| `uv` (requisito de Spec Kit) | ✓ 0.11.14 |
| `gh` CLI | ✓ 2.93.0 |
| CLI `specify` | verificar en la sesión SDD |
| ADRs de stack | aceptados en `docs/adr/001..008` |
| Harness de tests | Vitest configurado; mantener con TDD incremental |

## Primer hito sugerido

Sesión siguiente: usa `delivery-planner` / `$ipd-delivery-planner` para escoger el siguiente bloque de 3-4 h con gate de validación.
