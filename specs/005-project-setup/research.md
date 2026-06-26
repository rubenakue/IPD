# Research — Setup de proyecto (S12)

Fase 0. El stack está fijado; estas son las decisiones de diseño e integración. El modelo de datos
ya existe (S07), así que el foco es la lógica de servidor (creación, validación, permisos, RLS) y
las pantallas.

## D1 — Crear un proyecto bajo RLS (reto principal)

- **Problema**: la RLS de S10 cubre TODAS las tablas project-scoped (Project, Phase, Agent…) bajo el
  rol `ipd_app` (NOBYPASSRLS, FORCE). Pero al **crear** un proyecto aún no existe `projectId` ni un
  `Agent` que vincule al creador → las políticas que comprueban "participa en el proyecto" no se
  cumplirían todavía.
- **Decisión**: hacer la creación en **una transacción** con `SET LOCAL ipd.current_user_id` (el
  creador) y rol `ipd_app`, en este **orden**: (1) `INSERT Project`; (2) `INSERT Agent` del creador
  como PM (`userId = current_user_id`); (3) `INSERT` de las 4 `Phase`; (4) `UPDATE Project.activePhaseId`
  a la fase `VALIDATION`. Añadir políticas RLS de **INSERT** que lo permitan:
  - `Project`: `WITH CHECK` que exija `current_user_id` presente (cualquier autenticado crea).
  - `Agent`: `WITH CHECK` que permita insertar cuando `userId = current_user_id` (auto-alta como PM
    en el bootstrap) **o** cuando el `current_user` ya es PM del `projectId` (alta de otros agentes,
    US2) — reutilizando los helpers `SECURITY DEFINER` de S10 para resolver "es PM".
  - `Phase`: `WITH CHECK` que el `current_user` participe/sea PM del `projectId` (tras el paso 2 ya
    lo es).
- **Por qué este orden**: insertar el `Agent` PM *antes* que las `Phase` hace que el creador ya
  "participe" cuando se insertan las fases, satisfaciendo sus políticas sin trucos.
- **Alternativa descartada**: hacer el bootstrap con un rol que ignore RLS (owner/superuser). Más
  simple pero rompe el modelo uniforme de S10 y abre una vía sin RLS; se rechaza salvo que las
  políticas de INSERT resulten inviables (se documentaría como excepción con test).
- **Verificación (tasks)**: test de integración de que un usuario crea su proyecto y queda PM, y de
  que **no** puede insertar agentes en un proyecto donde no es PM (RLS + middleware).

## D2 — Sin migración de tablas; sí migración de políticas

- **Decisión**: NO se modifican modelos Prisma (Project/Phase/Agent/AuditEvent ya tienen todo lo
  necesario, incl. `@@unique([userId, projectId])`, `sharePercent Int`, `guaranteedFee`/`feeAtRisk`
  `BigInt`, `PhaseName`). Se añade **una migración SQL additiva** solo con las **políticas RLS de
  INSERT/UPDATE** de D1 (sin reset; patrón de S10).
- **Rationale**: respeta "nada derivado se persiste" y evita tocar un esquema estable.

## D3 — Validación de la suma de reparto: función pura, sin persistir "completitud"

- **Decisión**: una función pura `validateShareSplit(agents)` en `src/lib/agents/share-split.ts`
  que devuelve `{ sum, isComplete }` (`isComplete = sum === 100`). La usa el **frontend** para el
  aviso en vivo y el **backend** para validar al confirmar. **No se persiste** ningún flag de "setup
  confirmado" (sería un derivado): el gate de 100% es una comprobación al vuelo.
- **Rationale**: alineado con "nada derivado se persiste" (§7) y con el patrón de funciones puras.
  En S12 no hay acción posterior que el gate deba bloquear (el presupuesto es S13); el gate evita
  marcar el setup como completo en la UI y queda disponible en servidor para cuando se necesite.
- **Nota**: NO es uno de los 3 cálculos críticos → se testea (incluye casos 0%, 100%, ≠100%, agentes
  a 0%) pero sin el rito TDD innegociable reservado a EVM/FRC/applyChange.

## D4 — `clientName` obligatorio al crear

- **Hallazgo**: `Project.clientName` es `String` NOT NULL en el schema. El flujo A (§10.1) cita
  "nombre, descripción, fase inicial y fechas" pero no el cliente.
- **Decisión**: el formulario de creación pide **Cliente** (obligatorio), además de nombre y código.
  Descripción y fechas son opcionales (§9.2). La fase inicial es siempre Validación (no se elige en
  S12; cambiar fase está fuera de alcance).

## D5 — Asignar agente por email de usuario EXISTENTE

- **Decisión**: el alta de agente recibe el **email**; el servidor resuelve el usuario existente. Si
  el email no corresponde a ningún usuario, responde con error claro (`NOT_FOUND`/`VALIDATION_ERROR`)
  y **no crea nada** (FR-006). La invitación/creación de usuarios nuevos es la spec 006 (issue #37).
- **Rationale**: mantiene S12 acotado; reaprovecha el modelo `User` existente.

## D6 — Query keys, invalidación y navegación (frontend)

- **Decisión**: tras crear proyecto (mutation), **invalidar `['me']`** para que aparezca en el
  listado, y navegar a la pantalla de agentes del proyecto (`/projects/:id/agents`) para continuar el
  flujo A. Agentes bajo query key `['project-agents', projectId]`; invalidar tras añadir/editar.
- **Rationale**: cierra el `pendiente` de convenciones de TanStack Query del ADR-003, coherente con
  S11 (`['me']`).

## D7 — Honorarios en euros (UI) ↔ céntimos (almacenamiento)

- **Decisión**: el formulario pide honorarios en **euros**; la conversión a **céntimos** (`BigInt`)
  ocurre en el borde (entrada del cliente o del servidor), nunca se persiste el euro. Validación:
  `sharePercent` entero 0–100; honorarios ≥ 0.
- **Rationale**: regla de dominio (dinero en céntimos enteros, conversión solo en los bordes).

## Dependencias

Ninguna nueva. Todo se cubre con lo ya instalado (Express, Prisma, Zod, Mantine, TanStack Query,
React Router, Vitest, Testing Library).
