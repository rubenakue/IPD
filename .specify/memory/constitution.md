# Constitución de IPD Platform

> Ley suprema del proyecto. Toda spec, todo plan y todo código la respetan.
> Si una propuesta la contradice, o se cambia la propuesta o se enmienda esta
> constitución de forma consciente (ver Governance). Escrita en lenguaje llano
> a propósito: Rubén está aprendiendo SDD y TDD.

## Core Principles

### I. SDD — la spec antes que el código (NON-NEGOTIABLE)

Ninguna feature se implementa sin una spec previa aprobada. La spec describe el
QUÉ y el POR QUÉ en lenguaje de negocio, sin tecnología; el plan describe el CÓMO.
El código es una consecuencia de la spec, nunca al revés. El flujo es
`constitution → specify → clarify → plan → tasks → implement` (GitHub Spec Kit).
Una feature por rama. Saltarse la spec para "ir más rápido" está prohibido: el
malentendido que no se ve en la spec se paga multiplicado en el código.

### II. TDD estricto en los tres cálculos críticos (NON-NEGOTIABLE)

`calculateEVM`, `calculateFRC` y `applyChange` se desarrollan con el ciclo
red → green → refactor: primero un test que falla, luego el código mínimo que lo
pone en verde, luego se limpia. Sus tests son innegociables y se escriben ANTES
que la implementación. Cada bug encontrado en estas funciones deja primero un
test que lo reproduce. Un test que nace en verde es sospechoso.

### III. TypeScript strict, cero `any`

`tsconfig` con `strict: true`. Prohibido `any` y `@ts-ignore` nuevos. Si un caso
extremo los exigiera, se justifica con comentario y se documenta en un ADR. No se
relajan las reglas de tipos, lint o formato para silenciar un error: se arregla el
código. `pnpm typecheck` debe pasar siempre.

### IV. Fidelidad al dominio IPD

- **Nombres de entidad en inglés y exactos**: `Project`, `Phase`, `Budget`,
  `BudgetLine`, `RealCost`, `Risk`, `Change`, `Incident`, `Decision`, `Agent`, `FRC`.
  Código, identificadores y commits en inglés; UI y textos de negocio en español.
- **Dinero en céntimos enteros** en todo cálculo y almacenamiento; la conversión a
  euros ocurre solo en presentación o en los bordes de importación.
- **Nada derivado se persiste**: presupuesto vigente, coste acumulado, EV, previsión
  y FRC se calculan al vuelo a partir de los datos fuente (ver `docs/concepto-global.md` §7).
- **Lógica de cálculo pura**: EVM, FRC y el motor de cambios viven en
  `src/lib/calculations/` como funciones sin I/O ni efectos secundarios.

### V. Seguridad y permisos en el servidor (NON-NEGOTIABLE)

El filtrado por rol se aplica en el servidor y en la base de datos (RLS), nunca solo
en el frontend. La vista privada del promotor (costes de desarrollo) no llega jamás
a un constructor o proyectista, ni siquiera si llama directamente al endpoint. Los
roles se asignan por proyecto. No hay credenciales en el repositorio; `.env.example`
siempre actualizado y sin valores reales.

### VI. Trazabilidad y libros abiertos

La transparencia económica es un principio de producto, no un extra: la información
del núcleo IPD es compartida, salvo la vista privada del promotor. Cada dato relevante
explica su origen (quién, cuándo, contra qué). Las acciones relevantes dejan un
`AuditEvent` append-only. Los importes no se editan ni se borran de forma destructiva
(p. ej. `RealCost` se corrige con contra-asiento, no se sobrescribe).

### VII. Decisiones documentadas y aprendizaje en lenguaje simple

Toda decisión de arquitectura o tecnología se documenta en un ADR (`docs/adr/`).
Cada sesión de trabajo significativa deja una entrada en `docs/diario.md`. Como Rubén
está aprendiendo, los conceptos nuevos (SDD, TDD, tecnologías web) se explican en
lenguaje llano antes de aplicarlos; no se avanza con dudas sin resolver.

## Restricciones técnicas

El stack está fijado por los ADRs `docs/adr/001`–`008` y no se cambia sin un ADR que
lo sustituya: Node 20+, TypeScript strict, pnpm, React + Vite, Mantine, TanStack Query,
React Router v7; backend Express con API REST y sesiones; PostgreSQL + Prisma con RLS;
Vitest para tests. Comandos canónicos: `pnpm typecheck`, `pnpm test`, `pnpm lint`.
Antes de instalar cualquier dependencia nueva se propone y se justifica (cuál y por qué),
aunque ya esté prevista en un ADR.

## Flujo de desarrollo

- **Ciclo por feature**: spec → clarify → (checklist) → plan → tasks → (analyze) →
  TDD (rojo) → implement (verde) → refactor → `/verify` → commit.
- **Definición de "terminado"**: `pnpm typecheck` pasa, los tests pasan, no hay
  `console.log` ni código muerto añadido, y la documentación afectada está al día.
- **Commits**: Conventional Commits, en inglés, imperativo, un commit por unidad lógica.
  Nunca `git commit --no-verify`.
- **Ediciones mínimas**: no se reformatea ni se "mejora" código que no se pidió tocar.

## Governance

Esta constitución prevalece sobre cualquier otra práctica. Enmendarla es una decisión
consciente: requiere justificación, queda registrada con un cambio de versión y, si
afecta al flujo, una nota en `docs/diario.md`. Las revisiones de cada feature
(spec, plan, tasks, PR) verifican el cumplimiento de estos principios; cualquier
complejidad que los viole debe justificarse en la sección *Complexity Tracking* del
plan o, si no hay justificación, eliminarse. Los ADRs cubren el CON QUÉ (tecnología);
esta constitución cubre el CÓMO se trabaja y los innegociables del dominio.

**Version**: 1.0.0 | **Ratified**: 2026-06-12 | **Last Amended**: 2026-06-12
