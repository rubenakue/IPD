# API Contracts — Derivados económicos (S15)

`requireAuth` + `requireProjectPermission` + RLS. Importes en **céntimos** (enteros con signo).
Errores con el sobre estándar §14.3.

## GET /api/projects/:projectId/economics

Vista económica del proyecto: derivados por partida, capítulo y total. Permiso `project.view`.

**200 OK** — `ProjectEconomicsResponse`:
```jsonc
{
  "budgetStatus": "APPROVED",          // o "DRAFT" / null si no hay presupuesto
  "canUpdateForecast": true,           // forecast.update (constructor/PM)
  "chapters": [
    {
      "chapterCode": "01", "chapterName": "Cimentación",
      "currentBudgetCents": 17000000, "accumulatedCostCents": 1500000,
      "forecastCents": 17000000, "varianceCents": 0, "variancePercent": 0,
      "alertLevel": "normal",
      "lines": [
        {
          "id": "ckl...", "code": "01.01", "name": "Excavación",
          "baseAmountCents": 5000000, "adjustmentsCents": 0,
          "currentBudgetCents": 5000000, "accumulatedCostCents": 1500000,
          "progressPercent": 40,
          "forecastCents": 5000000, "manualForecastCents": null,
          "varianceCents": 0, "variancePercent": 0, "alertLevel": "normal"
        }
      ]
    }
  ],
  "totals": {
    "currentBudgetCents": 37000000, "accumulatedCostCents": 1500000,
    "forecastCents": 37000000, "varianceCents": 0, "variancePercent": 0
  }
}
```
- `alertLevel`: `"normal" | "warning" | "alert"`. `variancePercent`: `number | null` (null si
  `currentBudgetCents` es 0).
- Si el presupuesto está en `DRAFT` o no existe: `chapters: []`, `totals` en cero y
  `budgetStatus` reflejando el estado (la tabla de derivados es para la base aprobada).
- `404 NOT_FOUND` si el solicitante no es agente del proyecto (vía `requireProjectPermission`).

## PATCH /api/projects/:projectId/budget/lines/:lineId/forecast

Fijar o eliminar la previsión a cierre manual de una partida. Permiso `forecast.update`
(constructor/PM).

**Request** `SetForecastRequest`:
```jsonc
{ "manualForecastCents": 6000000 }   // fijar (> 0)
{ "manualForecastCents": null }       // eliminar → vuelve al default
```

**200 OK** → `ProjectEconomicsResponse` actualizado (o la línea económica afectada).

**Errores**: `VALIDATION_ERROR` (valor ≤ 0 y no null); `DOMAIN_ERROR` si el presupuesto no está
APPROVED; `FORBIDDEN` si el rol no puede; `404` si la partida no es del proyecto.

## Notas

- Todos los valores de la respuesta salvo `manualForecastCents` (y `baseAmountCents`,
  `progressPercent`) son **derivados**, calculados al consultar; no se persisten.
- Auditoría: `forecast.updated` al fijar/eliminar la previsión manual.
- `GET /api/projects/:id/budget` (S13) sigue sirviendo la base para carga/edición; este endpoint
  es la **vista de derivados** y no lo sustituye.
