# Feature Specification: FRC servido por rol (flujo G parcial)

**Feature Branch**: `s16-frc-by-role`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "S16 — FRC servido por rol. Exponer el FRC por API y filtrarlo en servidor según el rol; vista FRC en frontend."

## Resumen del problema

El **Fondo de Riesgo Compartido (FRC)** es el corazón diferencial del contrato IPD: reparte el
ahorro o sobrecoste del proyecto entre los agentes como bonus/malus, sobre sus honorarios
garantizados y en riesgo. El cálculo puro `calculateFRC()` ya existe y está en verde (S3), y los
derivados que lo alimentan —presupuesto vigente y previsión a cierre— se calculan desde S15.

Falta **exponer el FRC por API y mostrarlo**, con una regla de visibilidad cerrada por el
briefing (§9.5) que es un principio de producto: **quién pregunta ve cosas distintas del mismo
FRC**.

- **Promotor y PM**: ven el **cuadro completo** (el resultado de todos los agentes).
- **Proyectista y constructor**: ven **solo su propio resultado** (su bonus/malus y total), no el
  de los demás.
- **Observador**: no ve resultados individuales; solo el **estado agregado** del fondo
  (bonus / neutro / malus).

La regla innegociable: **el filtrado ocurre en el servidor** (y en la base de datos), nunca solo
en el frontend. Dos usuarios que llaman al mismo endpoint reciben respuestas distintas según su
rol. Esta feature cubre el **flujo G parcial** (§10.7): el endpoint filtrado y la vista.

## Clarifications

### Session 2026-07-01

- Q: ¿Qué ve exactamente el observador del FRC? → A: Solo la etiqueta de estado del fondo
  (bonus / neutro / malus), sin importes ni resultados individuales.
- Q: El constructor/proyectista, ¿ve la desviación total además de su propia fila? → A: Sí: su
  propia fila (bonus/malus, honorarios, total) MÁS la desviación total del proyecto y el estado
  del fondo (datos agregados); nunca el resultado individual de otros agentes.
- Q: ¿Qué ve un agente con 0% de reparto al consultar su FRC? → A: No ve fila propia (no
  participa en el fondo); ve solo el estado agregado, como un observador. Coherente con la Nota ²
  §15 (el PM solo tiene FRC propio si `sharePercent > 0`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el FRC filtrado por rol desde la API (Priority: P1)

Un agente del proyecto consulta el estado del FRC. El servidor calcula el reparto completo con
`calculateFRC()` (a partir del presupuesto vigente, la previsión a cierre y las condiciones de
cada agente) y devuelve **solo lo que el rol del solicitante puede ver**: el cuadro completo, su
propia fila, o solo el estado agregado. El filtrado se aplica en el servidor.

**Why this priority**: Es el núcleo y el innegociable de la feature. Sin el endpoint filtrado no
hay FRC servido, y la regla de visibilidad por rol es el punto de producto que hay que demostrar.
Si solo se implementa esta historia, tres logins distintos ya obtienen tres respuestas distintas
del mismo endpoint (verificable por API, sin interfaz).

**Independent Test**: Sobre un proyecto con presupuesto aprobado y una desviación conocida,
llamar al endpoint del FRC autenticado como promotor, como constructor y como observador, y
comprobar que las tres respuestas son distintas y coherentes con la regla de §9.5 (cuadro
completo / solo su fila / solo estado agregado), verificado directamente contra la API.

**Acceptance Scenarios**:

1. **Given** un proyecto con desviación conocida y una sesión de **promotor** o **PM**, **When**
   consulta el FRC, **Then** recibe el resultado de **todos** los agentes (bonus/malus y total de
   cada uno) y la desviación total.
2. **Given** una sesión de **constructor** (o proyectista) que participa en el fondo, **When**
   consulta el FRC, **Then** recibe **solo su propio** bonus/malus y total, sin los resultados
   individuales de los demás agentes.
3. **Given** una sesión de **observador**, **When** consulta el FRC, **Then** recibe **solo el
   estado agregado** (bonus / neutro / malus), sin ningún resultado individual.
4. **Given** un usuario que **no es agente** del proyecto, **When** consulta el FRC, **Then** la
   petición se deniega en el servidor.
5. **Given** el mismo proyecto y estado, **When** lo consultan tres roles distintos, **Then**
   las tres respuestas difieren en el contenido, y el filtrado es demostrable llamando a la API
   directamente (no depende del frontend).

---

### User Story 2 - Ver el FRC en el frontend según mi rol (Priority: P2)

Un agente entra en la vista de FRC del proyecto y ve, según su rol, el cuadro completo de
reparto, solo su propio resultado, o solo el estado agregado del fondo. La vista consume el
endpoint filtrado (no recibe datos que no le corresponden).

**Why this priority**: Hace usable y demostrable el FRC, pero depende del endpoint filtrado
(US1), que es donde vive la garantía de seguridad.

**Independent Test**: Iniciar sesión con distintos roles del mismo proyecto y comprobar que la
vista de FRC muestra el contenido correcto por rol (cuadro / propio / agregado) y el estado
(bonus/neutro/malus).

**Acceptance Scenarios**:

1. **Given** una sesión de promotor/PM, **When** abre la vista de FRC, **Then** ve la tabla con
   el resultado de todos los agentes y el estado del fondo.
2. **Given** una sesión de constructor/proyectista, **When** abre la vista, **Then** ve su
   propio resultado (bonus/malus, honorarios, total) y el estado del fondo, sin el detalle de los
   demás.
3. **Given** una sesión de observador, **When** abre la vista, **Then** ve solo el estado
   agregado del fondo.

---

### Edge Cases

- **Sin presupuesto aprobado**: el FRC necesita presupuesto vigente y previsión a cierre; sobre
  un presupuesto en borrador o inexistente, el FRC no tiene datos.
- **Desviación cero (equilibrio)**: nadie tiene bonus ni malus; el estado agregado es "neutro".
- **Agente con 0% de reparto**: no recibe bonus ni malus (regla 5 §9.5) y **no ve fila propia**
  (FR-011): recibe solo el estado agregado.
- **PM que no participa en el fondo** (`sharePercent = 0`): ve el cuadro completo (visibilidad
  global), pero "su propio resultado" solo existe si participa (Nota ² §15).
- **Sobrecoste que agota honorarios en riesgo**: el exceso lo absorbe el promotor (regla 4); el
  cálculo ya lo resuelve (S3), aquí solo se muestra.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST exponer el estado del FRC de un proyecto a través de un endpoint de
  consulta, calculado con `calculateFRC()` a partir del presupuesto vigente, la previsión a
  cierre y las condiciones de los agentes (reparto, honorarios garantizados y en riesgo).
- **FR-002**: El sistema MUST **filtrar el contenido de la respuesta en el servidor** según el
  rol del solicitante: **cuadro completo** (todos los agentes) para promotor y PM; **solo el
  propio resultado** para proyectista y constructor; **solo el estado agregado** (bonus/neutro/
  malus) para el observador.
- **FR-003**: El sistema MUST aplicar el filtrado en la capa de servidor (y BD), de modo que un
  rol nunca reciba datos que no le corresponden, aunque llame directamente al endpoint.
- **FR-004**: El sistema MUST denegar el acceso al FRC a quien **no sea agente** del proyecto.
- **FR-005**: El sistema MUST calcular el estado agregado del fondo como **bonus** (ahorro),
  **malus** (sobrecoste) o **neutro** (equilibrio), a partir de la desviación total.
- **FR-006**: El sistema MUST tratar el resultado del FRC como **derivado no persistido**: se
  calcula al consultar a partir de los datos fuente.
- **FR-007**: El sistema MUST calcular todos los importes en **céntimos enteros**; la conversión
  a euros ocurre solo en presentación.
- **FR-008**: El sistema MUST mostrar en el frontend la vista de FRC acorde al rol (cuadro
  completo / propio / agregado), consumiendo el endpoint filtrado.
- **FR-009**: Para el **observador**, el sistema MUST devolver **solo la etiqueta de estado** del
  fondo (bonus / neutro / malus), sin importes ni resultados individuales.
- **FR-010**: Para **proyectista y constructor**, el sistema MUST devolver su **propia fila**
  (bonus/malus, honorarios, total) MÁS la **desviación total** del proyecto y el **estado del
  fondo**; MUST NOT devolver el resultado individual de ningún otro agente.
- **FR-011**: Un **agente con 0% de reparto** (que no participa en el fondo) MUST recibir, al
  consultar su FRC, **solo el estado agregado** (como el observador), sin fila propia. En
  particular, el PM solo tiene resultado propio si `sharePercent > 0` (Nota ² §15).

### Key Entities *(include if feature involves data)*

- **FRC (resultado del fondo)**: derivado, NO persistido. Incluye la **desviación** total del
  proyecto y, por agente, su **bonus/malus** y su **total proyectado** (honorarios garantizados +
  bonus/malus). Lo produce `calculateFRC()`.
- **Estado del fondo**: derivado de la desviación — bonus / neutro / malus.
- **Agent (condiciones)**: ya existente (S12); aporta el rol, el % de reparto y los honorarios
  garantizados/en riesgo que entran en el cálculo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tres logins distintos (promotor, constructor, observador) que llaman al **mismo
  endpoint** del FRC reciben **tres respuestas distintas**, coherentes con §9.5, verificable
  directamente contra la API (no solo en la interfaz).
- **SC-002**: El promotor/PM ve el resultado de todos los agentes; su suma de bonus/malus cuadra
  con la desviación total (al céntimo), en un caso de prueba conocido.
- **SC-003**: El constructor/proyectista nunca recibe, en la respuesta del servidor, el resultado
  individual de otro agente (verificable inspeccionando la respuesta cruda).
- **SC-004**: El observador nunca recibe resultados individuales; solo el estado agregado.
- **SC-005**: El 100% de los intentos de consultar el FRC por parte de quien no es agente del
  proyecto son denegados en el servidor.

## Assumptions

- **El cálculo ya existe**: `calculateFRC()` (S3, en verde) resuelve el reparto y los límites
  (§9.5); esta feature lo **alimenta** con los datos del proyecto y **filtra** su salida por rol.
  No se reimplementa la lógica de reparto.
- **Los derivados vienen de S15**: el presupuesto vigente y la previsión a cierre (a nivel
  proyecto) alimentan la desviación del FRC.
- **Permisos ya en la matriz**: `frc.global.view` (promotor/PM) y `frc.own.view` (promotor,
  proyectista, constructor, PM) existen; el observador no tiene ninguno (solo agregado). El PM
  solo tiene "resultado propio" si participa con `sharePercent > 0` (Nota ² §15).
- **Nada se persiste**: el resultado del FRC se calcula al consultar.
- **Alcance parcial del flujo G**: esta feature cubre el endpoint filtrado y la vista; los
  informes y otros aspectos del flujo G completo quedan fuera.

## Dependencies

- `calculateFRC()` puro (S3), presupuesto aprobado con derivados (S13–S15), agentes con sus
  condiciones (S12), y el sistema de permisos por proyecto (servidor + RLS).
