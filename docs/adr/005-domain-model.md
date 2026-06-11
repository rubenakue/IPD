# ADR-005: Decisiones estructurales del modelo de dominio

**Fecha:** 2026-06-11
**Estado:** Aceptado

## Contexto

Los nombres de las entidades de dominio están fijados por el briefing (`Project`, `Phase`, `Budget`, `BudgetLine`, `RealCost`, `Risk`, `Change`, `Incident`, `Decision`, `Agent`, `FRC`). Quedaban por decidir tres reglas estructurales que condicionan todo el modelo y que, mal elegidas, se arrastran sin remedio: la representación del dinero, el tratamiento del presupuesto objetivo ante cambios aprobados, y si el FRC es dato almacenado o valor derivado. El diseño de campo a campo pasará por el flujo SDD; este ADR fija la estructura.

## Opciones consideradas

- **Dinero — céntimos enteros (elegido) vs float vs librería Decimal:** los float producen errores de redondeo inaceptables en software financiero (el FRC se verificará al céntimo); una librería Decimal es exacta pero mete una dependencia en las funciones puras de cálculo; los céntimos enteros no tienen redondeo y mantienen los cálculos simples y testables.
- **Presupuesto objetivo — base inmutable + ajustes (elegido) vs mutación con log vs snapshots completos:** mutar pierde trazabilidad real; los snapshots duplican datos; la base inmutable con ajustes de cambios aprobados reproduce el patrón contable real (presupuesto base + modificados) y da gratis el indicador de "impacto acumulado de cambios" del dashboard.
- **FRC — calculado al vuelo (elegido) vs persistido vs híbrido:** persistirlo crea el riesgo de cifra almacenada desincronizada de los datos; calcularlo al vuelo garantiza coherencia y encaja con `calculateFRC()` como función pura con TDD.

## Decisión

1. **Dinero en céntimos enteros** en toda la plataforma: `BIGINT` en PostgreSQL, `number` entero en TypeScript. La conversión a euros ocurre solo en la capa de presentación y en los bordes de importación (formularios, Excel).
2. **Presupuesto objetivo como línea base inmutable más ajustes:** el `Budget` aprobado no se modifica nunca; cada `Change` aprobado de tipo 2 o 3 registra ajustes por partida, y el presupuesto vigente se deriva como `base + Σ ajustes aprobados`.
3. **`FRC` es un valor derivado, no una tabla:** `calculateFRC()` (función pura en `src/lib/calculations/`) lo calcula bajo demanda a partir del presupuesto vigente, los costes reales y las condiciones de cada agente. Si una spec futura exige histórico de evolución, se añadirán snapshots (pendiente de SDD, no se implementa ahora).
4. **`User` ≠ `Agent`:** `User` es la cuenta de login; `Agent` es la participación en un proyecto concreto (rol + condiciones de FRC: porcentaje de reparto y honorarios en riesgo). Un mismo `User` puede tener roles distintos en proyectos distintos.

## Consecuencias

- **Positivas:** cálculos financieros exactos y verificables; trazabilidad completa del presupuesto (la demo "registra un cambio de alcance y muéstrame cómo afecta" sale natural); el FRC nunca miente; el modelo de permisos por proyecto queda bien fundado.
- **Negativas:** disciplina obligatoria en los bordes (convertir euros↔céntimos al importar/mostrar); consultar el presupuesto vigente requiere agregar base + ajustes; el FRC no tiene histórico temporal de serie.
- **Pendiente:** diseño campo a campo de cada entidad vía SDD; formato de importación Excel del presupuesto; snapshots de FRC si el dashboard pide curva de evolución.
