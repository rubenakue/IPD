# Data Model: Esquema núcleo de persistencia

**Feature**: 002-core-schema | **Date**: 2026-06-18

Modelo derivado de la spec y de `docs/concepto-global.md` §5, §7, §8.8, §9.2. Guía el `schema.prisma`. Convenciones: id `String @default(cuid())`; dinero `BigInt` (céntimos); `createdAt DateTime @default(now())`. **Ninguna magnitud derivada (§7) aparece como columna.**

## Enums

| Enum | Valores |
|---|---|
| `AgentRole` | `PROMOTER`, `DESIGNER`, `CONSTRUCTOR`, `PROJECT_MANAGER`, `OBSERVER` |
| `ProjectStatus` | `ACTIVE`, `ARCHIVED` |
| `PhaseName` | `VALIDATION`, `PRE_CONSTRUCTION`, `CONSTRUCTION`, `CLOSURE` |
| `BudgetStatus` | `DRAFT`, `APPROVED` |
| `AgentStatus` | `ACTIVE`, `INACTIVE` |
| `RealCostType` | `NORMAL`, `REVERSAL` |
| `ChangeType` | `INCIDENTAL`, `COST_IMPACT`, `SCOPE` |
| `ChangeStatus` | `PROPOSED`, `EVALUATED`, `APPROVED`, `REJECTED` |

## Entidades

### User — cuenta de acceso
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id cuid | |
| email | String @unique | login |
| passwordHash | String | argon2; nunca en claro |
| displayName | String | |
| createdAt | DateTime | |
| _rel_ | agents `Agent[]`, recordedCosts `RealCost[]`, progressUpdates `BudgetLine[]`, auditEvents `AuditEvent[]` | |

No tiene rol global (FR-001/FR-002).

### Project — contenedor
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id cuid | |
| name | String | |
| description | String? | |
| code | String @unique | código interno |
| clientName | String | cliente/promotor |
| status | ProjectStatus @default(ACTIVE) | active/archived (§7) |
| activePhaseId | String? @unique | puntero a la fase activa |
| plannedStartDate / plannedEndDate | DateTime? | |
| actualStartDate / actualEndDate | DateTime? | |
| deviationAlertThresholdBp | Int? | umbral de alerta en puntos básicos (p. ej. 500 = 5 %) |
| createdAt | DateTime | |
| _rel_ | phases `Phase[]` @relation("ProjectPhases"), activePhase `Phase?` @relation("ActivePhase"), agents, budget `Budget?`, changes `Change[]`, auditEvents | |

### Phase — fase fija
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id cuid | |
| projectId | String | |
| name | PhaseName | una de las 4 fijas |
| order | Int | 0..3 (orden del concepto) |
| plannedStartDate / plannedEndDate / actualStartDate / actualEndDate | DateTime? | opcionales |
| _rel_ | project `Project` @relation("ProjectPhases"), activeFor `Project?` @relation("ActivePhase") | |
| _idx_ | @@unique([projectId, name]) | una fase de cada tipo por proyecto |

**Sin columna de estado**: planned/active/closed se derivan de la posición respecto a `activePhaseId` (§7, FR-003).

### Agent — participación (User × Project)
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id cuid | |
| userId / projectId | String | |
| role | AgentRole | |
| sharePercent | Int | % de reparto FRC (entero en MVP; 0–100) |
| guaranteedFee | BigInt @default(0) | céntimos (promotor puede ser 0, §9.5) |
| feeAtRisk | BigInt @default(0) | céntimos |
| status | AgentStatus @default(ACTIVE) | desactivar ≠ borrar (§7) |
| createdAt | DateTime | |
| _rel_ | user `User`, project `Project` | |
| _idx_ | @@unique([userId, projectId]) | una participación por persona y proyecto |

### Budget — presupuesto objetivo (1:1 con Project)
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id cuid | |
| projectId | String @unique | un presupuesto por proyecto |
| status | BudgetStatus @default(DRAFT) | aprobado = base inmutable (§8.1) |
| approvedAt | DateTime? | |
| createdAt | DateTime | |
| _rel_ | project `Project`, lines `BudgetLine[]` | |

### BudgetLine — partida
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id cuid | |
| budgetId | String | |
| code / name | String | |
| baseAmount | BigInt | presupuesto base (céntimos), inmutable tras aprobar |
| progressPercent | Int? | avance físico 0–100; **null = sin avance** (≠ 0, coherente con calculateEVM) |
| progressUpdatedById | String? | User autor del último avance (§8.7) |
| progressUpdatedAt | DateTime? | |
| manualForecast | BigInt? | previsión manual opcional (céntimos) |
| _rel_ | budget, realCosts `RealCost[]`, adjustments `ChangeAdjustment[]`, progressUpdatedBy `User?` | |

**Sin columna de presupuesto vigente** (= base + Σ ajustes, derivado).

### RealCost — apunte de coste real (inmutable)
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id cuid | |
| budgetLineId | String | |
| amount | BigInt | céntimos, con signo |
| type | RealCostType @default(NORMAL) | normal / reversal |
| reversalOfId | String? | self-relation al original (solo reversal) |
| reason | String? | obligatorio si reversal (validación de app/seed) |
| recordedById | String | User que imputó |
| createdAt | DateTime | **sin `updatedAt`: inmutable** |
| _rel_ | budgetLine, recordedBy `User`, reversalOf `RealCost?` @relation("Reversals"), reversals `RealCost[]` @relation("Reversals") | |

"Anulado" = existe reversal vinculado (derivado, §8.8). El acumulado es Σ de todos los apuntes.

### Change — cambio (esqueleto mínimo)
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id cuid | |
| projectId | String | |
| type | ChangeType | |
| status | ChangeStatus @default(PROPOSED) | |
| title | String | |
| createdAt | DateTime | |
| _rel_ | project `Project`, adjustments `ChangeAdjustment[]` | |

Solo lo justo para sostener `ChangeAdjustment`; el flujo completo es de la feature de cambios.

### ChangeAdjustment — ajuste por partida
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id cuid | |
| changeId / budgetLineId | String | |
| delta | BigInt | céntimos, con signo |
| createdAt | DateTime | |
| _rel_ | change `Change`, budgetLine `BudgetLine` | |

Presupuesto vigente de partida = `baseAmount` + Σ `delta` de ajustes aprobados (derivado).

### AuditEvent — registro append-only
| Campo | Tipo | Notas |
|---|---|---|
| id | String @id cuid | |
| projectId | String? | null para eventos globales (p. ej. `user.created`) |
| actorUserId | String? | quién |
| action | String | p. ej. `project.created`, `agent.added` |
| entityType / entityId | String | sobre qué |
| metadata | Json? | datos contextuales |
| createdAt | DateTime | **sin update/delete: append-only** |
| _rel_ | project `Project?`, actorUser `User?` | |

## Relación circular Project ↔ Phase

- `Project.phases` → `Phase[]` (relación `ProjectPhases`, FK `Phase.projectId`).
- `Project.activePhaseId` (`@unique`) → `Phase` (relación `ActivePhase`); su inverso es `Phase.activeFor Project?`.
- Para evitar ciclos de borrado, las FKs usan `onDelete: Cascade` desde el lado del proyecto en `phases` y `NoAction`/`SetNull` en `activePhase` (se ajusta al implementar si Prisma exige resolver el ciclo).

## Datos del seed (estado demostrable, FR-013)

- **5 `User`** (uno por rol-objetivo): emails `promotor@`, `proyectista@`, `constructor@`, `pm@`, `observador@` (dominio de demo), `passwordHash` con argon2, contraseña en claro **solo en README**.
- **1 `Project`** de demo (código y nombre ficticios) con `status=ACTIVE`.
- **4 `Phase`** (las fijas, orden 0–3); `activePhaseId` → la de `VALIDATION`.
- **5 `Agent`** (uno por rol) vinculando cada User al proyecto, con `sharePercent`/`guaranteedFee`/`feeAtRisk` de demo coherentes (los % de los que participan en FRC suman 100; observador 0).

## Reglas de validación (de los requisitos)

- Importes siempre enteros (céntimos); sin decimales.
- `RealCost` nunca se actualiza ni borra; corrección = nuevo apunte `REVERSAL` con `reason` y `reversalOfId`.
- `AuditEvent` nunca se actualiza ni borra.
- Magnitudes derivadas (§7): ausentes del esquema por diseño (SC-004).
