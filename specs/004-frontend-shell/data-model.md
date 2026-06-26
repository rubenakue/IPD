# Data Model — Frontend shell (S11)

El frontend no posee modelo de datos propio: refleja el contrato de la API
(`src/types/api.ts`). Aquí se documentan las formas que S11 consume y los estados de UI derivados,
sin duplicar los tipos (la fuente es `src/types/api.ts`).

## Entidades del contrato (consumidas)

### CurrentUser (de `GET /api/me` y `POST /api/auth/login`)

Forma: `CurrentUserResponse` (`src/types/api.ts`).

| Campo | Tipo | Notas |
|---|---|---|
| `user.id` | string | Identificador del usuario autenticado |
| `user.email` | string | Email corporativo |
| `user.displayName` | string | Nombre mostrado en la cabecera/avatar |
| `projects[]` | array | Proyectos del usuario (solo activos; agente activo) |
| `projects[].id` | string | Identificador del proyecto (para la ruta `/projects/:id`) |
| `projects[].code` | string | Código visible (p. ej. `PRJ-2023-089`) |
| `projects[].name` | string | Nombre del proyecto (p. ej. "Hotel Azahar") |
| `projects[].agentId` | string | Vínculo usuario↔proyecto (el "Agent") |
| `projects[].role` | `ProjectRoleCode` | Rol del usuario en ese proyecto |

### ProjectRoleCode (enum del contrato)

`PROMOTER | DESIGNER | CONSTRUCTOR | PROJECT_MANAGER | OBSERVER`.

Mapeo a etiqueta de UI en español (presentación, no persistido):

| Código | Etiqueta UI |
|---|---|
| `PROMOTER` | Promotor |
| `PROJECT_MANAGER` | PM |
| `CONSTRUCTOR` | Constructor |
| `DESIGNER` | Proyectista |
| `OBSERVER` | Observador |

### ApiErrorResponse (de cualquier error de la API, §14.3)

`{ error: { code: ErrorCode, message: string, details } }`. El cliente lo traduce a un error
tipado. `code` relevante para el shell: `UNAUTHENTICATED` (→ a login), `VALIDATION_ERROR` y
`INTERNAL_ERROR` (→ mensaje legible + reintento).

### LogoutResponse

`{ ok: true }` (de `POST /api/auth/logout`).

## No disponibles en el contrato actual (ver research D3)

- **Phase (fase activa)** del proyecto: no expuesta. La cabecera muestra estado neutro hasta que un
  hito posterior la provea.
- **Project status** ("En plazo / Retraso / Finalizado"): no expuesto. El listado no inventa estado;
  muestra a lo sumo el código/nombre y el rol.

## Estado de UI (no es dato de servidor; React nativo — ADR-003)

| Estado | Dónde | Propósito |
|---|---|---|
| Proyecto activo seleccionado | Contexto de React en el layout de `/projects/:id` | Alimenta la cabecera (proyecto + rol); se deriva de `projects[]` por `:projectId` |
| Sesión (cargando / autenticado / anónimo) | Query `['me']` de TanStack Query | Guard de rutas y render condicional |
| Formulario de login | `@mantine/form` local en `LoginPage` | Validación de email/contraseña en cliente (UX); la autoridad es el servidor |

## Reglas derivadas de los requisitos

- Si `projects[]` está vacío → estado vacío informativo (FR-009, SC-006).
- Acceso a `/projects/:id` cuyo `:id` no está en `projects[]` del usuario → no se muestran datos;
  mensaje y/o redirección (FR-007, edge case de proyecto ajeno). La autoridad sigue siendo el
  servidor (FR-016).
- Sin sesión (`['me']` resuelve `UNAUTHENTICATED`) → redirección a `/login` (FR-003).
