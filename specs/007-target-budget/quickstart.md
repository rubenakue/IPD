# Quickstart: Presupuesto objetivo (flujo B)

## Prerequisitos

1. Base de datos configurada en `.env`.
2. Migraciones aplicadas.
3. Usuarios demo disponibles con `pnpm db:seed` o datos equivalentes.

## Validación manual

1. Ejecutar la API y el frontend.
2. Iniciar sesión como PM.
3. Abrir un proyecto y entrar en `Presupuesto`.
4. Confirmar que un proyecto sin presupuesto muestra `Sin presupuesto cargado`.
5. Añadir tres partidas en dos capítulos; verificar subtotales y total.
6. Editar una partida y borrar otra; verificar que el total cambia.
7. Aprobar el presupuesto; verificar que aparece como `Aprobado` y que los botones de edición
   desaparecen.
8. Intentar mutar el presupuesto aprobado por API; debe responder `DOMAIN_ERROR`.
9. Iniciar sesión como otro agente del proyecto; debe ver el presupuesto agrupado sin acciones.
10. Iniciar sesión como usuario que no participa en el proyecto; la API debe negar acceso.

## Gates

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm prisma migrate status
```

Expected outcome: todos los comandos pasan y existe un `AuditEvent` `budget.approved` tras aprobar.

