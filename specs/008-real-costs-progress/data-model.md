# Data Model — Costes reales y avance físico (S14)

> El modelo ya existe en el esquema (migración `core_schema`, S07). Aquí se documenta cómo se
> usa en S14 y los **refuerzos additivos** que añade esta feature. No se rediseña nada.

## RealCost (asiento de coste real) — existente

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `budgetLineId` | String | FK → `BudgetLine` (ON DELETE CASCADE) |
| `amount` | BigInt | **céntimos, con signo**. NORMAL > 0; REVERSAL = −(original) |
| `type` | `RealCostType` | `NORMAL` \| `REVERSAL` (default NORMAL) |
| `reversalOfId` | String? | FK → `RealCost` (solo en REVERSAL) |
| `reason` | String? | motivo (obligatorio en REVERSAL, null en NORMAL) |
| `recordedById` | String | FK → `User` (autor) |
| `createdAt` | DateTime | momento de registro |

**Campos no modelados aún en el esquema y que esta feature NO añade** (clarify): `description`,
`date` del coste. → **Decisión de implementación**: el spec exige importe + **fecha** +
**descripción**. Como el esquema actual de `RealCost` no tiene esos dos campos, la migración de
S14 los **añade** (`description TEXT NOT NULL`, `incurredOn DATE NOT NULL` o equivalente). El
contra-asiento hereda la descripción/fecha o usa el motivo como descripción (ver contratos).

### Constraints ya existentes (S07)
- `RealCost_reversal_fields_check`: `NORMAL` ⇒ `reversalOfId` NULL y `reason` NULL; `REVERSAL`
  ⇒ `reversalOfId` NOT NULL y `reason` NOT NULL no vacío. **Ya garantiza el motivo obligatorio.**
- `RealCost_reversal_not_self_check`: `reversalOfId <> id`.
- FKs: `budgetLineId` (CASCADE), `recordedById` (RESTRICT), `reversalOfId` (SET NULL).

### Refuerzos additivos de S14 (migración nueva)
- **Inmutabilidad** (D1): trigger `BEFORE UPDATE ON "RealCost"` → excepción. Solo UPDATE: el
  borrado de un asiento individual no se expone por la API (+ RLS), y bloquear `DELETE` en el
  trigger impediría el borrado **en cascada** legítimo de un proyecto.
- **Una anulación por coste** (D2): `CREATE UNIQUE INDEX ON "RealCost"("reversalOfId") WHERE
  "type" = 'REVERSAL'`.
- **Nuevos campos** del coste: `description` (texto no vacío, NOT NULL en toda fila; en un
  contra-asiento se rellena con el motivo) y fecha del coste (`incurredOn`, DATE NOT NULL).
  CHECK de descripción no vacía análogo a otros del esquema.

> Nota sobre la FK `reversalOfId ON DELETE SET NULL`: con la inmutabilidad (no se borra ningún
> `RealCost`) esa cláusula deja de ser alcanzable en la práctica; no se modifica (additivo).

## BudgetLine (partida) — avance físico, existente

| Campo | Tipo | Notas |
|-------|------|-------|
| `progressPercent` | Int? | 0–100; `null` = sin avance (≠ 0%) |
| `progressUpdatedById` | String? | FK → `User` (autor del último avance) |
| `progressUpdatedAt` | DateTime? | fecha del último avance |

### Refuerzo additivo de S14
- **CHECK** `progressPercent IS NULL OR (progressPercent BETWEEN 0 AND 100)` (D5).

## Derivados (NO se persisten)

| Derivado | Cálculo | Dónde |
|----------|---------|-------|
| Coste real acumulado de la partida | `Σ amount` de sus `RealCost` (REVERSAL resta) | `src/lib/budget/real-costs.ts` |
| Condición "anulado" de un asiento | el NORMAL tiene un REVERSAL con `reversalOfId = id` | idem |
| EV de la partida | (S15+) `presupuesto vigente × progressPercent` | fuera de S14 |

## Reglas de validación (servidor)

- Imputar (NORMAL): `amount > 0`; `description` no vacía; `date` válida; partida del proyecto;
  **presupuesto APPROVED**. Rol: constructor o PM.
- Anular (REVERSAL): original existe, es `NORMAL`, sin reversal previo; `reason` obligatorio;
  el sistema fija `amount = −original.amount`, `reversalOfId = original.id`. Rol: PM.
  Presupuesto APPROVED.
- Avance: entero 0–100; partida del proyecto; **presupuesto APPROVED**. Rol: constructor o PM.

## Auditoría (append-only)

`realCost.created`, `realCost.voided`, `progress.updated` — cada una con autor, momento y
entidad afectada (best-effort, vía `safeRecordAuditEvent`).
