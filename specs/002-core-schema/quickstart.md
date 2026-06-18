# Quickstart / Validación: Esquema núcleo + seed

**Feature**: 002-core-schema | **Date**: 2026-06-18

Guía para validar que la feature funciona de extremo a extremo. No incluye código de implementación (eso es `tasks.md` + la ejecución).

## Prerequisitos

- PostgreSQL corriendo en Docker (contenedor `ipd-postgres`, S06).
- `.env` con `DATABASE_URL` apuntando a la BD `ipd`.
- Dependencias instaladas (`pnpm install`), incluida `argon2` (se añade en esta feature).

## Pasos de validación

1. **Migración inicial con modelos**

   ```bash
   npx prisma migrate dev --name core_schema
   ```

   Esperado: crea la migración bajo `prisma/migrations/` y la aplica sin errores; el cliente Prisma se regenera con los 10 modelos. **(SC-001)**

2. **Seed**

   ```bash
   pnpm db:seed        # o: npx prisma db seed
   ```

   Esperado: crea 5 usuarios (uno por rol), 1 proyecto demo con sus 4 fases y 5 agentes. Re-ejecutarlo no duplica datos. **(SC-002, SC-003, FR-013)**

3. **Inspección**

   ```bash
   npx prisma studio
   ```

   Comprobar:
   - 5 filas en `User`, distinguibles por rol-objetivo; ninguna contraseña en claro. **(US1)**
   - 1 `Project` con `activePhaseId` apuntando a la fase `VALIDATION`; 4 filas en `Phase` en orden 0–3. **(US2, SC-003)**
   - 5 `Agent` (uno por rol) vinculando User↔Project con sus condiciones FRC. **(US2)**

4. **Revisión del esquema (regla de oro §7)**

   Abrir `prisma/schema.prisma` y confirmar que **no** existen columnas derivadas: `currentBudget`, `accruedCost`, `ev`, `frc`, `consumedContingency`, `effectiveForecast`, `phaseStatus`, `voided`. **(SC-004)**

5. **Inmutabilidad de costes (revisión de modelo)**

   Confirmar que `RealCost` no tiene `updatedAt` y sí `type`/`reversalOfId`/`reason`, y que `AuditEvent` no se edita ni borra en el flujo. **(US4, US5, SC-005)**

## Salida esperada

- `pnpm typecheck` pasa (Prisma genera tipos válidos; el seed compila en TS strict).
- La base de datos refleja el estado demostrable; el resto de features (auth, presupuesto, FRC) tienen dónde leer/escribir.
