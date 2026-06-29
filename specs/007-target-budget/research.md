# Research: Presupuesto objetivo (flujo B)

## Decision: capítulo como campos de `BudgetLine`

**Rationale**: La spec decidió que el capítulo no es entidad propia. Guardar `chapterCode` y
`chapterName` en cada partida permite agrupar y subtotalizar sin una tabla nueva.

**Alternatives considered**: tabla `Chapter` separada; descartada porque contradice FR-013 y añade
relación sin valor para S13.

## Decision: validación de duplicados solo al aprobar

**Rationale**: La spec permite códigos duplicados en borrador para no interrumpir la carga manual.
La aprobación es el gate de negocio donde se exige código no vacío y único.

**Alternatives considered**: índice único SQL sobre `(budgetId, code)`; descartado porque impediría
el estado intermedio válido de borrador.

## Decision: inmutabilidad por API y trigger SQL

**Rationale**: La API debe rechazar mutaciones de presupuestos aprobados con mensajes claros, pero
la base de datos también debe impedir que un endpoint futuro mutile la línea base. El trigger
bloquea cambios destructivos sobre `BudgetLine` tras aprobación y bloquea reapertura del `Budget`.

**Alternatives considered**: solo middleware de API; descartado porque IPD exige permisos y reglas
de dominio en dos capas cuando hay riesgo económico.

## Decision: aprobación transaccional con lock

**Rationale**: `POST /budget/approve` toma lock sobre el `Budget`, revalida líneas, actualiza
estado/fecha y registra `budget.approved` en la misma transacción. Así una doble aprobación no deja
dos estados inconsistentes ni auditoría falsa.

**Alternatives considered**: update optimista sin lock; descartado porque la aprobación define la
línea base económica y necesita una frontera clara.

## Decision: tabla Mantine simple

**Rationale**: S13 solo necesita agrupación por capítulo, subtotales y CRUD básico. Mantine `Table`
y componentes existentes cubren el caso sin dependencia nueva.

**Alternatives considered**: `mantine-datatable` o TanStack Table; pospuestas hasta que haya
filtros, ordenación compleja o tablas económicas más pesadas.

