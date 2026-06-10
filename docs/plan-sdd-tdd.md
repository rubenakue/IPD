# Plan de trabajo: SDD + TDD + stack-architect

> Cómo se trabaja en este proyecto desde el minuto cero. Los tres roles especializados
> viven en `docs/agents/` y se invocan en Claude Code con `/stack-architect`,
> `/sdd-speckit` y `/tdd-harness` (en Codex/Hermes: "adopta el rol de docs/agents/X.md").

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
1. /stack-architect  ──────────────►  ADRs 001..00N (gate: decide framework de tests)
2. /sdd-speckit (constitución+spec)   en paralelo o después — su /speckit.plan ESPERA al stack
3. /tdd-harness  ─────────────────►  solo cuando exista el ADR de testing
```

1. **`/stack-architect`** (primero, es el cimiento). Entrevista en lenguaje llano:
   te explica cada concepto, te da opciones con pros/contras y recomendación, y lo
   documenta todo en `docs/adr/`. Salida clave: el framework de tests, que desbloquea TDD.
2. **`/sdd-speckit`**. Instala Spec Kit (`uv` ya está instalado ✓), redacta la
   constitución contigo y crea la primera spec de ejemplo (el FRC). Puede arrancar
   en paralelo con el stack — la constitución es agnóstica de tecnología — pero
   NO pasa de `/speckit.plan` hasta que el stack esté cerrado.
3. **`/tdd-harness`**. Con el framework decidido: configura los tests, crea los
   esqueletos puros en `src/lib/calculations/` y deja los tests de los 3 cálculos
   EN ROJO, listos para el ciclo red-green-refactor.

**Modo recomendado**: secuencial, en este mismo repo, una sesión por rol (eres una
sola persona y vas a interactuar con cada rol). La alternativa del documento original
(worktrees `../IPD-stack`, `../IPD-sdd`, `../IPD-tdd` con ramas `agents/*` e integración
manual) sigue siendo válida si algún día quieres paralelizar, pero añade fricción de
merge que ahora no compensa.

## El ciclo de cada feature (una vez hecho el arranque)

1. **Spec** — `/speckit.specify <feature>`: qué y por qué, cero tecnología.
2. **Clarify** — `/speckit.clarify`: el agente te pregunta las ambigüedades; respóndelas.
3. **Plan** — `/speckit.plan`: cómo se implementa con NUESTRO stack (respeta ADRs y constitución).
4. **Tasks** — `/speckit.tasks`: lista de tareas pequeñas y ordenadas.
5. **Red** — tests primero para la lógica de la feature (si toca cálculo, obligatorio).
6. **Green** — `/speckit.implement` o implementación manual: código mínimo hasta verde.
7. **Refactor** — limpiar con la red de seguridad en verde.
8. **Verificar** — `/verify` + agente `code-reviewer` antes de commitear.
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
| CLI `specify` | pendiente — la instala `/sdd-speckit` |
| ADRs de stack | pendientes — los produce `/stack-architect` |
| Harness de tests | pendiente — lo monta `/tdd-harness` (tras el stack) |

## Primer hito sugerido

Sesión 1: `/stack-architect` completo (1-2 h de entrevista tranquila).
Sesión 2: `/sdd-speckit` (constitución + spec FRC).
Sesión 3: `/tdd-harness` (tests en rojo).
Sesión 4: empezar `src/types/domain.ts` + módulo 1 (auth/roles) ya con el flujo completo.
