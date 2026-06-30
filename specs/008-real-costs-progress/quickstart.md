# Quickstart — Validación del flujo C (S14)

Guía para comprobar que costes reales, contra-asientos y avance funcionan de punta a punta.
No incluye código de implementación; ver `contracts/api.md` y `data-model.md`.

## Prerrequisitos

1. PostgreSQL arriba (`ipd-postgres`), `.env` con `DATABASE_URL`, migraciones aplicadas
   (`pnpm exec prisma migrate deploy`, incluida la nueva de S14).
2. `pnpm db:seed` (usuarios demo por rol + proyecto).
3. Un proyecto con **presupuesto APROBADO** y al menos una partida (flujo B / S13).
4. API y front: `pnpm dev:server` (:3000) + `pnpm dev` (:5173).

## Comandos de verificación

```bash
pnpm typecheck && pnpm lint && pnpm test
```

## Escenarios (deben pasar)

### 1. Imputar coste (US1)
- Login constructor → detalle de una partida → "Imputar coste" (importe, fecha, descripción).
- **Esperado**: el asiento aparece en el historial; el coste acumulado de la partida lo
  incluye; queda `realCost.created` en auditoría. Un segundo coste suma al acumulado.

### 2. Inmutabilidad (US1)
- Intentar editar/borrar un coste por API directa o BD.
- **Esperado**: rechazado (no hay endpoint; el trigger impide UPDATE/DELETE).

### 3. Avance físico (US2)
- Login constructor → "Actualizar avance" 40% → luego 60%.
- **Esperado**: el avance pasa a 60% (sustituye), con autor y fecha; `progress.updated` en
  auditoría. Un porcentaje fuera de 0–100 → `VALIDATION_ERROR`. El avance no cambia al imputar
  costes (§8.7).

### 4. Anular con contra-asiento (US3)
- Login PM → detalle de partida → "Anular" un coste con motivo.
- **Esperado**: aparece un contra-asiento de signo contrario vinculado; el original sigue
  intacto y se muestra "anulado" (tachado); el acumulado vuelve al valor previo;
  `realCost.voided` en auditoría. Anular sin motivo → `VALIDATION_ERROR`. Anular dos veces el
  mismo coste o anular un contra-asiento → `CONFLICT`.

### 5. Permisos en servidor (innegociable)
- Observador/proyectista intentan imputar o avanzar → `FORBIDDEN`.
- Constructor intenta anular → `FORBIDDEN` (solo PM).
- No-agente del proyecto consulta el detalle → `NOT_FOUND`.
- Cualquier operación sobre un presupuesto **no aprobado** → `DOMAIN_ERROR`.
- (Verificable por API directa, no solo por UI.)

### 6. Acumulado exacto
- Imputar 150,00 € y 100,00 €, anular el de 150,00 € → acumulado = 100,00 € (al céntimo).

## Definición de hecho

`pnpm typecheck` + `pnpm lint` + `pnpm test` en verde; los 6 escenarios anteriores
verificados; sin `console.log` ni código muerto añadido.
