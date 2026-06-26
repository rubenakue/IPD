# Quickstart — Validación del frontend shell (S11)

Guía para comprobar que S11 funciona de extremo a extremo. No contiene código de implementación
(eso vive en `tasks.md` y en el código); es un guion de validación.

## Prerrequisitos

1. PostgreSQL en Docker arrancado y migrado (H3).
2. Seed aplicado: `pnpm db:seed` (5 usuarios de demo, uno por rol; proyecto "Hotel Azahar").
3. `.env` configurado (sin secretos en el repo; `.env.example` al día).
4. Dependencias del frontend instaladas (ver `research.md` → "Dependencias a proponer",
   previa aprobación).

## Arranque en desarrollo

1. Backend API: `pnpm dev:server` (Express en su puerto).
2. Frontend SPA: `pnpm dev` (Vite; script a añadir en S11). El proxy de Vite enruta `/api` → API.
3. Abrir la URL que imprime Vite en el navegador.

## Escenarios de validación (mapeados a la spec)

### V1 — Login correcto (US1 / SC-001)
- Introducir las credenciales de un usuario del seed → la app abre sesión y navega al listado de
  proyectos en <1 min, sin instrucciones extra.

### V2 — Login incorrecto (US1 / FR-005)
- Credenciales inválidas → mensaje en español "Email o contraseña incorrectos." sin revelar cuál falló.

### V3 — Ruta protegida sin sesión (US1 / FR-003, SC-003)
- En una pestaña sin sesión, abrir directamente una URL privada (p. ej. `/projects`) → redirección a `/login`.

### V4 — Listado de proyectos por usuario (US2 / SC-002)
- Login con dos usuarios distintos del seed (p. ej. promotor de Vivare y un constructor) → cada uno
  ve solo sus proyectos y el rol correcto en cada uno. Ninguno ve proyectos ajenos.

### V5 — Usuario sin proyectos (US2 / SC-006)
- Login con un usuario sin agentes activos → estado vacío informativo, sin errores.

### V6 — Entrar en un proyecto y contexto (US2/US3 / FR-008, FR-010, SC-005)
- Seleccionar un proyecto → entra al dashboard placeholder; la cabecera muestra proyecto y rol; la
  fase aparece en estado neutro (no disponible aún en el contrato).

### V7 — Navegación del shell (US3 / FR-011, FR-011a)
- El menú lateral muestra la estructura completa de módulos; abrir una sección no implementada →
  marcador "Próximamente" dentro del marco, sin enlaces rotos; la cabecera mantiene el contexto.
- Volver al listado de proyectos desde el marco de navegación.

### V8 — Logout (US1 / FR-004, SC-004)
- Cerrar sesión → vuelve a `/login`; reintentar una URL privada exige autenticarse de nuevo; ningún
  dato privado permanece visible.

### V9 — Recarga con sesión activa (edge case)
- Estando dentro, recargar la página → la sesión se reconoce vía `/api/me` y el usuario permanece
  dentro, sin re-login.

### V10 — Servidor no disponible (edge case / FR-014)
- Con la API caída, intentar login o cargar proyectos → mensaje legible + opción de reintento, sin
  pantalla en blanco.

## Definición de "terminado" (constitución)

- `pnpm typecheck` pasa; `pnpm lint` pasa; `pnpm test` pasa.
- Sin `console.log` ni código muerto añadido.
- V1–V4 (núcleo del criterio del hito: login → ver tus proyectos) verificados en el navegador.
