# Data Model: FRC servido por rol (Fase 1)

> **Nada de esto se persiste**: el FRC es un derivado (Principio IV, §7). No hay migración ni
> tablas nuevas. Se documentan las **formas de datos** que viajan por la API y las entidades
> fuente ya existentes que las alimentan.

## Entidades fuente (ya existentes, sin cambios)

### Agent (persistido, S12)

| Campo | Tipo | Uso en FRC |
|-------|------|-----------|
| `id` | string (cuid) | identifica la fila del agente en el resultado |
| `role` | `AgentRole` (`PROMOTER`/`DESIGNER`/`CONSTRUCTOR`/`PROJECT_MANAGER`/`OBSERVER`) | decide visibilidad y si es parte del fondo |
| `sharePercent` | int 0–100 | % de reparto; `> 0` para entrar al cálculo |
| `guaranteedFee` | BigInt (céntimos) | honorarios garantizados → base del total |
| `feeAtRisk` | BigInt (céntimos) | tope de pérdida (constructor/proyectista) |

Solo los agentes con **rol de parte del fondo** (`PROMOTER`/`CONSTRUCTOR`/`DESIGNER`) y
`sharePercent > 0` se mapean a `AgentFrcTerms` y entran en `calculateFRC()`.

### Budget / BudgetLine (persistido, S13–S15)

Aporta el **vigente total** (base + ajustes de cambios aprobados) y la **previsión a cierre
total** vía `deriveBudgetLine` + `summarizeEconomics` (S15). Solo se calcula el FRC si el
`Budget` está `APPROVED`.

## Tipos de dominio (ya existentes, sin cambios)

`FrcInput`, `FrcResult`, `AgentFrcTerms`, `AgentFrcResult` en `src/types/domain.ts`
(entradas/salidas de `calculateFRC`). Céntimos enteros. No se tocan.

## Formas de respuesta API (nuevas, en `src/types/api.ts`)

Todos los importes en **céntimos enteros**. La respuesta es una **unión discriminada** por
`visibility`: el servidor solo serializa lo que el rol puede ver.

### Fila de agente en el FRC

```ts
/** Estado agregado del fondo, derivado de la desviación total. */
export type FrcFundStatus = 'bonus' | 'neutral' | 'malus';

/** Qué porción del FRC ve el solicitante (discriminante). */
export type FrcVisibility = 'global' | 'own' | 'aggregate';

/** Resultado de un agente en el reparto (solo en global/own). */
export interface FrcAgentRow {
  agentId: string;
  displayName: string;            // nombre del usuario, para presentación
  role: ProjectRoleCode;          // rol expuesto por la API (no el AgentRole de dominio)
  bonusMalusCents: number;        // + bonus / − malus
  guaranteedFeeCents: number;
  totalCents: number;             // guaranteedFee + bonusMalus
}
```

### Unión discriminada `ProjectFrcResponse`

```ts
/** Común a las tres variantes. */
interface FrcBase {
  budgetStatus: BudgetStatusCode | null;  // null / no-APPROVED → sin datos de reparto
  fundStatus: FrcFundStatus;               // bonus / neutral / malus (o neutral si sin datos)
}

/** Promotor / PM: cuadro completo. */
export interface FrcGlobalResponse extends FrcBase {
  visibility: 'global';
  deviationCents: number;
  agents: FrcAgentRow[];
}

/** Constructor / proyectista: su fila + desviación total + estado. */
export interface FrcOwnResponse extends FrcBase {
  visibility: 'own';
  deviationCents: number;
  own: FrcAgentRow | null;   // null si no hay datos de reparto; un agente 0 % usa aggregate
}

/** Observador (y no-participante sin frc.own.view efectivo): solo estado agregado. */
export interface FrcAggregateResponse extends FrcBase {
  visibility: 'aggregate';
  // sin deviationCents, sin agents, sin own — FR-009
}

export type ProjectFrcResponse =
  | FrcGlobalResponse
  | FrcOwnResponse
  | FrcAggregateResponse;
```

## Reglas de proyección (`projectFrcForRole`)

| Rol solicitante | `visibility` | Campos presentes |
|-----------------|-------------|------------------|
| PROMOTER, PROJECT_MANAGER | `global` | `budgetStatus`, `fundStatus`, `deviationCents`, `agents[]` |
| DESIGNER, CONSTRUCTOR (participa con `sharePercent > 0`) | `own` | `budgetStatus`, `fundStatus`, `deviationCents`, `own` |
| DESIGNER, CONSTRUCTOR (0 %) | `aggregate` | `budgetStatus`, `fundStatus` (FR-011) |
| OBSERVER | `aggregate` | `budgetStatus`, `fundStatus` |
| no-agente | — | 403/404: no llega a la proyección (denegado en el middleware) |

Invariantes verificables (tests):
- `global.agents` nunca vacío si hay parties con reparto; `Σ bonusMalusCents == deviationCents` (SC-002).
- `own` jamás incluye la fila de otro agente (SC-003).
- `aggregate` **no contiene** las claves `deviationCents`/`agents`/`own` (SC-004 y FR-011).
- Sin presupuesto aprobado → `fundStatus: 'neutral'`, sin filas, `budgetStatus` refleja el estado real.
