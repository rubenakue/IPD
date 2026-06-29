# API: Presupuesto objetivo (flujo B)

Todos los endpoints están bajo `/api`, usan sesión `httpOnly`, devuelven errores con
`ApiErrorResponse` y aplican permisos en servidor.

## GET `/projects/:projectId/budget`

- Auth: `requireProjectPermission('project.view')`.
- 200:
  - `{ budget: null, canManageBudget: boolean }` si no hay presupuesto.
  - `{ budget: BudgetView, canManageBudget: boolean }` si existe.
- `canManageBudget` indica si el usuario actual es PM según `budget.upload`; la UI lo usa para
  mostrar acciones, pero la seguridad real está en las rutas de mutación.

## POST `/projects/:projectId/budget/lines`

- Auth: `requireProjectPermission('budget.upload')`.
- Body: `{ chapterCode, chapterName, code, name, baseAmountCents }`.
- 201: `BudgetView`.
- Efecto: crea `Budget(DRAFT)` implícitamente si no existe y añade la partida.
- Rechazos: presupuesto aprobado `DOMAIN_ERROR`; datos inválidos `VALIDATION_ERROR`.

## PATCH `/projects/:projectId/budget/lines/:lineId`

- Auth: `requireProjectPermission('budget.upload')`.
- Body parcial con al menos un campo de alta.
- 200: `BudgetView`.
- Rechazos: línea inexistente en el proyecto `NOT_FOUND`; presupuesto aprobado `DOMAIN_ERROR`;
  body inválido `VALIDATION_ERROR`.

## DELETE `/projects/:projectId/budget/lines/:lineId`

- Auth: `requireProjectPermission('budget.upload')`.
- 200: `BudgetView`.
- Rechazos: línea inexistente en el proyecto `NOT_FOUND`; presupuesto aprobado `DOMAIN_ERROR`.

## POST `/projects/:projectId/budget/approve`

- Auth: `requireProjectPermission('budget.upload')`.
- Body: vacío.
- 200: `BudgetView` con `status: "APPROVED"` y `approvedAt`.
- Efecto: crea `AuditEvent` `budget.approved` dentro de la misma transacción.
- Rechazos:
  - Sin presupuesto, sin líneas, total 0, códigos duplicados o capítulo inconsistente:
    `DOMAIN_ERROR`.
  - Ya aprobado: `DOMAIN_ERROR`.

