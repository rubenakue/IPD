# Research — Frontend shell (S11)

Fase 0 del plan. El stack está fijado por ADRs, así que no hay incógnitas de tecnología; este
documento resuelve las decisiones de **integración** y acota lo que S11 consume del backend.

## D1 — Integración frontend↔API en desarrollo: proxy de Vite (no CORS)

- **Decisión**: servir el frontend con el dev server de Vite y proxyear `/api` al backend Express
  (`server.proxy` en `vite.config.ts`). El frontend hace `fetch('/api/...')` con
  `credentials: 'include'`.
- **Rationale**: la sesión usa cookie `httpOnly` con `sameSite=lax` (ADR-004/009). Si el frontend
  (p. ej. `:5173`) y la API (`:3000`) son orígenes distintos, la cookie de sesión no viaja sin
  configurar CORS con credenciales y `sameSite=none`+`secure`, lo que añade superficie de error.
  Con el proxy, navegador y API comparten origen: la cookie funciona tal cual, sin tocar el backend.
- **Alternativas descartadas**: (a) CORS en Express con `credentials` — más configuración y relaja
  `sameSite`; (b) `sameSite=none` — exige HTTPS también en local. El heads-up del diario ya
  recomendaba el proxy.
- **Nota de gobernanza**: es una decisión de integración de desarrollo, no un cambio de stack. Si
  en revisión se considera arquitectónica, se eleva a un mini-ADR.

## D2 — El listado de proyectos sale de `GET /api/me` (sin endpoint nuevo)

- **Decisión**: el listado de proyectos del usuario (US2) se obtiene de `GET /api/me`, que ya
  devuelve `CurrentUserResponse { user, projects[] }`, con `{ id, code, name, agentId, role }` por
  proyecto (ver `src/server/auth/current-user.ts` y `src/types/api.ts`).
- **Rationale**: el contrato existente cubre exactamente US2 (proyecto + rol por proyecto). No se
  crea backend nuevo en S11; se respeta "el frontend solo consume la API existente".
- **Consecuencia**: `GET /api/me` cumple doble función: (1) fuente del listado de proyectos, y
  (2) sonda de sesión para el guard de rutas (200 = autenticado, 401 = a login).

## D3 — Gap conocido: la cabecera necesita "fase activa" y el listado un "estado"

- **Hallazgo**: `CurrentUserResponse.projects[]` **no** incluye `phase` (fase activa) ni `status`
  del proyecto. La cabecera (FR-010) pide proyecto/fase/rol y el listado (FR-006) un "indicador de
  estado".
- **Decisión para S11**: mostrar el rol (disponible) y, para fase/estado aún no expuestos, un valor
  neutro ("—" / "Activo") en lugar de inventar datos. Coherente con el edge case "proyecto sin fase
  activa → estado neutro" y con "cero datos inventados".
- **Diferido**: el endpoint de detalle de proyecto que incluya fase activa y estado se añadirá
  cuando se construya el dashboard real (S17) o el núcleo económico (H6), en su propia spec. No se
  adelanta backend en S11.
- **Alternativa descartada**: ampliar ya `GET /api/me` con fase/estado — sería backend nuevo fuera
  del foco de S11 y sin pantalla que lo consuma de verdad todavía.

## D4 — Guard de rutas y manejo de sesión

- **Decisión**: un componente `ProtectedRoute` que usa el hook `useCurrentUser` (query a
  `GET /api/me`). Mientras carga, estado de carga; si la query resuelve 401 (o el cliente detecta
  `UNAUTHENTICATED`), redirige a `/login` (FR-003, FR-013). Tras login se invalida la query `me`;
  tras logout se limpia la caché de TanStack Query (FR-004).
- **Rationale**: es el patrón estándar de TanStack Query + React Router; la sesión vive en la cookie
  (servidor), no en el cliente. Recargar la página revalida vía `/me` (edge case de recarga).
- **Manejo de errores**: el cliente API traduce `ApiErrorResponse` (§14.3) a un error tipado; la UI
  muestra mensajes legibles en español y permite reintento cuando el servidor no responde (FR-014).

## D5 — Tema Mantine y referencia visual de Stitch

- **Decisión**: `src/theme.ts` define un tema Mantine mínimo. Los mockups de
  `docs/diseño/stitch_..._PANTALLAS/` y sus tokens (colores por rol, tipografía Inter, spacing) son
  **referencia visual orientativa**, no fuente de verdad: se trasladan al tema solo en lo que aporte,
  sin copiar el HTML de Tailwind.
- **Rationale**: alineado con la nota del roadmap y el README de la carpeta de mockups. Mantiene la
  estética ajustable y evita arrastrar deuda del HTML estático.

## D6 — Convención de query keys y colocación de hooks (pendiente de ADR-003)

- **Decisión**: query keys como arrays namespaced — `['me']` para el usuario actual. Hooks de datos
  en `src/hooks/` (`useCurrentUser`, `useLogin`, `useLogout`); cliente fetch en `src/lib/api/`.
- **Rationale**: cierra el "pendiente" del ADR-003 (convenciones al hacer la primera spec de
  pantalla) con el patrón más simple que escala a los módulos siguientes.

## Dependencias a proponer (aprobación previa, regla del proyecto)

Comandos exactos de los ADR (ya justificados) + base React/Vite (ADR-001) + tests de UI (nuevo,
requiere visto bueno explícito):

```bash
# Base React + Vite (ADR-001)
pnpm add react react-dom
pnpm add -D vite @vitejs/plugin-react @types/react @types/react-dom

# UI — Mantine (ADR-002)
pnpm add @mantine/core @mantine/hooks @mantine/form @mantine/notifications
pnpm add -D postcss postcss-preset-mantine postcss-simple-vars

# Estado de servidor — TanStack Query (ADR-003)
pnpm add @tanstack/react-query

# Routing — React Router v7 (ADR-007)
pnpm add react-router

# Tests de componente/integración de UI — APROBADO (2026-06-26). No está en ningún ADR;
# dependencia nueva con visto bueno explícito de Rubén.
pnpm add -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

> `@mantine/dates` y `@mantine/charts` (listados en ADR-002) no son necesarios en S11; se
> instalarán cuando lleguen las pantallas que los usan (presupuesto, dashboard). Se omiten aquí
> para no inflar el bundle.
