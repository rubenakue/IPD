# API consumida por el frontend shell (S11)

El frontend **no expone** API: consume endpoints **ya existentes** del backend (H4). La forma de
los tipos es la de `src/types/api.ts` (fuente única). Esta tabla fija el contrato de cara a S11;
si algo no coincide con el backend, gana el backend y se ajusta el cliente.

## Endpoints

### POST `/api/auth/login`

- **Propósito**: autenticar y abrir sesión (cookie `httpOnly`).
- **Body**: `{ email: string, password: string }` (validado por Zod en servidor: email válido,
  contraseña no vacía).
- **200**: `CurrentUserResponse` (usuario + proyectos con rol). Establece la cookie de sesión.
- **401**: `ApiErrorResponse` con `code: UNAUTHENTICATED`, `message: "Email o contraseña incorrectos."`
  → la UI muestra ese mensaje sin distinguir si falló el email o la contraseña (FR-005).
- **400**: `VALIDATION_ERROR` si el body no cumple el esquema.
- **Cliente**: `fetch('/api/auth/login', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body })`.

### POST `/api/auth/logout`

- **Propósito**: cerrar sesión y limpiar la cookie.
- **Body**: vacío.
- **200**: `LogoutResponse` `{ ok: true }`. → el cliente limpia la caché de TanStack Query (FR-004).

### GET `/api/me`

- **Propósito**: (1) datos del usuario autenticado + listado de proyectos con rol (US2);
  (2) sonda de sesión para el guard de rutas (D4).
- **200**: `CurrentUserResponse`.
- **401**: `ApiErrorResponse` `UNAUTHENTICATED` → la app redirige a `/login` (FR-003).
- **Cliente**: `fetch('/api/me', { credentials:'include' })`, cacheado bajo la query key `['me']`.

## Endpoints relacionados (NO usados por S11)

- `GET /api/projects/:projectId/promoter-private-costs` — vista privada del promotor. Es de hitos
  posteriores (núcleo económico) y demuestra el filtrado por rol en servidor. **No** se consume en
  el shell; se documenta para dejar claro el límite de alcance.

## Manejo transversal de errores (cliente)

- Toda respuesta no-2xx se parsea como `ApiErrorResponse` y se lanza como error tipado.
- `UNAUTHENTICATED` en una ruta protegida → redirección a `/login` con aviso (FR-013).
- Fallo de red / servidor caído → mensaje legible en español + opción de reintento (FR-014), sin
  pantallas en blanco.
- El frontend nunca decide visibilidad por rol: solo refleja lo que el servidor entrega (FR-016).
