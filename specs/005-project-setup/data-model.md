# Data Model — Setup de proyecto (S12)

El modelo persistente ya existe (`prisma/schema.prisma`, S07). Esta feature **escribe** en Project,
Phase, Agent y AuditEvent; no añade tablas. Resumen de lo relevante y reglas que S12 hace cumplir.

## Entidades (existentes) que S12 crea/usa

### Project
| Campo | Tipo | Notas para S12 |
|---|---|---|
| `id` | cuid | generado |
| `name` | String | obligatorio (formulario) |
| `code` | String **@unique** | obligatorio; código duplicado → rechazo (FR-001) |
| `clientName` | String | **obligatorio** (research D4) |
| `description` | String? | opcional |
| `status` | ProjectStatus | `ACTIVE` al crear |
| `activePhaseId` | String? @unique | se fija a la fase `VALIDATION` (constraint trigger valida pertenencia) |
| `plannedStartDate`/`plannedEndDate`/… | DateTime? | opcionales en S12 |

### Phase (4 fijas por proyecto)
| Campo | Tipo | Notas |
|---|---|---|
| `name` | PhaseName | `VALIDATION`, `PRE_CONSTRUCTION`, `CONSTRUCTION`, `CLOSURE` |
| `order` | Int | 1..4 en ese orden |
| `projectId` | String | `@@unique([projectId, name])` |

Al crear: se generan las 4; `VALIDATION` (order 1) queda como `activePhase`.

### Agent
| Campo | Tipo | Reglas S12 |
|---|---|---|
| `userId` | String | usuario **existente** (por email); `@@unique([userId, projectId])` → no duplicar (FR-009) |
| `projectId` | String | — |
| `role` | AgentRole | PROMOTER/DESIGNER/CONSTRUCTOR/PROJECT_MANAGER/OBSERVER; **varios por rol permitidos** |
| `sharePercent` | Int | 0–100 (FR-008) |
| `guaranteedFee` | BigInt | céntimos ≥ 0 (honorarios base) |
| `feeAtRisk` | BigInt | céntimos ≥ 0 (honorarios en riesgo) |
| `status` | AgentStatus | `ACTIVE` al crear |

El creador del proyecto se inserta como Agent `PROJECT_MANAGER` (FR-002).

### AuditEvent
`action ∈ { 'project.created', 'agent.added' }`, con `projectId`, `actorUserId`, `entityType`,
`entityId`; sin datos sensibles (FR-011).

## Derivados (NO se persisten — §7)

- **Suma de reparto** y **"setup completo"** (`sum === 100`): se calculan al vuelo con
  `validateShareSplit(agents)` (research D3). No hay columna ni flag.
- **Estado de fase** (planned/active/closed): derivado de `activePhaseId` (ya en el modelo).

## Validaciones (servidor, Zod + reglas)

- Crear proyecto: `name`, `code`, `clientName` no vacíos; `code` único (→ `CONFLICT` si existe).
- Añadir agente: `email` válido y de usuario **existente** (→ error si no); `role` válido;
  `sharePercent` entero 0–100; honorarios ≥ 0; no duplicar `(userId, projectId)`.
- Gate de configuración: `validateShareSplit` debe dar `sum === 100` para considerarla completa.

## Estado de UI (no es dato de servidor; ADR-003)

| Estado | Dónde | Propósito |
|---|---|---|
| Formulario de proyecto | `@mantine/form` en `NewProjectPage` | crear |
| Formulario/tabla de agentes | `@mantine/form` + estado local en `ProjectAgentsPage` | añadir/editar; muestra suma vía `validateShareSplit` |
| Agentes del proyecto | query `['project-agents', projectId]` | listado y suma |
