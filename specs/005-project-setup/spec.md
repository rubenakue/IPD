# Feature Specification: Setup de proyecto (crear proyecto y configurar agentes)

**Feature Branch**: `s12-project-setup`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Setup de proyecto (Hito H5, sesión S12): completar el flujo A — crear un proyecto (el creador queda como PM y se crean las 4 fases) y configurar sus agentes (rol, usuario asignado, % de reparto del FRC con suma 100%, honorarios base y en riesgo), con auditoría de project.created y agent.added. La seguridad se aplica en el servidor."

## Clarifications

### Session 2026-06-26

- Q: Al añadir un agente, ¿cómo se selecciona el usuario que ocupa ese rol? → A: Por **email de un usuario existente**; si el email no corresponde a ningún usuario, la operación se **rechaza** (no se crea ningún usuario). El alta/invitación de usuarios nuevos se traslada a una feature propia (sesión futura, con su propio issue).
- Q: ¿Cuándo se valida que los porcentajes de reparto del FRC sumen 100%? → A: Al **confirmar/completar** la configuración de agentes (gate), permitiendo estados intermedios mientras se añaden agentes; se muestra la suma actual.
- Q: ¿Se permite más de un agente con el mismo rol en un proyecto? → A: Sí, **varios agentes por rol** están permitidos. La unicidad es por usuario (un usuario no se duplica como agente del mismo proyecto).
- Q: ¿La eliminación de agentes entra en el alcance de S12? → A: No; queda **fuera de S12 y documentada** como trabajo de una sesión futura (no como cabo suelto).

> **Nota de alcance:** el alta/invitación de usuarios nuevos queda **fuera de esta spec** y se
> aborda en su propia feature/sesión (issue [#37](https://github.com/rubenakue/IPD/issues/37),
> spec `specs/006-user-invitation`). Aquí solo se asignan usuarios ya existentes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear un proyecto IPD (Priority: P1)

Un usuario autenticado da de alta un proyecto nuevo desde la aplicación (nombre, código y datos
generales). Al guardarlo, queda automáticamente registrado como agente con rol **PM (Project
Manager)** de ese proyecto y el sistema crea sus **cuatro fases fijas** (Validación,
Pre-Construcción, Construcción, Cierre), con **Validación** como fase activa inicial. El proyecto
aparece en su listado de proyectos con el rol PM.

**Why this priority**: Es el cimiento del flujo A y de todo el producto: sin proyecto no hay
presupuesto, costes, FRC ni nada posterior. Entrega valor por sí sola (un proyecto operativo
existe y es navegable con el shell de S11) y es el primer eslabón del criterio del hito.

**Independent Test**: Un usuario del seed pulsa "Nuevo proyecto", rellena los datos y guarda; el
proyecto aparece en su listado con rol PM, y al entrar tiene sus cuatro fases con Validación activa.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** crea un proyecto con nombre y código válidos, **Then** el proyecto se crea, el usuario queda como agente PM y se generan sus cuatro fases (Validación activa).
2. **Given** un proyecto recién creado, **When** el creador abre su listado de proyectos, **Then** ve el nuevo proyecto con su rol PM y puede entrar a él.
3. **Given** un intento de crear un proyecto con código ya existente, **When** se guarda, **Then** la creación se rechaza con un mensaje claro y no se crea nada.
4. **Given** un intento de crear un proyecto sin los datos obligatorios (p. ej. nombre vacío), **When** se guarda, **Then** la aplicación lo impide y señala el campo.

---

### User Story 2 - Configurar los agentes del proyecto (Priority: P2)

El PM de un proyecto añade y configura sus agentes: para cada uno indica el **email** de un usuario
**ya existente** en el sistema, su rol (promotor, constructor, proyectista, PM, observador), su
**porcentaje de reparto del Fondo de Riesgo Compartido (FRC)** y sus **honorarios base
(garantizados)** y **honorarios en riesgo**. Se pueden añadir varios agentes con el mismo rol. La
plataforma valida que la **suma de los porcentajes de reparto sea 100%** al **confirmar** la
configuración.

**Why this priority**: Es lo que convierte un proyecto vacío en un proyecto IPD operativo: define
quién participa, con qué rol y con qué condiciones económicas (la base del cálculo del FRC). Es el
segundo eslabón del flujo A. Depende de que exista el proyecto (US1).

**Independent Test**: Sobre un proyecto existente, el PM añade los agentes indicando emails de
usuarios existentes; con porcentajes que suman 100% la configuración se confirma; si no suman 100%,
se rechaza con un aviso que muestra la suma actual.

**Acceptance Scenarios**:

1. **Given** el PM de un proyecto, **When** añade un agente con el email de un usuario existente, rol, porcentaje y honorarios, **Then** el agente queda registrado y visible en la lista de agentes.
2. **Given** el PM añade un agente con un email que NO corresponde a ningún usuario existente, **When** guarda, **Then** la operación se rechaza con un mensaje claro y no se crea ningún usuario.
3. **Given** un conjunto de agentes cuyos porcentajes de reparto suman 100%, **When** el PM confirma la configuración, **Then** se acepta.
4. **Given** un conjunto de agentes cuyos porcentajes de reparto NO suman 100%, **When** el PM intenta confirmar, **Then** se rechaza con un aviso que indica la suma actual.
5. **Given** un usuario que NO es PM del proyecto, **When** intenta añadir o modificar agentes, **Then** el servidor lo rechaza (no basta con ocultar la opción en la interfaz).
6. **Given** un agente con datos inválidos (porcentaje fuera de 0–100, honorarios negativos, email mal formado), **When** se intenta guardar, **Then** se rechaza con un mensaje claro.
7. **Given** un usuario ya asignado como agente en el proyecto, **When** se intenta añadirlo de nuevo, **Then** se impide la duplicación (aunque sí se permite otro agente distinto con el mismo rol).

---

### Edge Cases

- **Suma de porcentajes ≠ 100%**: la configuración no puede confirmarse; el aviso indica la suma actual (p. ej. "Suma actual: 90%").
- **Agentes sin reparto**: roles como PM u observador pueden tener 0% de reparto; siguen contando como agentes y no rompen la validación del 100% (que se calcula sobre el total).
- **Varios agentes del mismo rol**: permitido (p. ej. dos constructores); cada uno con su reparto y honorarios.
- **Email ya existente**: caso normal; se asigna el usuario existente.
- **Email no existente**: se rechaza con un mensaje claro y no se crea ningún usuario.
- **Email mal formado**: se rechaza antes de hacer nada.
- **Doble alta del mismo usuario** en el mismo proyecto: se impide.
- **Código de proyecto duplicado**: se rechaza la creación sin crear nada.
- **Pérdida de sesión a mitad del alta**: la siguiente acción que requiera sesión devuelve al login sin dejar el proyecto a medias de forma incoherente.
- **Acceso de un no-participante** al proyecto recién creado: no lo ve (consistente con el filtrado por rol existente).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir a cualquier usuario autenticado crear un proyecto indicando, como mínimo, nombre y código; el código MUST ser único.
- **FR-002**: Al crear un proyecto, el sistema MUST registrar al creador como agente con rol **PM** de ese proyecto.
- **FR-003**: Al crear un proyecto, el sistema MUST crear automáticamente sus cuatro fases fijas (Validación, Pre-Construcción, Construcción, Cierre) con **Validación** como fase activa.
- **FR-004**: El proyecto creado MUST aparecer en el listado de proyectos del creador con su rol PM (consistente con el listado existente).
- **FR-005**: El sistema MUST permitir al **PM de un proyecto** añadir agentes indicando: el email de un usuario **existente**, un rol (promotor, constructor, proyectista, PM, observador), un porcentaje de reparto del FRC y sus honorarios base y en riesgo. MUST permitir varios agentes con el mismo rol.
- **FR-006**: Cuando el email indicado no corresponda a ningún usuario existente, el sistema MUST rechazar la operación con un mensaje claro y MUST NOT crear ningún usuario.
- **FR-007**: El sistema MUST validar, al **confirmar** la configuración de agentes, que la suma de los porcentajes de reparto sea exactamente 100%, e informar de la suma actual cuando no lo sea. MUST permitir estados intermedios (mientras se añaden agentes) que aún no sumen 100%.
- **FR-008**: El sistema MUST rechazar porcentajes de reparto fuera del rango 0–100, honorarios negativos y emails mal formados, con un mensaje claro.
- **FR-009**: El sistema MUST impedir asignar dos veces al mismo usuario como agente del mismo proyecto.
- **FR-010**: La creación de proyectos y la gestión de agentes MUST aplicarse y autorizarse en el servidor: solo el PM del proyecto puede gestionar sus agentes; un usuario sin ese permiso recibe un rechazo aunque llame directamente al servicio.
- **FR-011**: El sistema MUST registrar eventos de auditoría `project.created` (crear proyecto) y `agent.added` (añadir agente), sin incluir datos sensibles.
- **FR-012**: La interfaz y los textos de negocio MUST estar en español, con ortografía y acentuación correctas; los importes monetarios se MUST presentar como euros.
- **FR-013**: Tras crear el proyecto, el usuario MUST poder navegar a él usando el marco de navegación existente (el dashboard se muestra en su estado "sin presupuesto cargado").

### Key Entities *(include if feature involves data)*

- **Project (proyecto)**: iniciativa IPD. Atributos de negocio: nombre, código único, descripción, fechas, fase activa. Se crea en esta feature.
- **Phase (fase)**: una de las cuatro etapas fijas del proyecto (Validación, Pre-Construcción, Construcción, Cierre). Se crean automáticamente con el proyecto; una es la activa.
- **Agent (agente)**: vínculo entre un usuario y un proyecto que fija su rol y sus condiciones económicas (porcentaje de reparto del FRC, honorarios base y en riesgo). Único por usuario dentro del proyecto; se permiten varios agentes del mismo rol.
- **User (usuario)**: persona con credenciales que puede crear proyectos y ser asignada como agente. En esta feature **no se crean usuarios nuevos**; se usan los existentes.
- **AuditEvent (evento de auditoría)**: registro append-only de acciones relevantes (`project.created`, `agent.added`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario del seed puede crear un proyecto y verlo en su listado con rol PM en menos de 2 minutos, sin instrucciones adicionales.
- **SC-002**: El 100% de los proyectos creados tienen exactamente cuatro fases (Validación, Pre-Construcción, Construcción, Cierre) con Validación activa.
- **SC-003**: La configuración de agentes no puede confirmarse mientras la suma de porcentajes de reparto sea distinta de 100%; al serlo, se acepta.
- **SC-004**: Un usuario que no es PM del proyecto no consigue añadir ni modificar agentes, ni siquiera invocando el servicio directamente (verificable en servidor).
- **SC-005**: Al añadir un agente con un email que no corresponde a ningún usuario existente, la operación se rechaza con un mensaje claro y no se crea ningún usuario.
- **SC-006**: Cada creación de proyecto y alta de agente dejan su evento de auditoría correspondiente (`project.created`, `agent.added`).
- **SC-007**: El flujo A (§10.1) se completa de principio a fin desde el navegador con sus criterios de aceptación (suma validada; un usuario sin rol no ve el proyecto).

## Assumptions

- Un proyecto admite a lo sumo un agente por usuario, pero **varios agentes del mismo rol**; el foco de la validación económica es la suma de reparto = 100% (los roles sin reparto, como PM u observador, pueden ir a 0%).
- La validación de la suma 100% es un **gate al confirmar** la configuración de agentes, no en cada guardado individual.
- **Solo se asignan usuarios existentes**; el alta/invitación de usuarios nuevos queda **fuera de alcance**, en su feature/sesión propia (con su propio issue).
- Las fechas del proyecto son opcionales en esta sesión.
- **Fuera de alcance de S12, documentado para sesiones futuras** (no son cabos sueltos): (a) eliminar agentes de un proyecto; (b) cambiar la fase activa (el proyecto nace en Validación).
- La edición de las condiciones de un agente ya añadido (rol, %, honorarios) está incluida.
- El listado de proyectos, la navegación y el dashboard placeholder ya existen (S11); esta feature los reutiliza y añade las capacidades de servidor que falten (crear proyecto, gestionar agentes).
- El dinero se maneja internamente con precisión de céntimos (regla del proyecto); la presentación es en euros.
- Soporte de escritorio como objetivo principal; el responsive fino no es objetivo de esta sesión.
