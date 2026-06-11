# ADR-004: Framework HTTP, forma de la API y autenticación

**Fecha:** 2026-06-11
**Estado:** Aceptado

## Contexto

Con el modelo de backend propio ya decidido (ADR-001), faltaba elegir el framework HTTP de la API, el estilo de comunicación frontend↔backend y el mecanismo de autenticación. Restricciones del briefing: 5 roles asignados por proyecto, vista privada del promotor aplicada en servidor, autenticación segura sin usuarios hardcodeados.

## Opciones consideradas

- **Framework HTTP — Express (elegido) vs Fastify vs NestJS:** Express es el estándar histórico con la mayor base de documentación y tutoriales, ideal para aprender montando cada pieza; Fastify es más moderno (validación integrada, mejor TypeScript) pero con menos material introductorio; NestJS impone estructura empresarial con curva alta, sobredimensionado para el prototipo.
- **Forma de la API — REST (elegido) vs tRPC vs GraphQL:** REST es el estándar universal (URLs + verbos HTTP) y conocimiento transferible; tRPC da tipos extremo a extremo pero oculta el HTTP subyacente, contrario al objetivo de aprendizaje; GraphQL descartado por recomendación explícita del briefing.
- **Autenticación — Sesiones con cookie (elegida) vs JWT:** las sesiones en servidor con cookie httpOnly son el modelo más simple de razonar, revocables al instante y con menos superficie de error; JWT no guarda estado en servidor pero su caducidad/renovación/revocación añaden complejidad propensa a fallos de seguridad.

## Decisión

API REST construida con Express (rutas bajo `/api`), autenticación por sesiones almacenadas en PostgreSQL con cookie `httpOnly`. Cadena de seguridad por petición: middleware de sesión resuelve la cookie → usuario; middleware de permisos comprueba el rol del usuario en el proyecto afectado; la identidad se propaga a las políticas RLS de Postgres según el patrón del ADR-001.

## Consecuencias

- **Positivas:** máxima disponibilidad de documentación y ayuda; se aprenden los fundamentos reales de HTTP, sesiones y permisos; la pila Express + Prisma + Postgres es la más trillada que existe.
- **Negativas:** sin tipos automáticos entre frontend y backend (se mitiga compartiendo `src/types/domain.ts` en el monorepo); la validación de datos de entrada no viene de serie en Express — habrá que elegir librería de validación (p. ej. Zod) cuando toque, como dependencia nueva a proponer.
- **Pendiente:** librería de validación de entrada; algoritmo de hash de contraseñas (proponer argon2 o bcrypt al implementar el módulo de auth); diseño fino de las políticas RLS (depende del modelo de dominio).

## TODO (comandos exactos, los ejecuta Rubén o el rol que implemente)

```bash
pnpm add express express-session connect-pg-simple
pnpm add -D @types/express @types/express-session
# Hash de contraseñas (decidir al implementar auth): pnpm add argon2
```
