# Data Model: Presupuesto objetivo (flujo B)

## Budget

| Field | Type | Notes |
|---|---|---|
| `id` | String | Identificador |
| `projectId` | String unique | Un presupuesto por proyecto |
| `status` | `DRAFT` / `APPROVED` | Solo transición `DRAFT -> APPROVED` |
| `approvedAt` | DateTime? | Se fija al aprobar |
| `createdAt` | DateTime | Creación |

Rules:

- `DRAFT`: el PM puede añadir, editar y borrar partidas.
- `APPROVED`: línea base inmutable; no se reabre en S13.
- `approvedAt` solo puede cambiar desde `null` al timestamp de aprobación.

## BudgetLine

| Field | Type | Notes |
|---|---|---|
| `id` | String | Identificador |
| `budgetId` | String | FK a `Budget` |
| `chapterCode` | String | Código de capítulo, requerido |
| `chapterName` | String | Nombre de capítulo, requerido |
| `code` | String | Código de partida, requerido para aprobar |
| `name` | String | Nombre de partida |
| `baseAmount` | BigInt | Céntimos, `>= 0` |
| `progressPercent` | Int? | Ya existente, fuera de S13 |
| `manualForecast` | BigInt? | Ya existente, fuera de S13 |

Rules:

- En borrador se permiten códigos de partida duplicados.
- Para aprobar: mínimo una partida, total > 0, todos los importes `>= 0`, códigos de partida no
  vacíos y únicos tras trim + lower case.
- Dos partidas con el mismo `chapterCode` deben tener el mismo `chapterName`; si no, el servidor
  rechaza la entrada/edición.
- Los subtotales por capítulo y el total general son derivados, no columnas.

## API Views

`BudgetView` agrupa las partidas por capítulo:

- `id`, `projectId`, `status`, `approvedAt`, `createdAt`
- `totalBaseAmountCents`
- `chapters[]`: `chapterCode`, `chapterName`, `subtotalBaseAmountCents`, `lines[]`

`BudgetLineView`:

- `id`, `chapterCode`, `chapterName`, `code`, `name`, `baseAmountCents`

