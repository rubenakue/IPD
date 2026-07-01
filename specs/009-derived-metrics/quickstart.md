# Quickstart — Validación de derivados económicos (S15)

Comprueba que el vigente, la previsión, la desviación y las alertas cuadran y que el override de
previsión funciona. Ver `contracts/api.md` y `data-model.md` para detalles.

## Prerrequisitos

1. PostgreSQL arriba, `.env`, migraciones aplicadas (no hay nuevas en S15).
2. `pnpm db:seed`.
3. Un proyecto con **presupuesto APROBADO**, partidas y algunos **costes reales** imputados
   (S13 + S14) — por ejemplo, una partida cuyo coste supere su presupuesto.
4. `pnpm dev:server` (:3000) + `pnpm dev` (:5173).

## Comandos de verificación

```bash
pnpm typecheck && pnpm lint && pnpm test
```

## Escenarios (deben pasar)

### 1. Cuadre de derivados (US1)
- Abrir el control económico de un proyecto aprobado con costes conocidos.
- **Esperado**: por cada partida, vigente = base (+ ajustes, hoy 0), previsión =
  `max(coste, vigente)`, desviación = vigente − previsión, en € y %. Los subtotales por capítulo
  y el total del proyecto cuadran al céntimo con la suma de las partidas.

### 2. Alerta de sobrecoste (US1)
- Una partida cuyo coste real acumulado supera su presupuesto vigente.
- **Esperado**: previsión = coste real; desviación negativa; la fila se **resalta** (atención si
  |%| ≥ 5, alerta si ≥ 10).

### 3. Partida sin costes (US1)
- **Esperado**: previsión = vigente, desviación 0, sin alerta.

### 4. Override de previsión manual (US2)
- Login constructor/PM → detalle de partida → fijar una previsión manual > 0.
- **Esperado**: la previsión efectiva pasa a ese valor; desviación y alerta se recalculan;
  `forecast.updated` en auditoría. Eliminar el valor → vuelve a `max(coste, vigente)`. Un valor
  ≤ 0 → `VALIDATION_ERROR`.

### 5. Permisos en servidor (innegociable)
- Promotor/proyectista/observador intentan fijar previsión → `FORBIDDEN`.
- No-agente consulta economics → `NOT_FOUND`.
- Override sobre presupuesto no aprobado → `DOMAIN_ERROR`.

### 6. Nada se persiste
- Consultar economics dos veces sin cambiar datos fuente → valores idénticos, calculados al
  vuelo (solo `manualForecast` se almacena).

## Definición de hecho

`pnpm typecheck` + `pnpm lint` + `pnpm test` en verde; escenarios 1–6 verificados; sin
`console.log` ni código muerto.
