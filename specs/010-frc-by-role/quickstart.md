# Quickstart — Validar el FRC servido por rol (S16)

Guía de validación end-to-end. Demuestra el innegociable: **tres logins → tres respuestas
distintas del mismo endpoint**, con el filtrado hecho en el servidor.

## Prerrequisitos

- Postgres arriba (contenedor `ipd-postgres`) y esquema aplicado.
- Seed cargado: `pnpm db:seed` (crea el proyecto demo y los 5 agentes por rol).
- Backend: `pnpm dev:server` (puerto 3000). Frontend: `pnpm dev` (puerto 5173).

Cuentas demo (contraseña `ipd-demo-2026`), todas sobre el mismo proyecto:

| Email | Rol | sharePercent | Ve del FRC |
|-------|-----|-------------|-----------|
| `promotor@ipd.demo` | PROMOTER | 33 | cuadro completo (`global`) |
| `pm@ipd.demo` | PROJECT_MANAGER | 0 | cuadro completo (`global`) |
| `constructor@ipd.demo` | CONSTRUCTOR | 58 | su fila + desviación (`own`) |
| `proyectista@ipd.demo` | DESIGNER | 9 | su fila + desviación (`own`) |
| `observador@ipd.demo` | OBSERVER | 0 | solo estado (`aggregate`) |

> El presupuesto del proyecto demo debe estar **APPROVED** con una desviación conocida para que
> el FRC tenga datos. Si está en borrador, la respuesta trae `fundStatus: "neutral"` sin filas.

## Validación por API (prueba el innegociable sin frontend — US1 / SC-001)

Para cada rol: login (guarda la cookie de sesión) y consulta el FRC. Compara las **formas**.

1. **Promotor** → espera `"visibility": "global"` con `agents[]` (todas las partes) y
   `deviationCents`. Verifica `Σ agents[].bonusMalusCents == deviationCents` (SC-002).
2. **Constructor** → espera `"visibility": "own"`, con `own` = su fila (agentId del constructor)
   y `deviationCents`; **sin** `agents[]`. Confirma que la respuesta cruda **no** contiene la
   fila del proyectista ni del promotor (SC-003).
3. **Observador** → espera `"visibility": "aggregate"` con solo `budgetStatus` + `fundStatus`;
   **sin** `deviationCents`, `agents` ni `own` (SC-004).
4. **No-agente** (usuario sin agente activo en el proyecto) → `404 NOT_FOUND` (SC-005).

Endpoint: `GET /api/projects/:projectId/frc`. La verificación clave no es solo lo que se ve,
sino que la respuesta del servidor **no incluye** los campos vetados (inspección del JSON crudo).

## Validación en el frontend (US2)

Iniciar sesión con cada rol y abrir la sección **FRC** del proyecto:

1. **Promotor / PM** → tabla con todos los agentes (rol, bonus/malus, honorarios, total),
   desviación total y estado del fondo.
2. **Constructor / proyectista** → tarjeta con **su** resultado (bonus/malus, honorarios,
   total), la desviación total y el estado; sin el detalle de los demás.
3. **Observador** → solo el estado del fondo (bonus / neutro / malus), sin importes.

## Comprobaciones automáticas

- `pnpm typecheck` y `pnpm test` en verde.
- Unit puro (`tests/frc-visibility.test.ts`): para cada rol, `projectFrcForRole()` produce la
  `visibility` correcta y **omite** las claves prohibidas; suma de bonus/malus = desviación.
- Servidor (`tests/server/project-frc.test.ts`): 3 roles sobre el mismo estado → 3 formas
  distintas; no-agente → 404.
- Frontend (`tests/frontend/project-frc.test.tsx`): la vista renderiza cuadro / propio /
  agregado según la respuesta.

Detalles de formas y campos: ver [contracts/api.md](./contracts/api.md) y
[data-model.md](./data-model.md).
