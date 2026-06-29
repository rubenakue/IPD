# Feature Specification: Presupuesto objetivo (flujo B)

**Feature Branch**: `s13-target-budget`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "S13 — Presupuesto objetivo (flujo B). Cargar el presupuesto objetivo (capítulos y partidas) como línea base inmutable."

## Resumen del problema

Hoy un proyecto IPD recién creado no tiene línea base económica: el dashboard aparece
"sin presupuesto cargado" y no hay nada contra lo que medir costes, desviaciones ni
reparto del FRC. El **Project Manager** necesita cargar el **presupuesto objetivo** del
proyecto —su estructura de capítulos y partidas con sus importes— y dejarlo **aprobado
como línea base inmutable**. A partir de ese momento, esa base no se sobrescribe nunca:
cualquier modificación posterior llegará por la vía de los cambios aprobados (otra
feature), que generan ajustes separados sin tocar la base. Todos los agentes del
proyecto deben poder consultar el presupuesto agrupado por capítulos, porque la
transparencia económica es un principio de producto (libros abiertos).

Esta feature cubre el **flujo B** del briefing (§10.2) y es el cimiento de todo el núcleo
económico (H6): sin presupuesto base no hay presupuesto vigente, ni desviación, ni
previsión, ni FRC.

## Clarifications

### Session 2026-06-29

- Q: ¿Qué métodos de carga del presupuesto entran en el alcance de S13? → A: Solo carga
  manual mediante formularios. La importación Excel (US3) se pospone a su propio sprint/issue.
- Q: ¿Cómo se representa el "capítulo" que agrupa las partidas? → A: Como campos en la
  propia partida (código y nombre de capítulo); la agrupación y los subtotales se hacen por
  ellos. Sin tabla de capítulos ni relación nueva (cambio additivo al modelo).
- Q: ¿Qué condiciones debe cumplir un presupuesto en borrador para poder aprobarse? → A:
  Reglas estándar: al menos una partida, todos los importes ≥ 0, total > 0, y códigos de
  partida no vacíos y únicos dentro del presupuesto.
- Q: Mientras el presupuesto está en borrador, ¿cómo se gestionan las partidas? → A: Por
  partida individual (alta/edición/borrado); el borrador se crea al añadir la primera partida.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cargar y aprobar el presupuesto objetivo manualmente (Priority: P1)

El Project Manager de un proyecto entra en el control económico, que está vacío. Crea el
presupuesto introduciendo sus partidas una a una: a qué capítulo pertenece cada una, su
código, su nombre y su importe base (en euros, que el sistema guarda internamente en
céntimos). Mientras lo está montando, el presupuesto está en estado **borrador**: puede
seguir añadiendo, corrigiendo o quitando partidas y ver el total acumulado. Cuando está
conforme, lo **aprueba**. A partir de ese instante el presupuesto queda como **línea base
inmutable**: cualquier intento de modificar sus partidas o sus importes se rechaza.

**Why this priority**: Es el MVP indivisible de la feature. Sin la capacidad de crear y
aprobar el presupuesto base, ninguna otra parte del núcleo económico (costes reales,
desviaciones, FRC) tiene sobre qué operar. Si solo se implementa esta historia, el
proyecto ya pasa de "sin presupuesto" a "con línea base aprobada".

**Independent Test**: Iniciar sesión como PM de un proyecto sin presupuesto, añadir varias
partidas en borrador, comprobar que el total cuadra, aprobar el presupuesto y verificar
que un intento posterior de editar una partida aprobada se rechaza. Entrega valor por sí
sola: el proyecto queda con su línea base económica registrada y protegida.

**Acceptance Scenarios**:

1. **Given** un proyecto sin presupuesto y una sesión de PM, **When** el PM añade una
   partida (capítulo, código, nombre, importe base), **Then** la partida queda registrada
   en un presupuesto en estado borrador y el total del presupuesto la incluye.
2. **Given** un presupuesto en borrador con varias partidas, **When** el PM corrige el
   importe de una partida o elimina una partida, **Then** el cambio se aplica y el total se
   recalcula.
3. **Given** un presupuesto en borrador con al menos una partida válida, **When** el PM lo
   aprueba, **Then** el presupuesto pasa a estado aprobado, queda registrada la fecha de
   aprobación y la acción queda trazada (auditoría).
4. **Given** un presupuesto ya aprobado, **When** alguien intenta añadir, editar o eliminar
   una partida o re-aprobarlo, **Then** la operación se rechaza con un error claro y la base
   permanece intacta.
5. **Given** un importe introducido en euros con decimales (p. ej. 500.000,50 €), **When**
   se guarda la partida, **Then** el importe se almacena en céntimos enteros sin pérdida de
   precisión y se vuelve a mostrar correctamente.

---

### User Story 2 - Consultar el presupuesto agrupado por capítulos (Priority: P2)

Cualquier agente del proyecto (promotor, proyectista, constructor, observador, PM) entra
en el control económico y ve el presupuesto del proyecto: las partidas agrupadas por
capítulo, con el subtotal de cada capítulo y el total general. Si el presupuesto aún no
existe o está en borrador, lo ve reflejado en su estado.

**Why this priority**: La consulta agrupada es la vista base sobre la que se construyen
S14 (costes reales) y S15 (desviaciones). Aporta valor independiente —transparencia de la
línea base para todos los agentes— pero depende de que exista algo cargado (US1).

**Independent Test**: Con un presupuesto aprobado que tiene partidas en varios capítulos,
iniciar sesión con distintos roles del proyecto y comprobar que todos ven la misma
estructura agrupada por capítulos con subtotales y total correctos.

**Acceptance Scenarios**:

1. **Given** un presupuesto con partidas en varios capítulos, **When** un agente del
   proyecto consulta el presupuesto, **Then** ve las partidas agrupadas por capítulo, con el
   subtotal de cada capítulo y el total general, y los importes presentados en euros.
2. **Given** un proyecto sin presupuesto cargado, **When** un agente consulta el control
   económico, **Then** ve un estado vacío explícito ("sin presupuesto cargado") en lugar de
   un error.
3. **Given** un usuario que no es agente de ese proyecto, **When** intenta consultar su
   presupuesto, **Then** la consulta se deniega en el servidor.

---

### User Story 3 - Importar el presupuesto desde un fichero Excel (Priority: P3 — FUERA DE ALCANCE DE S13)

> **Diferida (clarificación 2026-06-29)**: este sprint cubre solo la carga manual (US1). La
> importación Excel se documenta aquí para no perder el requisito de dominio, pero se
> implementará en un sprint/issue propio. El resto de la spec NO depende de ella.


En lugar de teclear las partidas una a una, el PM sube un fichero (formato de hoja de
cálculo controlado) con los capítulos, códigos, nombres e importes. El sistema valida el
contenido (estructura, códigos, importes), muestra una previsualización del resultado, y
solo tras la confirmación del PM crea el presupuesto en borrador con esas partidas. A
partir de ahí el flujo continúa como en US1 (revisar y aprobar).

**Why this priority**: Es una comodidad de carga que acelera proyectos reales (los
presupuestos vienen de Excel hoy), pero no es imprescindible para demostrar el flujo ni
para que el resto del núcleo económico funcione. La carga manual (US1) ya cubre el MVP.
Su inclusión en este sprint depende de la decisión de alcance (ver clarificaciones).

**Independent Test**: Subir un fichero de ejemplo con formato correcto y comprobar que la
previsualización refleja fielmente sus filas; subir un fichero con errores (importe no
numérico, código duplicado, capítulo vacío) y comprobar que se rechaza con mensajes
claros y sin crear nada.

**Acceptance Scenarios**:

1. **Given** un fichero con formato válido, **When** el PM lo sube, **Then** el sistema
   muestra una previsualización de las partidas detectadas (capítulo, código, nombre,
   importe) sin haber creado todavía nada.
2. **Given** una previsualización correcta, **When** el PM confirma, **Then** se crea el
   presupuesto en borrador con esas partidas y queda listo para revisar y aprobar.
3. **Given** un fichero con filas inválidas, **When** el PM lo sube, **Then** el sistema
   identifica las filas con problemas y no crea ningún presupuesto parcial.

---

### Edge Cases

- **Presupuesto vacío**: no se puede aprobar un presupuesto sin partidas ni con total 0
  (FR-007: ≥1 partida y total > 0).
- **Importe cero o negativo**: una partida con importe 0 € se admite (los importes deben ser
  ≥ 0), pero el total del presupuesto debe ser > 0 para aprobar; un importe negativo se
  rechaza en la validación (FR-016).
- **Códigos duplicados**: dos partidas con el mismo código en el mismo presupuesto se
  permiten en borrador, pero impiden la aprobación (FR-007: códigos únicos para aprobar).
- **Concurrencia**: dos sesiones de PM editando el mismo presupuesto en borrador a la vez.
- **Doble aprobación**: dos intentos de aprobar el mismo presupuesto casi simultáneos.
- **Proyecto sin agente PM**: un proyecto recién creado siempre tiene un PM (su creador),
  pero conviene confirmar que solo el PM puede cargar/aprobar.
- **Importe muy grande**: presupuestos de muchos millones de euros (precisión en céntimos).
- **Reapertura**: ¿un presupuesto aprobado puede volver a borrador? (asunción: no en esta
  feature; las modificaciones van por cambios aprobados).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir que el **Project Manager** de un proyecto cree el
  presupuesto objetivo del proyecto si aún no existe (un único presupuesto por proyecto).
- **FR-002**: El sistema MUST permitir añadir partidas al presupuesto mientras está en
  estado **borrador**, cada una con: capítulo de pertenencia, código, nombre e importe base.
- **FR-003**: El sistema MUST permitir, mientras el presupuesto está en borrador, **editar**
  el importe/datos de una partida y **eliminar** una partida.
- **FR-004**: El sistema MUST almacenar y calcular todos los importes en **céntimos
  enteros**; la conversión a/desde euros ocurre solo en presentación, formularios o
  importación.
- **FR-005**: El sistema MUST calcular y mostrar el **total** del presupuesto y el
  **subtotal por capítulo** como valores derivados (no almacenados).
- **FR-006**: El sistema MUST permitir que el PM **apruebe** el presupuesto, lo que lo pasa
  de borrador a **aprobado** y registra la fecha de aprobación.
- **FR-007**: El sistema MUST impedir aprobar un presupuesto que no cumpla **todas** estas
  condiciones de validez: al menos una partida; todos los importes base ≥ 0; total del
  presupuesto > 0; y todos los códigos de partida no vacíos y únicos dentro del presupuesto.
- **FR-008**: Una vez **aprobado**, el sistema MUST tratar el presupuesto como **línea base
  inmutable**: MUST rechazar cualquier intento de añadir, editar o eliminar partidas, o de
  re-aprobarlo.
- **FR-009**: El sistema MUST permitir a **cualquier agente del proyecto** consultar el
  presupuesto, con las partidas **agrupadas por capítulo** y los subtotales y total.
- **FR-010**: El sistema MUST denegar el acceso al presupuesto a quien **no sea agente** de
  ese proyecto, aplicando el filtro en el servidor (no solo en el frontend).
- **FR-011**: El sistema MUST restringir la creación, edición, eliminación de partidas y la
  aprobación **exclusivamente al PM** del proyecto, verificado en el servidor.
- **FR-012**: El sistema MUST registrar en la auditoría las acciones relevantes sobre el
  presupuesto (al menos su aprobación; nombre de evento candidato: `budget.approved`, y si
  procede `budget.imported`).
- **FR-013**: El sistema MUST representar el **capítulo** como datos de la propia partida
  (código de capítulo y nombre de capítulo), de modo que las partidas puedan agruparse y
  subtotalizarse por capítulo sin necesidad de una entidad/tabla de capítulos separada.
- **FR-014**: El sistema MUST soportar la **carga manual** del presupuesto mediante
  formularios. La importación desde Excel (US3) queda **fuera del alcance** de este sprint.
- **FR-017**: El sistema MUST crear el presupuesto en estado **borrador** de forma implícita
  al añadir la primera partida (no requiere un paso previo explícito de "crear presupuesto
  vacío"), y MUST gestionar las partidas en borrador de forma **individual** (alta, edición y
  borrado por partida).
- **FR-015**: El sistema MUST mostrar un **estado vacío explícito** cuando el proyecto no
  tiene presupuesto cargado, en lugar de un error.
- **FR-016**: El sistema MUST validar los datos de cada partida en el servidor (importe
  numérico ≥ 0, código y nombre no vacíos) y rechazar entradas inválidas con un mensaje
  claro.

### Key Entities *(include if feature involves data)*

- **Budget (presupuesto)**: la cabecera del presupuesto objetivo de un proyecto. Tiene un
  estado (borrador / aprobado) y, cuando se aprueba, una fecha de aprobación. Hay como mucho
  uno por proyecto. Es la línea base inmutable una vez aprobado.
- **BudgetLine (partida)**: una línea del presupuesto. Guarda su **código y nombre de
  capítulo** (los datos por los que se agrupa), su código y nombre de partida, y su importe
  base (en céntimos). El presupuesto vigente de la partida (base + ajustes) es derivado y NO
  se calcula en esta feature (es de sprints posteriores).
- **Capítulo**: no es una entidad propia; es la agrupación de partidas que comparten el
  mismo código de capítulo. Sirve para presentar y subtotalizar el presupuesto.
- **AuditEvent**: registro append-only de la acción de aprobación (y de importación si
  aplica), con autor, fecha y entidad afectada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un PM puede cargar manualmente un presupuesto de 20 partidas en varios
  capítulos y aprobarlo en una sola sesión, sin errores, en menos de 10 minutos.
- **SC-002**: El total mostrado del presupuesto y los subtotales por capítulo coinciden
  exactamente (al céntimo) con la suma manual de las partidas cargadas, en un caso de prueba
  conocido.
- **SC-003**: El 100% de los intentos de modificar un presupuesto ya aprobado son
  rechazados, y la línea base permanece byte a byte intacta.
- **SC-004**: El 100% de los intentos de cargar/aprobar el presupuesto por parte de un
  agente que no es PM, o de consultarlo por parte de quien no es agente del proyecto, son
  denegados en el servidor (verificable sin pasar por la interfaz).
- **SC-005**: Tras aprobar un presupuesto, queda registrado un evento de auditoría con
  autor y fecha recuperable.

## Assumptions

- **El modelo de datos base ya existe**: las entidades de presupuesto se definieron en el
  esquema del proyecto (sprint de esquema, ADR-002). Esta feature añade la capacidad de
  cargarlo, consultarlo y aprobarlo; el único cambio de modelo es **additivo**: añadir a la
  partida los campos de capítulo (código y nombre), sin tabla ni relación nuevas (FR-013).
- **Un presupuesto por proyecto**: el modelo actual asume una relación uno-a-uno entre
  proyecto y presupuesto.
- **Solo el PM gestiona el presupuesto**: la creación, edición y aprobación son
  competencia del Project Manager del proyecto (matriz de permisos del briefing). El resto
  de agentes solo consultan.
- **La inmutabilidad es definitiva en esta feature**: un presupuesto aprobado no se reabre
  ni se reedita aquí; las modificaciones posteriores llegan por cambios aprobados (feature
  del motor de cambios, fuera de alcance).
- **No se calcula presupuesto vigente, desviación, avance ni previsión**: esta feature solo
  establece la base. Los derivados económicos son de S14/S15.
- **Importes en euros en la interfaz, céntimos por dentro**: la entrada y presentación son
  en euros; el almacenamiento y los cálculos, en céntimos enteros.
- **No se contempla `.bc3`** ni otros formatos de presupuesto sectoriales en este sprint
  (el briefing los deja explícitamente fuera del prototipo inicial).

## Dependencies

- Proyecto y agentes ya creados (feature de setup de proyecto, completada): el presupuesto
  cuelga de un proyecto existente con su PM asignado.
- Sistema de sesiones y permisos por proyecto (servidor + RLS), ya disponible.
- Sistema de auditoría append-only, ya disponible.
