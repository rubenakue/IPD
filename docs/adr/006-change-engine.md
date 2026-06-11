# ADR-006: Motor de cambios — arquitectura y reglas de negocio

**Fecha:** 2026-06-11
**Estado:** Aceptado

## Contexto

La gestión de cambios tipificada (incidental / con impacto en coste / cambio de alcance) es uno de los tres cálculos críticos con TDD obligatorio. El briefing fija el flujo de estados (`Propuesto → Evaluado → Aprobado / Rechazado`) y los efectos por tipo, pero deja abiertas tres reglas de negocio: quién aprueba en la plataforma, el destino económico de los cambios tipo 2, y si un tipo 3 puede reponderar el reparto del FRC.

## Opciones consideradas

- **Arquitectura — motor puro + aplicación transaccional (elegida) vs lógica en los endpoints:** poner la lógica dentro de las rutas Express la haría intesteable sin base de datos; como función pura es testable con TDD y comparable con las implementaciones de los otros desarrolladores en julio.
- **Quién aprueba — PM registra el acta (elegida) vs aprueba el Promotor vs aprobación multi-rol:** el briefing asigna al PM "el flujo de cambios"; la decisión real la toma la Comisión Ejecutiva en reunión y la app la registra. La aprobación del promotor es contraria al espíritu IPD; la multi-rol es más fiel formalmente pero multiplica UI y tests, y puede añadirse en julio sin romper este diseño.
- **Destino económico del tipo 2 — se elige al aprobar (elegida) vs contingencias automático vs siempre ampliar presupuesto:** el destino (consumir contingencias o ampliar el presupuesto objetivo) es una decisión económica del equipo, no de la app; elegirlo al aprobar cubre los dos flujos reales y da uso al módulo de contingencias.
- **Reponderación en tipo 3 — sí, opcional (elegida) vs solo honorarios:** el caso de referencia del cliente (residencia de estudiantes 20 M€ → hotel 25 M€) exigió reponderar los pesos de los agentes; sin esta capacidad ese caso no sería representable.

## Decisión

`applyChange()` es una función pura en `src/lib/calculations/`: recibe el cambio aprobado y el estado económico actual, y devuelve los efectos (ajustes por partida, cambios de honorarios, nueva ponderación si procede) sin tocar la base de datos. La API Express aplica esos efectos dentro de una transacción de Postgres.

Reglas de negocio:

1. Solo el rol Project Manager transiciona estados del flujo. Cualquier agente del núcleo puede crear propuestas.
2. Al aprobar, el PM referencia la reunión de la Comisión Ejecutiva y la app crea automáticamente la entrada vinculada en el registro de `Decision`.
3. **Tipo 1 (incidental):** solo registro, sin efectos económicos.
4. **Tipo 2 (impacto en coste):** el PM elige el destino al aprobar — cargar contra la bolsa de contingencias o registrar un ajuste al presupuesto objetivo (sobre la base inmutable del ADR-005). El FRC se recalcula en consecuencia.
5. **Tipo 3 (cambio de alcance):** ajuste al presupuesto objetivo + actualización de honorarios de los agentes afectados y, opcionalmente, de los porcentajes de reparto del FRC.

## Consecuencias

- **Positivas:** la lógica más delicada del proyecto se testea con TDD sin base de datos; cada aprobación alimenta la trazabilidad de Decisiones (dolor explícito del cliente); el caso real del hotel queda cubierto; sin estados a medias gracias a la transacción.
- **Negativas:** más casos de test en `applyChange()` (destino dual del tipo 2, reponderación opcional del tipo 3); la evidencia del consenso es el acta referenciada, no clics de cada actor en la app.
- **Pendiente:** spec SDD del módulo de cambios (formularios, validaciones, pantallas); decidir si en julio se añade aprobación multi-rol encima de este flujo.
