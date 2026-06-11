# ADR-001: Arquitectura de backend y base de datos

**Fecha:** 2026-06-11
**Estado:** Aceptado

## Contexto

Había que decidir el modelo de backend del prototipo IPD y su base de datos. Restricciones ya fijadas: Node 20+, TypeScript strict, pnpm, React. El kickoff exige Row Level Security (RLS) implementada en la base de datos, y el briefing obliga a que la vista privada del promotor se aplique en servidor, nunca solo en frontend. Prioridad declarada del desarrollador: maximizar el aprendizaje (el plazo es flexible).

## Opciones consideradas

- **Opción A — BaaS (Supabase):** backend gestionado sobre PostgreSQL con auth y RLS nativos. Ventajas: máxima velocidad, módulo de auth casi resuelto, RLS de serie. Inconvenientes: menos aprendizaje del lado servidor; dependencia de un servicio externo.
- **Opción B — Full-stack (Next.js + Neon + Drizzle):** frontend y backend en el mismo framework. Ventajas: un repo, un despliegue, estándar de industria. Inconvenientes: auth y RLS hay que montarlos a mano igualmente; la curva del App Router es alta.
- **Opción C — Backend propio (Node + TypeScript) + frontend React/Vite (elegida):** API, auth y permisos construidos a mano. Ventajas: máximo aprendizaje y control total. Inconvenientes: la opción más lenta; la integración con RLS es manual.
- **Descartadas — PocketBase / Firebase:** no ofrecen el RLS de PostgreSQL y el modelo de datos IPD es fuertemente relacional. Incumplen una restricción innegociable del kickoff.
- **Base de datos — MariaDB (propuesta inicial) vs PostgreSQL (elegida):** MariaDB no tiene RLS nativo (sus permisos llegan a nivel de tabla/columna, no de fila); PostgreSQL lo soporta de serie con `CREATE POLICY`.
- **ORM — Prisma (elegido) vs Drizzle vs SQL a mano:** Prisma es el más documentado, con migraciones y tipado automáticos, idóneo para aprender; Drizzle es más ligero y cercano al SQL pero con menos material de apoyo.

## Decisión

Backend propio en un único repositorio: API Node 20 + TypeScript (framework HTTP pendiente, se documenta en ADR-004; candidato principal Express) + PostgreSQL con Prisma como ORM. En desarrollo, PostgreSQL corre en Docker local; el despliegue para enseñar a terceros se decidirá en un ADR posterior.

La seguridad se aplica en dos capas: middleware de permisos en la API (primera línea) y políticas RLS en PostgreSQL (red de seguridad). La API se conecta a la base de datos con un rol sin privilegios y fija la identidad del usuario en cada petición (`SET LOCAL` dentro de una transacción), que es lo que leen las políticas.

## Consecuencias

- **Positivas:** aprendizaje completo del lado servidor (auth, permisos, API, migraciones); cumplimiento estricto del requisito de RLS; Express/Postgres/Prisma es de las combinaciones con más documentación y tutoriales que existen.
- **Negativas:** más código propio que mantener que con un BaaS; el patrón Prisma + RLS por transacción tiene curva propia; Docker es una herramienta nueva que aprender.
- **Estructura de repo:** se mantiene la estructura obligatoria del briefing (§7). El código de la API vive en `src/server/`; `src/types/domain.ts` y `src/lib/calculations/` (funciones puras) son compartidos por frontend y backend. El frontend usa Vite como dev server y empaquetador.
- **Pendiente de decidir:** framework HTTP, forma de la API y mecanismo de auth (ADR-004); librería UI (ADR-002); arquitectura de estado (ADR-003); framework de tests; despliegue.

## TODO (comandos exactos, los ejecuta Rubén o el rol que implemente)

```bash
pnpm add -D prisma
pnpm add @prisma/client
# Postgres en Docker (requiere Docker Desktop instalado):
docker run --name ipd-postgres -e POSTGRES_PASSWORD=<elige-una> -e POSTGRES_DB=ipd -p 5432:5432 -d postgres:17
```
