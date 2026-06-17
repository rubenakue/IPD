# Roadmap de implementación — IPD Platform

**Estado:** activo · **Fecha:** 2026-06-12
**Fuentes:** [concepto-global.md](concepto-global.md) (qué construir), [plan-sdd-tdd.md](plan-sdd-tdd.md) (cómo trabajar), `docs/adr/` (con qué).

Este documento responde a una sola pregunta: **"hoy me siento a trabajar en IPD, ¿qué hago?"**
Respuesta: busca la primera sesión sin marcar `[ ]` y haz esa. Nada más.

---

## 1. Cómo usar este plan

### La unidad es la SESIÓN, no el día

El orden es estrictamente secuencial — cada sesión asume hechas las anteriores.

**Si una sesión se te alarga:** corta donde estés, deja anotado en la issue por dónde ibas, y la próxima vez continúas la MISMA sesión. No saltes a la siguiente con la anterior a medias.

**Si te atascas (>1 hora sin avanzar):** páralo, pregunta a Claude Code explicando qué intentas y qué pasa, y anota el bloqueo en `docs/diario.md`. La regla del briefing: nadie se queda bloqueado más de una sesión.

### Ritual de apertura (5 min)

1. Abre este archivo → primera sesión sin marcar.
2. Lee su bloque entero antes de tocar nada.
3. Mueve su tarjeta a "En curso" en el tablero de GitHub.

### Ritual de cierre (10 min) — innegociable

1. `pnpm typecheck` (siempre) · `pnpm lint` y `pnpm test` (desde S2).
2. Commit con Conventional Commits (un commit por unidad lógica).
3. Entrada en `docs/diario.md` (5 líneas: qué, bloqueos, cómo se resolvió).
4. Marca los checkboxes completados aquí y mueve la tarjeta a "Hecho".

---

## 2. Mapa de hitos

| Hito | Qué consigue | Sesiones | Demo al terminar |
|---|---|---|---|
| **H0** Organización | Tablero GitHub operativo | S0 | — |
| **H1** Método | Constitución SDD + spec de cálculos | S1 | — |
| **H2** Corazón en verde | Los 3 cálculos críticos con TDD, sin infraestructura | S2–S5 | `pnpm test` verde: FRC, EVM y cambios calculan bien |
| **H3** Persistencia | Postgres + Prisma + esquema núcleo + seed | S6–S7 | Prisma Studio muestra usuarios y proyecto |
| **H4** API y auth | Express + sesiones + permisos en dos capas | S8–S10 | `curl`: login y un constructor NO recibe costes privados |
| **H5** Frontend shell | App navegable: login, proyectos, setup agentes | S11–S12 | Flujo A completo en el navegador |
| **H6** Núcleo económico | Presupuesto, costes, avance, FRC por rol | S13–S16 | Flujo C completo: imputar → ver FRC moverse |
| **H7** Demo P1 | Dashboard real + seed completo + README | S17–S18 | La demo del briefing, módulos P1 |
| **H8** Diferencial P2 | Cambios, riesgos, decisiones, EVM completo | S19–S24 | Demo completa de 20 min |

**Total hasta demo P1: ~19 sesiones (~60-70 h).** A 3-4 h/día todos los días ≈ 3 semanas. Tu plan de 7 días (~25 h) llega de forma realista hasta **S8-S9** (API con auth empezada) — y está bien: el plazo es flexible y el orden garantiza que lo hecho siempre es demostrable.

---

## 3. Las sesiones

### H0 — Organización

#### S0 — Tablero GitHub `(sesión corta, ~1-2 h)`
- [x] Crear GitHub Project "IPD Platform" en el repo: vista Board (Backlog / En curso / Hecho) + campo `Hito`.
- [x] Crear milestones H1–H8 y una issue por sesión (título: `S07 — Esquema Prisma núcleo`), cada una con su checklist copiado de aquí. *(Claude Code puede generarlas con `gh` en un minuto — pídeselo.)*
- [x] Labels por área: `calculations`, `auth`, `budget`, `frc`, `dashboard`, `changes`, `infra`, `docs`.
- [x] Commit de este roadmap.

**Hecho cuando:** el tablero muestra las sesiones en orden y la primera está en "Backlog".

> **Stitch / mockups:** todavía no. Tiene sentido justo antes de S11 (ver nota allí). **Linear u otras herramientas:** no — el tablero de GitHub vive donde viven las issues y los PRs; añadir otra plataforma es sincronización gratuita que no necesitas.

---

### H1 — Método

#### S1 — Constitución y primera spec (`/sdd-speckit`)
- [x] Ejecutar `/sdd-speckit`: instala la CLI `specify`, crea `.specify/` y redacta la constitución contigo. Material de entrada: §8 (principios) y §18 (criterios de éxito) de [concepto-global.md](concepto-global.md) — están escritos para esto.
- [x] Primera spec con `/speckit.specify`: **"cálculos críticos"** (calculateFRC, calculateEVM, applyChange). Material: §9.5, §9.6 (fórmulas exactas) y §9.10 del concepto + ADR-005/006.
- [x] `/speckit.clarify` hasta que no queden ambigüedades; luego `/speckit.plan` y `/speckit.tasks`.

**Hecho cuando:** existe `.specify/memory/constitution.md` aprobada por ti y la spec de cálculos con sus tareas.

---

### H2 — Corazón en verde (cálculos puros, sin infraestructura)

> **Por qué los cálculos van ANTES que la base de datos:** son funciones puras — no necesitan Docker, ni Express, ni React. Es TDD en su forma más limpia (ideal para aprender), resuelve pronto los tests innegociables del briefing, y si después algo se atasca en infraestructura, el activo más valioso para julio ya existe.

#### S2 — Harness de tests y linting (`/tdd-harness`)
- [x] Ejecutar `/tdd-harness`: instala Vitest, scripts `pnpm test` / `pnpm test:watch`, esqueletos puros en `src/lib/calculations/` (lanzan `Not implemented`), tipos mínimos en `src/types/domain.ts`, y los tests de los 3 cálculos **en rojo**.
- [x] Configurar ESLint + script `pnpm lint` (el briefing lo exige antes del primer código de negocio, que llega en S3).

**Hecho cuando:** `pnpm test` falla por asserts esperados (no por configuración rota); `pnpm lint` y `pnpm typecheck` pasan.

#### S3 — `calculateFRC()` en verde
- [x] Ciclo red→green→refactor caso a caso, en este orden: ahorro repartido → sobrecoste repartido → límite de honorarios en riesgo → **exceso absorbido por el promotor** → agente al 0% → redondeos que cuadran → reponderación. (Los casos están enumerados en §9.5.)

**Hecho cuando:** tests de FRC verdes; la función no importa nada de I/O.

#### S4 — `calculateEVM()` en verde
- [x] Implementar con las fórmulas exactas de §9.6: EV desde avance, AC neto de contra-asientos, y TODOS los estados "sin datos" (sin avance, AC=0, PV=0) — son tan importantes como las fórmulas.

**Hecho cuando:** tests de EVM verdes, incluidos los de "sin datos".

#### S5 — `applyChange()` en verde
- [x] Tipo 1 (solo registro) → tipo 2 con destino dual (contingencia / ajuste) → tipo 3 (honorarios + reponderación opcional). La función devuelve **efectos**, no toca ninguna BD (ADR-006).

**Hecho cuando:** `pnpm test` completamente verde. 🎉 El corazón del producto late — commit y entrada de diario destacada.

---

### H3 — Persistencia

#### S6 — Base de datos viva
- [x] Instalar Docker Desktop (la primera vez lleva un rato — es parte de la sesión, no un imprevisto).
- [x] Arrancar Postgres con el comando del ADR-001 (`docker run … postgres:17`).
- [x] `pnpm add -D prisma && pnpm add @prisma/client` + `npx prisma init`; `DATABASE_URL` en `.env` y `.env.example` actualizado.

**Hecho cuando:** `npx prisma migrate dev` conecta y crea la BD sin errores.

#### S7 — Esquema núcleo + seed de usuarios
- [ ] Modelar en `schema.prisma`: `User`, `Project`, `Phase`, `Agent`, `Budget`, `BudgetLine`, `RealCost`, `ChangeAdjustment`, `AuditEvent`. **Guía obligatoria:** la tabla "almacenado vs derivado" de §7 del concepto — nada derivado se persiste.
- [ ] Migración inicial + script de seed con los 5 usuarios de demo (uno por rol).

**Hecho cuando:** migración aplicada y Prisma Studio muestra los usuarios; `pnpm typecheck` pasa.

---

### H4 — API y autenticación

#### S8 — Spec de auth + esqueleto Express
- [ ] `/speckit.specify` **"autenticación y roles por proyecto"** (módulo 9.1 + matriz §15 del concepto) → clarify → plan → tasks.
- [ ] Express en `src/server/`: `/api/health`, formato de error estándar (§14.3), y Zod para validación (mini-ADR de la dependencia, está como pendiente en §20.2).

**Hecho cuando:** `curl localhost:3000/api/health` responde y un error devuelve el JSON estándar.

#### S9 — Login y sesiones
- [ ] `express-session` + `connect-pg-simple` (sesiones en Postgres) + `argon2` para contraseñas (cierra el pendiente del ADR-004).
- [ ] `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`. Cookie `httpOnly`.
- [ ] Helper de `AuditEvent` (nace aquí, §8.9): primer evento registrado en el login… no — en acciones de negocio; déjalo listo para S10+.

**Hecho cuando:** con `curl`: login → recibe cookie → `/api/me` devuelve el usuario; las contraseñas en BD están hasheadas.

#### S10 — Permisos en dos capas
- [ ] Capa 1: middleware que resuelve el `Agent` del usuario en el proyecto y aplica la matriz §15.
- [ ] Capa 2: políticas RLS en Postgres + patrón `SET LOCAL` por transacción (ADR-001). Rol de conexión sin privilegios.
- [ ] Tests de integración de permisos: un constructor que llama al endpoint de costes privados del promotor recibe `FORBIDDEN`/datos vacíos — verificado contra **ambas** capas.

**Hecho cuando:** los tests de permisos están verdes. Este es el criterio de evaluación más literal del briefing.

---

### H5 — Frontend shell

> **Stitch entra aquí (opcional, antes de S11):** una sesión corta generando mockups de layout, dashboard, tabla de presupuesto y detalle de partida en [stitch.withgoogle.com](https://stitch.withgoogle.com), guardados en `docs/diseño/`. Úsalo para *decidir* cómo se ven las pantallas antes de construirlas — nunca como fuente de verdad de specs ni de código (tu instinto era correcto).

#### S11 — App navegable
- [ ] Vite + React + Mantine + React Router v7 + TanStack Query (comandos exactos en los TODOs de ADR-002/003/007).
- [ ] Layout general (§6.2): cabecera con proyecto/fase/rol, menú lateral.
- [ ] Pantalla de login real (contra `/api/auth/login`) + listado de proyectos del usuario.

**Hecho cuando:** en el navegador: login con un usuario del seed → ves tus proyectos.

#### S12 — Setup de proyecto (flujo A completo)
- [ ] Crear proyecto (el creador queda como PM; se crean las 4 fases — §9.2).
- [ ] Pantalla de agentes: roles, % de reparto (validación: suma 100%), honorarios base y en riesgo.
- [ ] `AuditEvent`: `project.created`, `agent.added`.

**Hecho cuando:** flujo A (§10.1) completo desde el navegador, con sus criterios de aceptación.

---

### H6 — Núcleo económico

#### S13 — Presupuesto objetivo
- [ ] `/speckit.specify` **"presupuesto y costes"** (cubre S13–S15; material: §9.4 + flujos B y C).
- [ ] Carga manual de presupuesto (capítulos y partidas) + transición `draft → approved` (base inmutable desde ahí).
- [ ] Tabla agrupada por capítulos — decidir aquí `mantine-datatable` vs TanStack Table (pendiente de ADR-002; mini-ADR con la elección).

**Hecho cuando:** flujo B (§10.2) demostrable; intentar editar la base aprobada falla.

#### S14 — Costes, contra-asientos y avance físico
- [ ] Imputar coste (constructor/PM) con su formulario; `RealCost` inmutable.
- [ ] Anulación con contra-asiento (`reversal` + motivo) — modelo contable puro de §8.8.
- [ ] Registro de avance físico por partida (§8.7) con autor y fecha.
- [ ] `AuditEvent`: `realCost.created`, `realCost.voided`, `progress.updated`.

**Hecho cuando:** flujo C pasos 1–11 (§10.3) incluida la variante de anulación.

#### S15 — Derivados y alertas
- [ ] Presupuesto vigente (base + ajustes), acumulados por partida/capítulo, desviación, previsión a cierre (default `max(real, vigente)` + override manual).
- [ ] Umbrales de alerta visual en la tabla (cierra el pendiente §20.2: empieza con constantes).

**Hecho cuando:** las cifras de la tabla cuadran a mano con un caso conocido; la partida que supera presupuesto se resalta.

#### S16 — FRC servido por rol
- [ ] `GET /api/projects/:id/frc` usando `calculateFRC()` (ya verde desde S3).
- [ ] Filtrado **en servidor** según §9.5: promotor/PM cuadro completo; constructor/proyectista solo lo suyo; observador solo estado agregado.
- [ ] Vista FRC en frontend.

**Hecho cuando:** tres logins distintos reciben tres respuestas distintas del MISMO endpoint (verifícalo con curl, no solo con la UI).

---

### H7 — Demo P1

#### S17 — Dashboard real + seed completo
- [ ] Dashboard (§9.6): tarjetas económicas, FRC del usuario, CV/CPI desde el avance, contadores con "sin datos" donde toque. Cero datos inventados.
- [ ] Completar el seed "Hotel Azahar" con el escenario íntegro de §17 (presupuesto, costes, avance).

**Hecho cuando:** el dashboard se alimenta 100% de la API y cumple los criterios 1–5, 10–11 y 14 de §18.

#### S18 — Verificación y demo ensayada
- [ ] Flujo G (§10.7) con dos navegadores a la vez (promotor vs constructor, misma URL).
- [ ] README: levantar el proyecto en <10 min siguiendo solo el README (pruébalo de verdad).
- [ ] `/verify` completo + ensayo de demo de 20 min con los flujos del briefing §9.

**Hecho cuando:** podrías hacer la demo mañana sin preparar nada.

---

### H8 — Diferencial P2 (cada sesión empieza por su spec)

- [ ] **S19** — Spec "motor de cambios" + modelo `Change` + flujo de estados Propuesto→Evaluado→Aprobado/Rechazado (solo PM transiciona).
- [ ] **S20** — Aprobar cambio: `applyChange()` (verde desde S5) aplicado en transacción + `Decision` vinculada automática + impacto en dashboard. Flujo E completo.
- [ ] **S21** — Riesgos: registro, coste ponderado, materialización → contingencia/coste real. Flujo D.
- [ ] **S22** — Incidencias y decisiones: registros, vínculos, búsqueda de texto libre en ambos. Flujo F.
- [ ] **S23** — Planificación básica: hitos + curva PV → EVM completo (SV/SPI dejan de estar "sin datos").
- [ ] **S24** — Pulido final, exportaciones simples si hay tiempo, ensayo de demo completa.

---

## 4. Reglas transversales (de AGENTS.md y los ADRs, recordadas aquí)

- **Ninguna feature sin spec** (desde H4, cada hito nuevo arranca con `/speckit.specify`). Los cálculos de H2 ya tienen la suya de S1.
- **Dependencia nueva = propuesta + justificación** antes de instalar (aunque esté en un TODO de ADR, confirma cuál y por qué).
- **Nada derivado se persiste** (tabla §7). Si te descubres guardando "presupuesto vigente" en una columna, para.
- **La seguridad se verifica en servidor**: cada pantalla nueva con datos sensibles necesita su test de permisos, no solo ocultar el componente.
- Un commit por unidad lógica · diario al cerrar · ADR si cambias una decisión de arquitectura.
