# API — Setup de proyecto (S12)

Endpoints REST **nuevos** que añade esta feature, bajo `/api`. Tipos en `src/types/api.ts` (fuente
única, compartida con el frontend). Formato de error estándar §14.3 (`ApiErrorResponse`).

## POST `/api/projects` — crear proyecto

- **Auth**: `requireAuth` (cualquier usuario autenticado; queda como PM).
- **Body**: `{ name: string, code: string, clientName: string, description?: string }`
  (fechas opcionales, fuera de S12 si se prefiere). Validado con Zod.
- **201**: el proyecto creado `{ id, name, code, clientName, role: 'PROJECT_MANAGER' }` (forma a
  fijar en `api.ts`, consistente con `CurrentUserResponse.projects[]`).
- **Efectos**: crea Project + 4 Phases (Validación activa) + Agent PM (creador) + audit
  `project.created`, en una transacción bajo RLS (research D1).
- **409 `CONFLICT`**: `code` ya existe. **400 `VALIDATION_ERROR`**: body inválido.
- **Cliente**: `useCreateProject` → invalida `['me']` y navega a `/projects/:id/agents`.

## GET `/api/projects/:projectId/agents` — listar agentes + estado de reparto

- **Auth**: `requireProjectPermission('project.view')` (participantes del proyecto).
- **200**: `{ agents: AgentView[], shareSum: number, isComplete: boolean }` donde
  `AgentView = { id, userId, email, displayName, role, sharePercent, guaranteedFeeCents, feeAtRiskCents }`.
  `shareSum`/`isComplete` derivan de `validateShareSplit` (no persistido).
- **403/404**: no participa / proyecto inexistente (filtrado en servidor + RLS).

## POST `/api/projects/:projectId/agents` — añadir agente

- **Auth**: `requireProjectPermission('agent.manage')` (solo PM).
- **Body**: `{ email: string, role: ProjectRoleCode, sharePercent: number, guaranteedFeeCents: number, feeAtRiskCents: number }`.
- **201**: el `AgentView` creado. Efecto: audit `agent.added`.
- **404/422**: el email NO corresponde a un usuario existente → rechazo, no se crea nada (FR-006).
- **409 `CONFLICT`**: el usuario ya es agente del proyecto (FR-009).
- **400 `VALIDATION_ERROR`**: `sharePercent` fuera de 0–100, honorarios negativos, email mal formado, rol inválido.
- **403 `FORBIDDEN`**: el solicitante no es PM (verificado en servidor, no solo en UI).

## PATCH `/api/projects/:projectId/agents/:agentId` — editar condiciones

- **Auth**: `requireProjectPermission('agent.manage')` (solo PM).
- **Body** (parcial): `{ role?, sharePercent?, guaranteedFeeCents?, feeAtRiskCents? }`.
- **200**: el `AgentView` actualizado. Mismas validaciones de rango que en alta.
- **Fuera de alcance**: eliminar agente (DELETE) → sesión futura (documentado en spec).

## Notas transversales

- La suma 100% es un **gate informativo**: el cliente bloquea "confirmar/completar" si
  `isComplete` es `false`; el servidor expone `shareSum`/`isComplete` y valida rangos por agente.
- Toda escritura ocurre bajo `withRlsContext` (RLS 2ª capa); el middleware de permisos es la 1ª.
- La invitación de usuarios por email inexistente **no** está aquí (spec 006 / issue #37).
