# Feature Specification: Costes reales, contra-asientos y avance físico (flujo C)

**Feature Branch**: `s14-real-costs`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "S14 — Costes reales, contra-asientos y avance físico (flujo C). Imputar costes reales a partidas (RealCost inmutable), anular con contra-asiento (reversal + motivo) y registrar el avance físico por partida."

## Resumen del problema

Con el presupuesto objetivo ya cargado y aprobado (S13), el proyecto tiene una línea base
pero todavía no registra **lo que realmente se gasta** ni **cuánto se ha avanzado**. Esta
feature cubre el **flujo C** del briefing (§10.3): el constructor (o el PM) **imputa costes
reales** contra las partidas, **anula** las imputaciones erróneas mediante un **contra-asiento**
(sin borrar ni editar el original), y **registra el avance físico** de cada partida.

Tres reglas de dominio son innegociables aquí:
1. **Un coste imputado es inmutable** (§8.8): nunca se edita ni se borra. Una corrección es
   un **contra-asiento** (un apunte de signo contrario, vinculado al original, con motivo
   obligatorio). El coste real acumulado es la **suma de todos los asientos** (los
   contra-asientos restan). "Anulado" no es un estado que se guarde: es una condición
   **derivada** (tener un contra-asiento vinculado).
2. **El avance físico se registra, no se deduce** (§8.7): es un dato que una persona
   introduce, nunca algo que la app infiera del gasto. Gastar no es avanzar.
3. **Nada derivado se persiste**: el coste acumulado, la condición "anulado" y el EV se
   calculan al vuelo; solo se guardan los asientos y el último % de avance.

Es transparencia de Libros Abiertos: tanto el gasto como su corrección quedan visibles en el
historial de la partida. Esta feature alimenta los derivados económicos y el EVM (CV/CPI) que
se mostrarán en sprints posteriores (S15+), pero aquí **no** se calculan desviaciones,
previsión ni FRC: solo se registran los datos fuente.

## Clarifications

### Session 2026-06-29

- Q: ¿Imputar costes reales y registrar avance exige que el presupuesto esté aprobado? → A:
  Sí. Tanto la imputación de costes como el registro de avance requieren un presupuesto en
  estado APPROVED; sobre un presupuesto en borrador o inexistente, se rechazan.
- Q: ¿Qué datos captura un coste real en el MVP? → A: Solo importe, fecha y descripción. El
  "origen" (factura/albarán/…) y el documento adjunto quedan fuera de alcance (ampliación
  futura).
- Q: ¿Qué reglas de integridad tiene la anulación? → A: Una sola vez y no anidada: un coste
  que ya tiene un contra-asiento vinculado no se puede volver a anular, y un contra-asiento no
  es anulable directamente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Imputar un coste real a una partida y ver el acumulado (Priority: P1)

El constructor (o el PM) abre el detalle de una partida del presupuesto, pulsa "Imputar
coste" e introduce el importe (en euros), la fecha y una descripción. El sistema registra el
coste como un apunte **inmutable** vinculado a esa partida, con autor y momento. La lista de
apuntes de la partida y el **coste real acumulado** se actualizan. La acción queda en la
auditoría (`realCost.created`).

**Why this priority**: Es el núcleo del flujo C y el MVP indivisible: sin imputación de
costes reales no hay nada que comparar con la línea base, ni materia para desviaciones, FRC o
EVM. Si solo se implementa esta historia, el proyecto ya pasa de "solo presupuesto" a
"presupuesto + gasto real registrado".

**Independent Test**: Iniciar sesión como constructor de un proyecto con presupuesto
aprobado, imputar dos costes a una partida y comprobar que ambos aparecen en su historial,
que el acumulado de la partida es la suma de ambos, y que queda un evento de auditoría por
cada uno.

**Acceptance Scenarios**:

1. **Given** una partida de un proyecto y una sesión de constructor, **When** imputa un coste
   con importe, fecha y descripción, **Then** el apunte queda registrado contra esa partida
   con su autor y fecha, y el coste real acumulado de la partida lo incluye.
2. **Given** una partida con un coste ya imputado, **When** se imputa un segundo coste,
   **Then** el acumulado de la partida es la suma de ambos apuntes.
3. **Given** un importe introducido en euros, **When** se guarda, **Then** se almacena en
   céntimos enteros sin pérdida de precisión y se vuelve a mostrar correctamente.
4. **Given** un agente sin permiso para imputar (p. ej. observador o proyectista), **When**
   intenta imputar un coste, **Then** la operación se deniega en el servidor.
5. **Given** un coste imputado, **When** alguien intenta editarlo o borrarlo, **Then** la
   operación se rechaza: un coste real es inmutable.

---

### User Story 2 - Registrar el avance físico de una partida (Priority: P2)

El constructor (o el PM) abre el detalle de una partida, pulsa "Actualizar avance" e
introduce un porcentaje de 0 a 100. El sistema guarda ese porcentaje como el avance físico
**actual** de la partida, junto con quién lo registró y cuándo. Volver a registrar lo
sustituye (se guarda el último valor). La acción queda en la auditoría (`progress.updated`).

**Why this priority**: El avance físico es la pieza que conectará el control económico con el
EVM (EV = Σ presupuesto vigente × % avance). Aporta valor independiente —saber cuánto se ha
ejecutado de cada partida— y no depende de que haya costes imputados (gastar no es avanzar).

**Independent Test**: Como constructor, registrar un 40% de avance en una partida, comprobar
que se guarda con autor y fecha, volver a registrar un 60% y comprobar que sustituye al
anterior y que queda traza de auditoría.

**Acceptance Scenarios**:

1. **Given** una partida sin avance registrado, **When** el constructor registra un 40%,
   **Then** la partida muestra 40% como avance actual, con autor y fecha de actualización.
2. **Given** una partida con 40% de avance, **When** se registra un 60%, **Then** el avance
   actual pasa a 60% (sustituye, no acumula) y se actualizan autor y fecha.
3. **Given** un porcentaje fuera de rango (negativo o mayor que 100), **When** se intenta
   registrar, **Then** la operación se rechaza con un mensaje claro.
4. **Given** un agente sin permiso (observador, proyectista), **When** intenta registrar
   avance, **Then** la operación se deniega en el servidor.
5. **Given** una partida con costes imputados, **When** se consulta su avance, **Then** el
   avance es el último valor registrado por una persona, nunca un valor inferido del gasto.

---

### User Story 3 - Anular un coste erróneo con un contra-asiento (Priority: P3)

El PM abre el detalle de una partida, localiza una imputación errónea y pulsa "Anular",
indicando un **motivo obligatorio**. El sistema crea un **contra-asiento**: un apunte de
signo contrario, vinculado al original, con ese motivo. El apunte original **no se modifica**.
Ambos quedan visibles en el historial; el original aparece como "anulado" (condición derivada
de tener contra-asiento vinculado) y el acumulado de la partida refleja la resta. La acción
queda en la auditoría (`realCost.voided`).

**Why this priority**: Es la corrección contable del flujo. Depende de que existan costes
imputados (US1) y es menos frecuente que la imputación, pero es innegociable del modelo de
Libros Abiertos: las correcciones se ven, no se ocultan.

**Independent Test**: Imputar un coste a una partida, anularlo como PM con un motivo,
comprobar que el original sigue intacto, que aparece un contra-asiento de signo contrario
vinculado, que el acumulado vuelve a su valor previo y que el original consta como "anulado".

**Acceptance Scenarios**:

1. **Given** un coste imputado y una sesión de PM, **When** lo anula indicando un motivo,
   **Then** se crea un contra-asiento de igual importe y signo contrario, vinculado al
   original y con el motivo, sin modificar el original.
2. **Given** un coste anulado, **When** se consulta el historial de la partida, **Then**
   aparecen ambos apuntes (original y contra-asiento) y el acumulado refleja la resta (vuelve
   al valor previo a esa imputación).
3. **Given** una anulación sin motivo, **When** se intenta, **Then** se rechaza: el motivo es
   obligatorio.
4. **Given** un agente que no es PM (incluido el constructor que imputó), **When** intenta
   anular, **Then** la operación se deniega en el servidor.

---

### Edge Cases

- **Importe cero o negativo en una imputación normal**: una imputación normal debe tener
  importe > 0; los importes negativos solo existen como contra-asientos generados por el
  sistema, no se teclean directamente.
- **Anular dos veces el mismo coste**: un coste que ya tiene contra-asiento vinculado no
  puede anularse otra vez (FR-016): se rechaza.
- **Anular un contra-asiento**: un contra-asiento no es anulable directamente (FR-016): se
  rechaza.
- **Imputar/avanzar sobre una partida de un presupuesto no aprobado**: se rechaza; ambas
  operaciones exigen presupuesto APPROVED (FR-017).
- **Avance exactamente 0% o 100%**: ambos son valores válidos (0 = sin empezar registrado
  explícitamente; 100 = terminado).
- **Coste sobre partida inexistente o de otro proyecto**: se rechaza (la partida debe
  pertenecer al proyecto del agente).
- **Fecha del coste en el futuro o muy antigua**: la fecha la introduce el usuario; se asume
  validación básica (fecha válida), sin reglas de negocio sobre el rango en el MVP.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir a un agente con permiso de imputación (constructor o
  PM) registrar un **coste real** contra una partida, con importe, fecha y descripción.
- **FR-002**: El sistema MUST guardar cada coste real con el **agente que lo registra** y el
  momento de registro.
- **FR-003**: El sistema MUST tratar cada coste real como **inmutable**: la **edición** se
  rechaza en la base de datos (trigger), y el **borrado** de un asiento individual no se expone
  por la API (queda cubierto además por RLS). El borrado en cascada al eliminar el proyecto
  entero es una operación de ciclo de vida, no una corrección, y sí está permitido.
- **FR-004**: El sistema MUST almacenar y calcular los importes en **céntimos enteros**; la
  conversión a/desde euros ocurre solo en presentación o formularios.
- **FR-005**: El sistema MUST calcular el **coste real acumulado** de una partida como la
  **suma de todos sus asientos** (los contra-asientos, de signo contrario, restan), como
  valor derivado no almacenado.
- **FR-006**: El sistema MUST permitir al **PM** anular un coste real creando un
  **contra-asiento**: un apunte de signo contrario, vinculado al original, con un **motivo
  obligatorio**.
- **FR-007**: El sistema MUST conservar el apunte original sin cambios al anularlo; la
  condición **"anulado"** MUST derivarse de la existencia de un contra-asiento vinculado, no
  almacenarse como estado editable.
- **FR-008**: El sistema MUST mostrar en el **historial de la partida** todos los asientos
  (normales y contra-asientos), de modo que la corrección sea visible (Libros Abiertos).
- **FR-009**: El sistema MUST permitir a un agente con permiso (constructor o PM) registrar el
  **avance físico** de una partida como un porcentaje entero de **0 a 100**, guardando autor
  y fecha de la última actualización.
- **FR-010**: El sistema MUST tratar el avance como un **dato registrado, nunca inferido** del
  gasto; volver a registrar **sustituye** el valor anterior (el MVP guarda el último valor, no
  el histórico).
- **FR-011**: El sistema MUST rechazar un avance fuera del rango 0–100.
- **FR-012**: El sistema MUST registrar en la auditoría las acciones relevantes:
  `realCost.created`, `realCost.voided` y `progress.updated`, cada una con autor, momento y
  entidad afectada.
- **FR-013**: El sistema MUST aplicar el control de permisos **en el servidor**: imputar coste
  y registrar avance = constructor o PM; anular = solo PM; el resto de roles no pueden, ni
  siquiera llamando directamente al endpoint.
- **FR-014**: El sistema MUST rechazar la imputación, anulación o avance sobre una partida que
  **no pertenezca** al proyecto del agente.
- **FR-015**: El sistema MUST exigir que una imputación normal tenga **importe mayor que 0**;
  los importes negativos solo se generan como contra-asientos del sistema, no se introducen
  manualmente.
- **FR-016**: El sistema MUST impedir anular un coste que **ya tiene un contra-asiento
  vinculado** (una sola anulación por coste) y MUST impedir anular directamente un
  **contra-asiento** (sin anulaciones anidadas).
- **FR-017**: El sistema MUST exigir que el **presupuesto esté aprobado** (APPROVED) para
  imputar costes y para registrar avance; sobre un presupuesto en borrador o inexistente, MUST
  rechazar ambas operaciones.
- **FR-018**: El coste real captura únicamente **importe, fecha y descripción** (además de
  autor y momento de registro). El **origen** (factura/albarán/certificación/…) y el
  **documento adjunto** quedan **fuera del alcance** de este sprint.

### Key Entities *(include if feature involves data)*

- **RealCost (coste real / asiento)**: un apunte de coste imputado a una partida. Guarda
  importe (en céntimos, con signo), fecha, descripción, autor y momento de registro. Es de
  tipo **normal** o **contra-asiento (reversal)**; un contra-asiento referencia al apunte
  original que anula y lleva un motivo obligatorio. Es **inmutable**: no se edita ni se borra.
- **BudgetLine (partida)**: además de su base (S13), guarda el **avance físico actual** (un
  porcentaje 0–100) con su autor y fecha de última actualización. El coste real acumulado de
  la partida es derivado (suma de sus `RealCost`).
- **AuditEvent**: registro append-only de `realCost.created`, `realCost.voided` y
  `progress.updated`, con autor, momento y entidad afectada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un constructor puede imputar un coste a una partida y verlo reflejado en el
  acumulado de la partida en menos de 1 minuto, sin pasos manuales de recálculo.
- **SC-002**: El coste real acumulado de una partida coincide **exactamente** (al céntimo) con
  la suma de todos sus asientos, incluyendo el efecto restador de los contra-asientos, en un
  caso de prueba conocido.
- **SC-003**: El 100% de los intentos de editar o borrar un coste real son rechazados; el
  apunte original permanece intacto tras una anulación.
- **SC-004**: El 100% de los intentos de imputar/avanzar por parte de un rol sin permiso, o de
  anular por parte de quien no es PM, son denegados en el servidor (verificable sin pasar por
  la interfaz).
- **SC-005**: Tras anular un coste, el historial de la partida muestra los dos asientos
  (original + contra-asiento) y el acumulado vuelve a su valor previo a esa imputación.
- **SC-006**: El avance físico mostrado de una partida es siempre el último valor registrado
  por una persona; en ningún caso el sistema lo modifica como consecuencia de imputar costes.

## Assumptions

- **El modelo de datos base ya existe**: las entidades de coste real y el campo de avance de
  la partida se definieron en el esquema del proyecto (sprint de esquema, ADR-002), incluyendo
  el tipo normal/contra-asiento, el vínculo al original y el motivo. Esta feature añade la
  capacidad de imputar, anular, avanzar y consultar; no rediseña el modelo de dominio.
- **No se calculan derivados económicos aquí**: desviaciones, previsión a cierre, FRC y los
  indicadores EVM (CV, CPI, EAC…) son de sprints posteriores (S15+). Esta feature solo
  registra los datos fuente (asientos y avance).
- **Avance = último valor**: el MVP guarda solo el porcentaje actual de cada partida (con
  autor y fecha); el histórico completo de cambios de avance queda como ampliación futura.
- **Importes en euros en la interfaz, céntimos por dentro**: la entrada y presentación son en
  euros; el almacenamiento y los cálculos, en céntimos enteros con signo.
- **La fecha del coste la introduce el usuario** (por defecto, la de hoy), con validación
  básica de fecha; no hay reglas de negocio sobre su rango en el MVP.
- **Se exige presupuesto aprobado**: imputar costes y registrar avance solo es posible sobre
  un presupuesto en estado APPROVED (clarificación 2026-06-29). El origen del coste y los
  documentos adjuntos quedan fuera de alcance de este sprint.

## Dependencies

- Presupuesto y partidas ya existentes (feature de presupuesto objetivo, S13): los costes y el
  avance se registran contra partidas existentes.
- Proyecto, agentes y permisos por proyecto (servidor + RLS), ya disponibles; los permisos
  `realCost.create`, `realCost.reverse` y `progress.update` ya existen en la matriz (S10).
- Sistema de auditoría append-only, ya disponible.
