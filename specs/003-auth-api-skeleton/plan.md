# Implementation Plan: Autenticación y roles por proyecto

**Branch**: `003-auth-api-skeleton` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-auth-api-skeleton/spec.md`

## Summary

La feature describe el módulo de **acceso** (login + sesión) y de **permisos por rol y por proyecto**, aplicados en servidor (spec, US1–US3). Esta sesión **S08** implementa únicamente el **andamiaje de la API** (US4): un servidor Express bajo `/api` que arranca, expone `GET /api/health`, devuelve todos sus errores con el **formato estándar §14.3** a través de un middleware único, y valida la entrada con **Zod**. Login (S09) y permisos en dos capas —middleware + RLS— (S10) se construyen encima de este esqueleto en sesiones posteriores. En términos del flujo Spec Kit, S08 cubre las fases **Setup** y **Foundational** de `tasks.md`; las User Stories 1–3 quedan listadas pero sin marcar.

## Technical Context

**Language/Version**: TypeScript 5.5 (strict, cero `any`), Node 22 (runtime), ESM. Ejecución de TS sin runner externo vía `node --experimental-strip-types` (igual que `prisma/seed.ts`).

**Primary Dependencies**: **Express** (framework HTTP, ADR-004) y **Zod** (validación de entrada; mini-ADR-009, cierra §20.2.1). Tipos de desarrollo: `@types/express` y `@types/node`. Prisma/argon2 ya presentes (S06/S07); `express-session` + `connect-pg-simple` se aplazan a S09.

**Storage**: PostgreSQL (vía Prisma) ya operativo. El esqueleto de S08 **no** accede a la BD todavía (el `/api/health` no consulta Postgres en esta sesión; comprobar la BD en health es una mejora opcional de S09+).

**Testing**: Vitest. Se añade un test de integración **ligero** del contrato HTTP (health responde; ruta inexistente → `NOT_FOUND`; entrada inválida → `VALIDATION_ERROR`; forma del error). No es TDD innegociable (la constitución exige TDD solo en los 3 cálculos puros), pero da red de regresión a SC-001/SC-002 **sin** dependencias nuevas: se usa `fetch` nativo de Node 22 contra un listener en puerto efímero (`app.listen(0)`), evitando `supertest`.

**Target Platform**: backend Node (servidor HTTP). El frontend (S11+) consumirá esta API.

**Project Type**: monorepo single-project (briefing §7). El backend vive en `src/server/`.

**Performance Goals**: irrelevante a esta escala (prototipo; un endpoint de salud).

**Constraints**: TS strict; sin secretos en el repo (`.env.example` actualizado, `.env` ignorado); errores nunca filtran trazas al cliente (`INTERNAL_ERROR` genérico); ediciones mínimas (no se tocan `src/types/domain.ts` ni `src/lib/calculations/`).

**Scale/Scope**: 1 endpoint (`/api/health`) + maquinaria transversal (error handler, not-found, validación) + 1 ADR + 1 test de integración.

## Constitution Check

*GATE: debe pasar antes de implementar.*

| Principio | Cumplimiento |
|---|---|
| I. SDD primero | ✓ spec escrita y clarificada (4 decisiones con Rubén) antes de tocar `src/server/`. |
| II. TDD en los 3 cálculos | N/A — esta feature no toca `src/lib/calculations/`; los 23 tests siguen verdes. Se añade un test de contrato HTTP por buena práctica (no exigido). |
| III. TS strict, cero `any` | ✓ todo `src/server/` en TS strict; Express tipado con `@types/express`; el error handler tipa `unknown` y estrecha, sin `any` ni `@ts-ignore`. |
| IV. Fidelidad al dominio | ✓ respeta `User ≠ Agent` y rol por proyecto (FR-007); no persiste nada derivado; nombres de dominio en inglés. No toca los cálculos. |
| V. Seguridad en servidor (NON-NEGOTIABLE) | ✓ es el eje de la feature. S08 prepara el andamiaje (contrato de error, validación) **sin** debilitar nada: aún no hay endpoints de datos, así que no se expone información; los guardas de rol y el RLS llegan en S09/S10. |
| VI. Trazabilidad / libros abiertos | ✓ el `AuditEvent` ya modelado se cableará en S09/S10; el contrato de error es uniforme y predecible. |
| VII. ADR + lenguaje simple | ✓ **mini-ADR-009** documenta la elección de Zod (cierra §20.2.1); entrada en `docs/diario.md`; el plan explica cada pieza en lenguaje llano. |

**Resultado: PASA.** Sin violaciones → *Complexity Tracking* vacío.

## Project Structure

### Documentation (this feature)

```text
specs/003-auth-api-skeleton/
├── spec.md           # QUÉ y POR QUÉ (clarify resuelto)
├── plan.md           # Este archivo: el CÓMO
├── quickstart.md     # Cómo arrancar la API y verificarla con curl (SC-001/SC-002)
└── tasks.md          # Lo genera la fase de tasks
```

No se generan `research.md` (no hay incógnitas tecnológicas: stack cerrado en ADRs y Zod decidido en clarify; su justificación va en el mini-ADR-009), `data-model.md` (esta feature **no** crea tablas: consume el modelo de S07) ni `contracts/` (el único contrato relevante de S08 —forma del error y `/api/health`— ya está fijado en la spec; los contratos de los endpoints de auth se definirán en S09).

### Source Code (repository root)

```text
src/
├── server/
│   ├── index.ts                 # arranque: lee config, app.listen(PORT), logs de inicio
│   ├── app.ts                   # createApp(): construye y configura la app Express (sin escuchar) → testeable
│   ├── config.ts                # lee y valida variables de entorno con Zod (PORT, NODE_ENV)
│   ├── routes/
│   │   └── health.ts            # GET /health → { status: 'ok' }
│   ├── middlewares/
│   │   ├── validate.ts          # validate(schema): valida params/query/body con Zod → VALIDATION_ERROR (listo para S09)
│   │   ├── not-found.ts         # 404 de /api/* no resuelto → ApiError NOT_FOUND
│   │   └── error-handler.ts     # middleware final: traduce ApiError / ZodError / desconocido al formato §14.3
│   └── errors/
│       └── api-error.ts         # clase ApiError (code, httpStatus, message, details) + mapa code→status + helpers
├── types/
│   └── api.ts                   # contrato HTTP COMPARTIDO: ErrorCode (unión cerrada §14.3) y forma { error: {...} }
└── (sin tocar) types/domain.ts, lib/calculations/, generated/prisma/

prisma/seed.ts                   # entra por fin en el typecheck (gracias a @types/node)
tsconfig.json                    # include += "prisma" para typechear el seed
package.json                     # nuevas deps + script "dev:server"
.env.example                     # documenta PORT (sin valores reales)
docs/adr/009-input-validation.md # mini-ADR de Zod
tests/server/                    # test de integración ligero del contrato HTTP
```

**Structure Decision**: estructura **modular** (decisión de clarify) en `src/server/`, separando `index.ts` (arranca/escucha) de `app.ts` (`createApp()` sin escuchar, para poder testear sin abrir puerto). Las carpetas `routes/`, `middlewares/` y `errors/` nacen con lo mínimo de hoy pero dan el molde donde S09 (rutas de auth, middleware de sesión) y S10 (middleware de permisos) enchufan sin reorganizar. El contrato de error (`ErrorCode` + forma del JSON) se coloca en `src/types/api.ts` —no en `domain.ts`— porque es un contrato de transporte compartible con el frontend (consecuencia de ADR-004: "compartir tipos en el monorepo"), no una entidad de dominio.

## Decisiones de diseño (CÓMO, dentro del stack decidido)

1. **`createApp()` separado del arranque** (`app.ts` vs `index.ts`): `app.ts` exporta una función que construye la app Express y devuelve el `Express` sin llamar a `listen()`. `index.ts` la importa, lee el puerto y escucha. Beneficio: el test arranca la app en un puerto efímero y la cierra, sin acoplarse al puerto real.
2. **Puerto y configuración** (decisión de clarify): `PORT` se lee de `.env` con **default 3000**; se valida con Zod en `config.ts` (si `PORT` no es un entero válido, el server no arranca y lo dice claro). `NODE_ENV` también. `.env.example` documenta `PORT=3000` (sin secretos).
3. **Clase `ApiError`**: lleva `code: ErrorCode`, `httpStatus: number`, `message: string`, `details?: object`. Un mapa `ERROR_STATUS` asocia cada código §14.3 a su HTTP status (`UNAUTHENTICATED`→401, `FORBIDDEN`→403, `NOT_FOUND`→404, `VALIDATION_ERROR`→400, `DOMAIN_ERROR`→422, `CONFLICT`→409, `INTERNAL_ERROR`→500). Helpers como `ApiError.notFound(...)` para uso ergonómico.
4. **Middleware de errores único** (`error-handler.ts`, registrado el último): recibe `unknown`, lo estrecha por tipo y produce **siempre** `{ error: { code, message, details } }`:
   - `ApiError` → su `httpStatus` y su `code`.
   - `ZodError` (validación que no pasó por `validate` o llega suelta) → `VALIDATION_ERROR` 400, con el detalle de campos en `details`.
   - cualquier otra cosa → `INTERNAL_ERROR` 500 **genérico**; el error real se registra en el log del servidor, nunca en la respuesta (FR-020).
5. **Middleware `validate(schema)`**: recibe un esquema Zod (para `body`/`query`/`params`), valida y, si falla, crea un `ApiError` `VALIDATION_ERROR`. Es la pieza reutilizable que S09 usará en `/login`. En S08 no hay endpoint de entrada en producción (solo `/health`, sin input), así que la pieza se entrega lista y se cubre con el test (montándola en una app de prueba) — no se añade ningún endpoint de relleno.
6. **`not-found.ts`**: cualquier ruta `/api/*` no resuelta cae aquí y se convierte en `ApiError` `NOT_FOUND`, en lugar del HTML por defecto de Express. Garantiza FR-016 (todo error con formato).
7. **Salud sin envoltorio** (FR-015/FR-021): `GET /api/health` → `200 { "status": "ok" }`. En S08 no consulta la BD (comprobación de Postgres = mejora opcional posterior).
8. **Ejecución sin runner** (Node 22): se añade `"dev:server": "node --env-file=.env --experimental-strip-types --watch src/server/index.ts"`. Coherente con `db:seed`; sin `tsx`/`ts-node`. Los imports internos llevan extensión `.ts` (como exige el strip-types nativo y ya hace el cliente Prisma generado).
9. **`seed.ts` al typecheck**: añadir `"prisma"` al `include` de `tsconfig.json`. Con `@types/node` ya instalado, `process`, `Buffer`, etc. quedan tipados y `pnpm typecheck` cubre por fin el seed (objetivo de la sesión).
10. **Zod (mini-ADR-009)**: validación declarativa de entrada; infiere tipos TS desde el esquema (una sola fuente de verdad), encaja con TS strict y traduce sus errores a `details` del `VALIDATION_ERROR`. Cierra el pendiente §20.2.1.
11. **Sin estado global mutable de Prisma en el server aún**: el esqueleto no abre conexión a BD; cuando S09 necesite el cliente, se instanciará en una capa `src/lib/db` con el adapter `@prisma/adapter-pg` (fuera del alcance de hoy).

## Complexity Tracking

> Sin violaciones de la constitución. Tabla intencionadamente vacía.
