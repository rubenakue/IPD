# Feature Specification: Frontend shell (login, proyectos y navegación)

**Feature Branch**: `s11-frontend-shell`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Frontend shell de la plataforma IPD (Hito H5, sesión S11): app web navegable con pantalla de login real, listado de proyectos del usuario con su rol por proyecto, y un marco de navegación (cabecera con contexto de proyecto/fase/rol y menú lateral). La seguridad y el filtrado por rol se aplican en el servidor ya existente; el frontend solo consume la API."

## Clarifications

### Session 2026-06-25

- Q: ¿Qué alcance cubre esta spec 004? → A: Solo S11 (login, listado de proyectos y marco de navegación). S12 (crear proyecto, configurar agentes y su auditoría) queda fuera de alcance y tendrá su propia spec.
- Q: Al seleccionar un proyecto del listado, ¿a dónde entra el usuario en S11? → A: A la sección de dashboard del proyecto como marcador de posición ("Próximamente"), mostrando ya el marco de navegación con la cabecera de contexto; el contenido real del dashboard llega en S17.
- Q: ¿Qué secciones muestra el menú lateral del proyecto en S11? → A: La estructura completa de módulos del dominio (§6.1 del concepto); las secciones aún no implementadas se muestran como marcadores de posición "Próximamente".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iniciar sesión con credenciales corporativas (Priority: P1)

Un agente de un proyecto IPD (promotor, PM, constructor, proyectista u observador) abre la
aplicación en el navegador, introduce su usuario corporativo y su contraseña, y obtiene una
sesión autenticada que le da acceso al área privada de la plataforma. No existe registro
público: las credenciales las provee el administrador.

**Why this priority**: Sin autenticación no hay acceso a ningún dato del producto. Es la
puerta de entrada y el primer eslabón del criterio de éxito del hito ("login → ver proyectos").
Entrega valor por sí sola: demuestra que el frontend conversa con el backend de auth ya existente.

**Independent Test**: Se puede probar de forma aislada introduciendo en el navegador las
credenciales de un usuario del seed y comprobando que la aplicación reconoce la sesión y deja
pasar al área privada; con credenciales incorrectas, lo impide y lo comunica.

**Acceptance Scenarios**:

1. **Given** un usuario del seed con credenciales válidas, **When** las introduce y confirma el acceso, **Then** la aplicación establece su sesión y lo lleva al área privada (listado de proyectos).
2. **Given** credenciales incorrectas, **When** intenta acceder, **Then** la aplicación no concede acceso y muestra un mensaje de error claro en español, sin revelar si el fallo está en el usuario o en la contraseña.
3. **Given** un visitante sin sesión, **When** intenta abrir directamente una dirección del área privada, **Then** la aplicación lo redirige a la pantalla de login.
4. **Given** un usuario con sesión activa, **When** cierra sesión, **Then** la aplicación elimina su acceso y vuelve a la pantalla de login; reintentar abrir una dirección privada exige autenticarse de nuevo.

---

### User Story 2 - Ver mis proyectos con mi rol en cada uno (Priority: P2)

Un usuario autenticado ve la lista de los proyectos a los que pertenece, y en cada uno el rol
con el que participa (promotor, PM, constructor, proyectista u observador). Desde la lista elige
en qué proyecto quiere trabajar.

**Why this priority**: Completa el criterio de éxito del hito y materializa que los roles se
asignan por proyecto. Es el segundo eslabón ("ver tus proyectos") y la antesala de toda la
funcionalidad de negocio posterior.

**Independent Test**: Iniciando sesión con distintos usuarios del seed, cada uno ve únicamente
sus proyectos y el rol correcto en cada uno; un usuario sin proyectos ve un estado vacío
informativo.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con varios proyectos, **When** accede al listado, **Then** ve cada proyecto con su nombre, su rol en él y un indicador de estado, y puede entrar a uno.
2. **Given** dos usuarios distintos con membresías distintas, **When** cada uno accede a su listado, **Then** cada uno ve solo sus proyectos (ninguno ve proyectos ajenos).
3. **Given** un usuario sin proyectos asignados, **When** accede al listado, **Then** ve un estado vacío que explica que no tiene proyectos, sin errores.
4. **Given** un usuario en el listado, **When** selecciona un proyecto, **Then** entra a la sección de dashboard de ese proyecto (marcador de posición en S11) conservando el contexto de qué proyecto y con qué rol.

---

### User Story 3 - Moverse por la aplicación con contexto siempre visible (Priority: P3)

Una vez dentro de un proyecto, el usuario dispone de un marco de navegación estable: una
cabecera que muestra en todo momento en qué proyecto, en qué fase y con qué rol está, y un
menú lateral para moverse entre las secciones de la plataforma.

**Why this priority**: Es el armazón sobre el que se montarán las pantallas de negocio de los
hitos siguientes. Aporta orientación ("dónde estoy y quién soy aquí") pero depende de US1 y US2
para tener sentido, por eso es P3. En esta sesión las secciones de negocio pueden ser marcadores
de posición.

**Independent Test**: Tras entrar en un proyecto, la cabecera refleja el proyecto, la fase y el
rol correctos, y el menú lateral permite cambiar de sección sin perder ese contexto.

**Acceptance Scenarios**:

1. **Given** un usuario dentro de un proyecto, **When** observa la cabecera, **Then** ve el nombre del proyecto, la fase activa y su rol en ese proyecto.
2. **Given** un usuario dentro de un proyecto, **When** usa el menú lateral para cambiar de sección, **Then** la cabecera mantiene el contexto de proyecto/fase/rol.
3. **Given** un usuario dentro de un proyecto, **When** decide volver al listado de proyectos, **Then** puede hacerlo desde el marco de navegación.
4. **Given** un usuario dentro de un proyecto, **When** abre una sección aún no implementada en S11, **Then** ve un marcador de posición "Próximamente" dentro del marco de navegación, sin errores.

---

### Edge Cases

- **Sesión expirada**: si la sesión caduca mientras el usuario navega, la siguiente acción que requiera autenticación lo devuelve al login con un aviso, sin pantallas en blanco ni errores crudos.
- **API no disponible**: si el servidor no responde al intentar autenticarse o cargar proyectos, la aplicación muestra un mensaje de error legible y permite reintentar, en vez de quedarse colgada.
- **Acceso directo a un proyecto ajeno o inexistente**: si el usuario introduce la dirección de un proyecto que no le pertenece o no existe, la aplicación no muestra sus datos y lo comunica (sin filtrar información).
- **Recarga de página con sesión activa**: al recargar, la aplicación reconoce la sesión existente y mantiene al usuario dentro, sin obligarlo a re-autenticarse.
- **Proyecto sin fase activa**: la cabecera maneja con elegancia un proyecto que aún no tiene fase determinada (muestra un estado neutro, no un hueco roto).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La aplicación MUST ofrecer una pantalla de login que solicite usuario corporativo y contraseña, sin opción de registro público.
- **FR-002**: La aplicación MUST autenticar las credenciales contra el servicio de autenticación existente y, en caso de éxito, establecer una sesión que persista entre recargas de página.
- **FR-003**: La aplicación MUST impedir el acceso a cualquier área privada a quien no tenga sesión activa, redirigiéndolo a la pantalla de login.
- **FR-004**: La aplicación MUST permitir cerrar sesión, tras lo cual el acceso a áreas privadas vuelve a exigir autenticación.
- **FR-005**: Ante credenciales inválidas u otros fallos de acceso, la aplicación MUST mostrar un mensaje de error claro en español sin revelar detalles que faciliten adivinar credenciales.
- **FR-006**: La aplicación MUST mostrar al usuario autenticado la lista de proyectos a los que pertenece, obtenida del servidor, indicando para cada uno su rol y su estado.
- **FR-007**: La aplicación MUST mostrar únicamente los proyectos del propio usuario; no debe exponer proyectos de otros usuarios. El filtrado autoritativo lo realiza el servidor.
- **FR-008**: La aplicación MUST permitir seleccionar un proyecto del listado y entrar a la sección de dashboard de ese proyecto (marcador de posición en S11), conservando el contexto de proyecto y rol.
- **FR-009**: La aplicación MUST presentar un estado vacío informativo cuando el usuario no tenga proyectos asignados.
- **FR-010**: Dentro de un proyecto, la aplicación MUST mostrar de forma persistente una cabecera con el proyecto, la fase activa y el rol del usuario en ese proyecto.
- **FR-011**: Dentro de un proyecto, la aplicación MUST ofrecer un menú lateral con la estructura completa de módulos del dominio (§6.1 del concepto), manteniendo el contexto al cambiar de sección.
- **FR-011a**: Las secciones del menú aún no implementadas en S11 MUST mostrarse como marcadores de posición "Próximamente" navegables, sin errores ni enlaces rotos.
- **FR-012**: La aplicación MUST permitir volver al listado de proyectos desde el marco de navegación.
- **FR-013**: La aplicación MUST tratar la expiración de sesión devolviendo al usuario al login con un aviso, sin exponer errores técnicos.
- **FR-014**: La aplicación MUST mostrar mensajes legibles y permitir reintento cuando el servidor no esté disponible.
- **FR-015**: Toda la interfaz y los textos de negocio MUST estar en español, con ortografía y acentuación correctas.
- **FR-016**: La aplicación MUST NOT tomar decisiones de seguridad ni de visibilidad de datos por su cuenta: confía en el filtrado por rol del servidor y nunca muestra datos que el servidor no haya entregado.

### Key Entities *(include if feature involves data)*

- **User (usuario)**: persona con credenciales corporativas que accede a la plataforma. Sin auto-registro.
- **Project (proyecto)**: iniciativa IPD a la que pertenecen uno o varios usuarios; tiene nombre, estado y fase activa.
- **Phase (fase)**: etapa del proyecto que aparece en el contexto de la cabecera.
- **Agent (rol por proyecto)**: vínculo entre un usuario y un proyecto que determina su rol (promotor, PM, constructor, proyectista, observador). Un mismo usuario puede tener roles distintos en proyectos distintos.
- **Session (sesión)**: estado de autenticación vigente del usuario, que la aplicación reconoce mientras esté activa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario del seed puede iniciar sesión y llegar a ver su lista de proyectos en menos de 1 minuto, sin instrucciones adicionales.
- **SC-002**: Con dos usuarios distintos del seed, cada uno ve exclusivamente sus propios proyectos y el rol correcto en cada uno (verificable comparando ambas sesiones).
- **SC-003**: El 100% de los intentos de abrir un área privada sin sesión terminan en la pantalla de login.
- **SC-004**: Tras cerrar sesión o expirar la sesión, ningún dato privado permanece visible y el siguiente acceso exige autenticarse.
- **SC-005**: Dentro de un proyecto, el contexto de proyecto, fase y rol es correcto y permanece visible en todas las secciones navegables.
- **SC-006**: Un usuario sin proyectos ve un estado vacío informativo y ningún error.
- **SC-007**: Ante un servidor no disponible, el usuario recibe un mensaje legible y puede reintentar sin recargar manualmente ni ver pantallas rotas.

## Assumptions

- El servicio de autenticación y los endpoints de sesión, usuario actual y listado de proyectos por usuario ya existen y son la fuente de verdad (entregados en el Hito H4). Esta feature solo los consume.
- El filtrado por rol y la visibilidad de datos sensibles se garantizan en el servidor y en la base de datos; el frontend no replica ni sustituye esa seguridad.
- Los mockups de `docs/diseño/` son referencia visual orientativa, no fuente de verdad de comportamiento ni de datos.
- El menú lateral muestra la estructura completa de módulos del dominio (§6.1); las secciones de negocio aún no implementadas en S11 son marcadores de posición "Próximamente" y su contenido real llega en hitos posteriores.
- Al seleccionar un proyecto, el destino es su sección de dashboard, que en S11 es un marcador de posición; el dashboard real se construye en S17.
- El proyecto y los usuarios de demostración provienen del seed existente ("Hotel Azahar" y los cinco roles).
- Alcance limitado a la sesión S11. **Fuera de alcance** (se abordará en S12 con su propia spec): creación de proyectos, alta y configuración de agentes con porcentajes de reparto y honorarios, y registro de eventos de auditoría asociados a esas acciones.
- Soporte de escritorio como objetivo principal; el comportamiento responsive fino no es objetivo de esta sesión.
