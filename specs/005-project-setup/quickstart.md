# Quickstart — Validación del setup de proyecto (S12)

Guion de validación del flujo A de extremo a extremo. No contiene código de implementación.

## Prerrequisitos

1. PostgreSQL en Docker arrancado y migrado (incluida la migración additiva de políticas RLS de S12).
2. Seed aplicado (`pnpm db:seed`): 5 usuarios demo (uno por rol) + proyecto `DEMO-001`.
3. Backend (`pnpm dev:server`) y frontend (`pnpm dev`) en marcha.

## Escenarios (mapeados a la spec)

### V1 — Crear proyecto (US1 / SC-001, SC-002)
- Login con un usuario del seed → "Nuevo proyecto" → nombre, código (único) y cliente → guardar.
- Esperado: el proyecto aparece en el listado con rol **PM**; al entrar, tiene 4 fases con
  **Validación** activa.

### V2 — Código duplicado (US1 / FR-001)
- Crear un proyecto con un `code` ya existente → rechazo claro, no se crea nada.

### V3 — Añadir agentes por email existente (US2 / FR-005)
- Como PM, en la pantalla de agentes, añadir agentes (p. ej. constructor, proyectista) usando emails
  de usuarios del seed, con su rol, % y honorarios. Aparecen en la lista.

### V4 — Email inexistente (US2 / FR-006)
- Añadir un agente con un email que no existe → rechazo claro; **no** se crea ningún usuario.

### V5 — Validación de suma 100% (US2 / SC-003)
- Con porcentajes que NO suman 100% → no se puede "confirmar"; se muestra la suma actual.
- Ajustar hasta 100% → se puede confirmar.

### V6 — Varios agentes por rol (clarify)
- Añadir dos agentes con el mismo rol (p. ej. dos constructores) → ambos se aceptan.

### V7 — Permisos en servidor (US2 / SC-004)
- Con un usuario que NO es PM del proyecto, invocar directamente el endpoint de añadir agente
  (p. ej. con `curl` y su cookie) → `FORBIDDEN`. No basta con que la UI oculte el botón.

### V8 — Auditoría (SC-005)
- Tras crear proyecto y añadir agentes, comprobar que existen eventos `project.created` y
  `agent.added` (sin datos sensibles).

### V9 — No duplicar usuario (FR-009)
- Intentar añadir como agente a un usuario que ya es agente del proyecto → se impide.

## Definición de "terminado" (constitución)

- `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` ✅ (incluye integración de creación/agentes y
  la función pura de reparto).
- Sin `console.log` ni código muerto.
- V1–V5 y V7 (núcleo del flujo A) verificados; V7 verificado **contra el servidor**, no solo en UI.
