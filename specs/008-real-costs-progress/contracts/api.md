# API Contracts — Costes reales y avance físico (S14)

Todos los endpoints: `requireAuth` + `requireProjectPermission(...)` + RLS por proyecto.
Importes en **céntimos** en el contrato (enteros). Errores con el sobre estándar `§14.3`
(`{ error: { code, message, details? } }`): `VALIDATION_ERROR` (400), `FORBIDDEN` (403),
`NOT_FOUND` (404), `DOMAIN_ERROR` (422), `CONFLICT` (409).

## GET /api/projects/:projectId/budget/lines/:lineId

Detalle de una partida con sus asientos, el acumulado y el avance. Permiso: `project.view`.

**200 OK** — `BudgetLineDetailView`:
```jsonc
{
  "id": "ckl...",
  "chapterCode": "02", "chapterName": "Cimentación",
  "code": "02.01", "name": "Losa", "baseAmountCents": 50000000,
  "progressPercent": 40,            // null si sin avance
  "progressUpdatedAt": "2026-06-29T10:00:00.000Z", // null si sin avance
  "accumulatedCostCents": 12000000, // Σ asientos (los REVERSAL restan)
  "costs": [
    { "id": "c1", "amountCents": 15000000, "type": "NORMAL",
      "description": "Factura hormigón", "incurredOn": "2026-06-20",
      "recordedByName": "Ana", "createdAt": "...", "voided": true, "reversalOfId": null },
    { "id": "c2", "amountCents": -15000000, "type": "REVERSAL",
      "description": "Importe erróneo", "reason": "Importe erróneo", "incurredOn": "2026-06-21",
      "recordedByName": "PM", "createdAt": "...", "voided": false, "reversalOfId": "c1" }
  ]
}
```
- `404 NOT_FOUND` si la partida no existe o no pertenece al proyecto.

## POST /api/projects/:projectId/budget/lines/:lineId/costs

Imputar un coste real (asiento NORMAL). Permiso: `realCost.create` (constructor o PM).

**Request** `AddRealCostRequest`:
```jsonc
{ "amountCents": 15000000, "incurredOn": "2026-06-20", "description": "Factura hormigón" }
```
- `amountCents`: entero **> 0**. `incurredOn`: fecha válida (ISO `YYYY-MM-DD`).
  `description`: string no vacío.

**201 Created** → `BudgetLineDetailView` actualizado.

**Errores**: `VALIDATION_ERROR` (importe ≤ 0, fecha/descr. inválidas); `DOMAIN_ERROR` si el
presupuesto **no está APPROVED**; `FORBIDDEN` si el rol no puede; `404` si la partida no es del
proyecto.

## POST /api/projects/:projectId/budget/costs/:costId/reversal

Anular un coste con un contra-asiento. Permiso: `realCost.reverse` (solo PM).

**Request** `ReverseRealCostRequest`:
```jsonc
{ "reason": "Importe erróneo" }   // obligatorio, no vacío
```
El servidor crea un `RealCost` `REVERSAL` con `amountCents = −original`, `reversalOfId = costId`,
`reason`, autor = PM actual. El original no se toca.

**201 Created** → `BudgetLineDetailView` actualizado (el original aparece `voided: true`).

**Errores**: `VALIDATION_ERROR` (motivo vacío); `CONFLICT` si el coste ya está anulado o si el
`costId` es un contra-asiento (no se anula un REVERSAL); `DOMAIN_ERROR` si el presupuesto no
está APPROVED; `FORBIDDEN` si no es PM; `404` si el coste no es del proyecto.

## PATCH /api/projects/:projectId/budget/lines/:lineId/progress

Registrar el avance físico. Permiso: `progress.update` (constructor o PM).

**Request** `UpdateProgressRequest`:
```jsonc
{ "progressPercent": 60 }   // entero 0–100
```

**200 OK** → `BudgetLineDetailView` (con `progressPercent`, `progressUpdatedAt` actualizados).

**Errores**: `VALIDATION_ERROR` (fuera de 0–100); `DOMAIN_ERROR` si el presupuesto no está
APPROVED; `FORBIDDEN` si el rol no puede; `404` si la partida no es del proyecto.

## Notas de contrato

- El acumulado y `voided` son **derivados** servidos en cada respuesta; no se persisten.
- Inmutabilidad: **no existen** endpoints `PUT/PATCH/DELETE` sobre un `RealCost`.
- Auditoría: `realCost.created` (imputar), `realCost.voided` (anular), `progress.updated`
  (avance).
