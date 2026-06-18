# ADR-009: Librería de validación de entrada de la API

**Fecha:** 2026-06-18
**Estado:** Aceptado

## Contexto

ADR-004 decidió Express + REST y dejó explícitamente pendiente la librería de validación de datos de entrada ("habrá que elegir librería de validación —p. ej. Zod— cuando toque, como dependencia nueva a proponer"). El concepto lo recoge como pendiente abierto en §20.2 (punto 1) y la API debe validar parámetros de ruta, query, body, importes y porcentajes antes de procesar (§14.2). Al levantar el esqueleto de la API (S08) ese momento ha llegado: hace falta una forma declarativa y type-safe de validar la entrada y de traducir sus fallos al error estándar `VALIDATION_ERROR` (§14.3).

## Opciones consideradas

- **Zod (elegido):** esquemas declarativos en TypeScript de los que se **infiere el tipo** (`z.infer`), una sola fuente de verdad para validación y tipos. Encaja con la regla de TS strict / cero `any` del proyecto, no necesita decoradores ni build especial (funciona con `node --experimental-strip-types`), y sus errores (`ZodError.issues`) se mapean directamente al campo `details` del error estándar. Es la opción que el propio ADR-004 y §20.2 anticipaban.
- **Validación manual (sin librería):** cero dependencias, pero obliga a escribir y mantener a mano comprobaciones repetitivas y a duplicar los tipos; propensa a huecos y a divergir del contrato. Descartada por coste y fragilidad.
- **Yup:** similar a Zod pero con inferencia de tipos menos sólida y orientación histórica a JS; menos idiomático en un proyecto TS-first.
- **Validación integrada de un framework (p. ej. la de Fastify con JSON Schema):** habría implicado reabrir ADR-004 (framework HTTP), que ya eligió Express. Fuera de alcance.

## Decisión

**Zod** como librería de validación de entrada de la API (dependencia de producción). Se usa en dos sitios desde S08: validar la configuración de entorno (`src/server/config.ts`) y el middleware reutilizable `validate(schema)` (`src/server/middlewares/validate.ts`). Un fallo de validación se convierte siempre en el error estándar `VALIDATION_ERROR` (§14.3), con el detalle de los campos en `details`. Cierra el pendiente §20.2.1.

## Consecuencias

- **Positivas:** una sola definición por esquema da validación + tipo TS inferido (sin duplicar); errores de validación uniformes y con detalle; sin herramientas de build añadidas (compatible con el runtime nativo de Node 22). Pila de validación lista para los endpoints de S09 (login) en adelante.
- **Negativas:** una dependencia de runtime más. Asumible: es ligera, sin dependencias transitivas pesadas, y es el estándar de facto en el ecosistema TS.
- **Pendiente:** ninguno respecto a la validación de entrada. La librería de **sesión** (`express-session` + `connect-pg-simple`) sigue pendiente y se propondrá en S09; el hash de contraseñas (argon2) ya se resolvió en S07.

## TODO (comando, ya ejecutado en S08)

```bash
pnpm add zod
```
