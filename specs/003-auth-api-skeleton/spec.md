# Feature Specification: Autenticación y roles por proyecto

**Feature Branch**: `003-auth-api-skeleton`

**Created**: 2026-06-18

**Status**: Draft

**Input**: Especificar el módulo de acceso de la plataforma IPD: cómo los usuarios reales inician sesión de forma segura y cómo el sistema decide, **en servidor**, qué puede ver y hacer cada uno según su rol **en cada proyecto**. Sesión S08, issue #9, hito H4. Fuente de dominio: `docs/concepto-global.md` §9.1 (auth, sesión y roles), §15 (matriz de permisos por rol), §14.2/§14.3 (validación y formato de error) y ADR-004.

> **Nota de alcance**: esta spec cubre **qué comportamiento de acceso debe tener el sistema y por qué** (el QUÉ y el POR QUÉ de auth + permisos). El CÓMO (Express, estructura de carpetas, sesiones en Postgres, políticas RLS) es del plan. La **implementación se reparte en tres sesiones**:
> - **S08 (esta sesión)** entrega solo el *andamiaje* de la API: arranque del servidor, endpoint de salud (`/api/health`), el **contrato de errores** estándar (§14.3) con su middleware, y la **validación de entrada** con Zod. Es la fase *Setup + Foundational* del plan.
> - **S09** implementa el login/logout/sesión real (User Story 1).
> - **S10** implementa los permisos en dos capas —middleware + RLS— (User Stories 2 y 3).
>
> Quedan FUERA de toda la feature: registro abierto/signup, recuperación de contraseña e invitaciones (§19); y la lógica de negocio de cada módulo (presupuesto, costes, FRC…), que solo se *protege* aquí, no se implementa.

## Clarifications

> Dudas resueltas con Rubén antes de planificar (equivalen al paso `/speckit.clarify`). Las de comportamiento se registran aquí; las puramente de implementación (estructura de carpetas, puerto, dependencias) se detallan en `plan.md`.

### Session 2026-06-20

- Q: ¿Cuál es la duración de una sesión de servidor antes de que expire automáticamente? → A: **24 horas rolling** — la sesión se renueva en cada petición autenticada y expira tras 24 h de inactividad.
- Q: ¿Qué protección debe aplicar el sistema ante intentos repetidos de login con credenciales incorrectas? → A: **Rate limiting por IP** — máx. 10 intentos de login en 15 min por IP; si se supera, el servidor responde `429 Too Many Requests` con el error estándar y código `RATE_LIMITED`. **(FUTURO — aún NO implementado; ver FR-022.)**
- Q: ¿Puede un mismo usuario tener varias sesiones activas simultáneamente? → A: **Sí, ilimitadas** — el mismo usuario puede tener sesiones activas en múltiples dispositivos/navegadores sin que se invaliden entre sí.
- Q: ¿Qué responde el servidor cuando un usuario intenta acceder a un proyecto en el que no participa? → A: **Siempre `NOT_FOUND`** — si el usuario no es agente del proyecto, ese proyecto no existe para él; nunca se confirma su existencia.

### Session 2026-06-18

- **Q: ¿Una sola spec de "auth + roles" o dos specs separadas (auth y permisos)?** → A: **Una sola spec** "autenticación y roles por proyecto". El concepto trata ambos juntos (§9.1) y la matriz de permisos (§15) depende de los roles que define auth; separarlos duplicaría contexto. La implementación se reparte en S09 (login/sesiones) y S10 (permisos en dos capas).
- **Q: ¿Las respuestas de éxito también van envueltas, o solo los errores?** → A: **Solo los errores** se envuelven, con el formato §14.3 `{ "error": { "code", "message", "details" } }`. Las respuestas de éxito devuelven el recurso directamente (p. ej. `/api/health` → `{ "status": "ok" }`). Es lo único que estandariza el concepto y lo más común en REST.
- **Q: ¿Qué mecanismo de validación de entrada se usa?** → A: **Zod** (esquemas declarativos), que cierra el pendiente §20.2.1 y se formaliza en un **mini-ADR-009**. Una entrada que no cumple el esquema produce el error estándar `VALIDATION_ERROR`.
- **Q: ¿Cómo se dan de alta los usuarios?** → A: **Solo por seed** (§9.1, §10.0): no hay registro abierto ni pantalla de signup en el MVP. Las cuentas de demo ya las creó S07 (con hash argon2), de modo que el login de S09 funcione sin re-sembrar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iniciar y mantener una sesión segura (Priority: P1)

> Implementación prevista: **S09**.

Una persona con cuenta de acceso entra en la plataforma introduciendo su email y contraseña. Si las credenciales son correctas, el sistema abre una **sesión** y el navegador queda autenticado para las siguientes peticiones, sin volver a pedir la contraseña, hasta que la persona cierra sesión. Si son incorrectas, no se le deja entrar y no se le revela si el fallo fue el email o la contraseña.

**Why this priority**: sin sesión no existe la plataforma. Es el primer comportamiento que desbloquea todo lo demás (proyectos, permisos, dashboard). Es el criterio "login" del hito H4.

**Independent Test**: con una cuenta sembrada, enviar credenciales correctas y comprobar que las peticiones siguientes se reconocen como esa persona; enviar credenciales incorrectas y comprobar que se rechazan con un mensaje genérico; cerrar sesión y comprobar que deja de estar autenticada.

**Acceptance Scenarios**:

1. **Given** una cuenta de acceso sembrada, **When** se envían su email y contraseña correctos, **Then** se abre una sesión y las peticiones posteriores se identifican como esa persona.
2. **Given** un email existente, **When** se envía una contraseña incorrecta, **Then** el acceso se rechaza con un error de credenciales **genérico** (no se distingue "email no existe" de "contraseña incorrecta").
3. **Given** una sesión abierta, **When** la persona cierra sesión, **Then** la sesión se invalida y las peticiones posteriores dejan de estar autenticadas.
4. **Given** una sesión abierta, **When** se consulta "quién soy", **Then** el sistema devuelve la identidad de la persona y los proyectos en los que participa.

---

### User Story 2 - Permisos por rol aplicados en servidor (Priority: P1)

> Implementación prevista: **S10**.

Dentro de un proyecto, cada persona tiene un **rol** (Promotor, Proyectista, Constructor, Project Manager u Observador) que determina qué puede ver y hacer. Esas reglas se aplican **en el servidor**: aunque alguien llame directamente a un endpoint saltándose la interfaz, el servidor le niega lo que su rol no permite. El caso central del briefing: un Constructor **no recibe** los costes privados del promotor, aunque invoque el endpoint a mano.

**Why this priority**: es el corazón demostrable del producto y el criterio de evaluación más literal del briefing ("un constructor NO recibe costes privados"). La transparencia IPD ("libros abiertos") solo es creíble si la frontera de lo privado se respeta de verdad.

**Independent Test**: autenticado como Constructor de un proyecto, pedir los costes privados del promotor y comprobar que el servidor los niega con el error de permiso estándar; autenticado como PM del mismo proyecto, comprobar que sí los obtiene; como Observador, comprobar que las acciones de creación/edición/aprobación se rechazan.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado como **Constructor** de un proyecto, **When** solicita los costes privados del promotor, **Then** el servidor responde con un error `FORBIDDEN` y no incluye esos datos en ninguna parte de la respuesta.
2. **Given** un usuario autenticado como **Project Manager** del proyecto, **When** solicita la misma información, **Then** el servidor se la devuelve (el PM tiene acceso completo, nota ¹ de §15).
3. **Given** un usuario autenticado como **Observador**, **When** intenta crear, editar o aprobar cualquier elemento, **Then** el servidor lo rechaza con `FORBIDDEN` y no se produce ningún cambio.
4. **Given** un usuario **no autenticado**, **When** llama a cualquier endpoint protegido, **Then** el servidor responde `UNAUTHENTICATED` sin revelar datos.
5. **Given** la matriz de permisos §15, **When** se revisa cada acción frente a cada rol, **Then** el comportamiento del servidor coincide celda a celda con la matriz.

---

### User Story 3 - El rol pertenece al proyecto, no a la persona (Priority: P1)

> Implementación prevista: **S09 (visibilidad) + S10 (permisos)**.

El rol no es una propiedad global del usuario: vive en la relación **usuario-proyecto** (la entidad `Agent`). La misma persona puede ser Project Manager en un proyecto y Observador en otro. Además, una persona solo ve los proyectos en los que participa; los demás le son invisibles.

**Why this priority**: es la regla estructural `User ≠ Agent` sobre la que se apoya todo el modelo de permisos. Si el rol fuera global, la matriz §15 no tendría sentido por proyecto.

**Independent Test**: con una persona que participa como roles distintos en dos proyectos, comprobar que en cada proyecto se le aplican los permisos de su rol allí; comprobar que un proyecto donde no participa no aparece en su listado y le es inaccesible.

**Acceptance Scenarios**:

1. **Given** una persona que es PM en el proyecto A y Observador en el proyecto B, **When** opera en A, **Then** se le permiten las acciones de PM; **When** opera en B, **Then** solo se le permite leer.
2. **Given** una persona autenticada, **When** lista sus proyectos, **Then** solo aparecen aquellos en los que tiene un `Agent` activo.
3. **Given** un proyecto en el que la persona no participa, **When** intenta acceder a él directamente, **Then** el servidor responde `NOT_FOUND` (nunca `FORBIDDEN`), sin confirmar que el proyecto existe.

---

### User Story 4 - Contrato HTTP base coherente (Priority: P1)

> Implementación prevista: **S08 (esta sesión)** — es el andamiaje de la API.

Toda la plataforma se comunica a través de una API HTTP bajo `/api`. Para que las tres historias anteriores se puedan construir encima, la API debe **arrancar**, ofrecer una señal de **salud** comprobable, devolver **todos** sus errores con un **formato único y predecible** (§14.3) y **validar la entrada** antes de procesarla. Este es el comportamiento que se entrega y verifica en S08.

**Why this priority**: es el cimiento técnico (fase *Foundational*). Sin una API que arranque y con errores consistentes, no se puede implementar ni el login ni los permisos. Tiene prioridad P1 porque bloquea a las demás, aunque su valor sea habilitante y no de cara al usuario final.

**Independent Test**: arrancar el servidor y comprobar que `GET /api/health` responde un estado de salud; provocar una ruta inexistente y una entrada inválida y comprobar que ambas respuestas siguen el formato de error estándar con el código correcto.

**Acceptance Scenarios**:

1. **Given** el servidor arrancado, **When** se hace `GET /api/health`, **Then** responde con un estado de salud (p. ej. `{ "status": "ok" }`), sin envoltorio.
2. **Given** el servidor arrancado, **When** se pide una ruta `/api/...` que no existe, **Then** responde con el error estándar y código `NOT_FOUND`.
3. **Given** un endpoint que espera una entrada con cierta forma, **When** se envía una entrada que no cumple el esquema, **Then** responde con el error estándar y código `VALIDATION_ERROR`, describiendo en `details` qué falló.
4. **Given** cualquier fallo inesperado del servidor, **When** ocurre, **Then** la respuesta sigue el formato estándar con código `INTERNAL_ERROR` y **no** filtra trazas ni detalles internos al cliente.
5. **Given** cualquier respuesta de error de la API, **When** se inspecciona, **Then** tiene exactamente la forma `{ "error": { "code", "message", "details" } }` con un `code` de la lista cerrada (§14.3).

---

### Edge Cases

- **Credenciales inválidas**: el mensaje de error no revela si el email existe (evita enumeración de usuarios). Siempre el mismo error genérico.
- **Fuerza bruta en login**: tras 10 intentos fallidos desde la misma IP en 15 minutos, el servidor responde `RATE_LIMITED` (429). No se bloquea la cuenta, solo la IP; esto evita que un atacante deje fuera a usuarios legítimos bloqueando su cuenta.
- **Sesión caducada o cookie manipulada**: se trata como no autenticado (`UNAUTHENTICATED`), nunca como error interno.
- **Acceso a recurso de un proyecto ajeno**: el servidor responde **siempre `NOT_FOUND`** cuando el usuario no es agente del proyecto; nunca `FORBIDDEN`. Esto evita enumerar qué proyectos existen.
- **Petición a `/api` mal formada (JSON inválido, campos faltantes, tipos erróneos)**: siempre `VALIDATION_ERROR`, nunca un fallo no controlado del servidor.
- **Fallo inesperado (excepción no prevista)**: se captura de forma centralizada y se devuelve `INTERNAL_ERROR` genérico; el detalle queda en el log del servidor, no en la respuesta.
- **Rol del promotor con honorarios a 0**: sigue siendo un agente con su rol; su visibilidad del FRC depende del rol, no de los honorarios (coherente con §9.5).

## Requirements *(mandatory)*

### Functional Requirements

#### Acceso y sesión (US1 — S09)

- **FR-001**: El sistema MUST permitir iniciar sesión con **email y contraseña** de una cuenta existente, verificando la contraseña contra su hash almacenado (argon2, ya sembrado en S07), sin contraseñas hardcodeadas en el código.
- **FR-002**: El sistema MUST mantener la sesión del lado del servidor y entregarla al navegador mediante una **cookie `httpOnly`** (no accesible por JavaScript), de modo que las peticiones siguientes se autentiquen sin reenviar credenciales. La sesión tiene una duración de **24 horas rolling**: se renueva en cada petición autenticada y expira si hay 24 h de inactividad.
- **FR-003**: El sistema MUST permitir **cerrar sesión**, invalidándola de forma que las peticiones posteriores dejen de estar autenticadas. Un mismo usuario PUEDE tener múltiples sesiones activas simultáneas (distintos dispositivos/navegadores); cerrar sesión invalida únicamente la sesión actual, no las demás.
- **FR-004**: El sistema MUST ofrecer una forma de consultar **la identidad de la sesión actual** ("quién soy") y los proyectos en los que la persona participa.
- **FR-005**: Ante credenciales inválidas, el sistema MUST responder con un error **genérico** que no permita distinguir si el email existe.
- **FR-006**: El sistema MUST NOT ofrecer registro abierto, signup, recuperación de contraseña ni invitaciones en el MVP; las cuentas se crean **solo por seed** (§9.1, §19).
- **FR-022** *(FUTURO — aún NO implementado; planificado fuera de S10)*: El sistema deberá aplicar **rate limiting por IP** en el endpoint de login: un máximo de 10 intentos fallidos en una ventana de 15 minutos por dirección IP. Al superarlo, responderá `429 Too Many Requests` con el error estándar y código `RATE_LIMITED`. El contador se resetea cuando la ventana expira. *(No hay implementación en el MVP actual: ni middleware de rate-limit ni el código `RATE_LIMITED` en `ApiError`. Pendiente de una sesión futura con su dependencia propuesta.)*

#### Permisos por rol (US2 + US3 — S10)

- **FR-007**: El sistema MUST resolver el rol de una persona **por proyecto**, a través de su `Agent` en ese proyecto, y NOT a través de una propiedad global del usuario. No existe rol de administrador global.
- **FR-008**: El sistema MUST soportar los cinco roles del dominio —Promotor, Proyectista, Constructor, Project Manager, Observador— y aplicar sus permisos **en el servidor**, con independencia de lo que haga o muestre el frontend.
- **FR-009**: El sistema MUST impedir que un Constructor (o cualquier rol distinto de Promotor/PM) obtenga los **costes privados del promotor**, incluso si invoca el endpoint directamente; la respuesta MUST excluir esos datos por completo, no solo ocultarlos en la interfaz.
- **FR-010**: El sistema MUST aplicar la **matriz de permisos §15** celda a celda: editar proyecto, cargar presupuesto, imputar/anular costes, registrar avance, evaluar/aprobar cambios, registrar decisiones y gestionar agentes quedan restringidos a los roles indicados (PM principalmente; Constructor para imputar coste y avance); el Observador solo puede leer.
- **FR-011**: El sistema MUST garantizar que una persona solo accede a los **proyectos en los que participa**; los proyectos donde no es agente no aparecen en sus listados ni le son accesibles. Al intentar acceder a un proyecto ajeno, el servidor MUST responder `NOT_FOUND` (nunca `FORBIDDEN`), para no confirmar la existencia del proyecto.
- **FR-012**: El sistema MUST permitir que una misma cuenta tenga **roles distintos en proyectos distintos** sin interferencia entre ellos.
- **FR-013**: El sistema MUST aplicar los permisos en **dos capas** (defensa en profundidad): comprobación en el middleware de la API y **red de seguridad RLS** en la base de datos, de modo que un fallo en una capa no exponga datos (detalle de implementación en S10).

#### Contrato HTTP base (US4 — S08, esta sesión)

- **FR-014**: El sistema MUST exponer la API bajo el prefijo **`/api`** y arrancar como un servidor HTTP escuchando en un puerto configurable.
- **FR-015**: El sistema MUST ofrecer un endpoint de **salud** `GET /api/health` que responda un estado simple (p. ej. `{ "status": "ok" }`) sin requerir autenticación y **sin** envoltorio.
- **FR-016**: El sistema MUST devolver **todos** los errores con el formato único `{ "error": { "code": string, "message": string, "details"?: object } }` (§14.3).
- **FR-017**: El `code` de error MUST pertenecer a la lista cerrada: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `DOMAIN_ERROR`, `CONFLICT`, `INTERNAL_ERROR`, y MUST corresponder a un código de estado HTTP coherente. *(`RATE_LIMITED` → 429 queda reservado para FR-022, aún no implementado: hoy NO forma parte del tipo `ErrorCode`.)*
- **FR-018**: El sistema MUST centralizar el manejo de errores en un único punto (middleware de errores), de modo que ningún endpoint construya el JSON de error por su cuenta y ningún error escape sin formatear.
- **FR-019**: El sistema MUST **validar la entrada** (parámetros de ruta, query y body) con esquemas declarativos antes de procesar la petición; una entrada que no cumple el esquema MUST producir `VALIDATION_ERROR` con el detalle del fallo en `details`.
- **FR-020**: Ante un fallo inesperado, el sistema MUST responder `INTERNAL_ERROR` genérico y MUST NOT filtrar trazas, mensajes internos ni datos sensibles al cliente (quedan en el log del servidor).
- **FR-021**: Las respuestas de **éxito** MUST devolver el recurso directamente, sin envoltorio `{ data: ... }` (decisión de clarify).

### Key Entities *(include if feature involves data)*

> El modelo de datos ya existe (feature 002, S07). Esta feature **consume** estas entidades; no crea tablas nuevas.

- **User (cuenta de acceso)**: identidad de login (email único, hash de contraseña, perfil). No tiene rol global. Es el sujeto de la sesión.
- **Session (sesión de servidor)**: vínculo entre un navegador (cookie `httpOnly`) y un `User` autenticado, almacenado en el servidor (Postgres). Es nueva *infraestructura* de S09, no una entidad de dominio del briefing.
- **Project**: contenedor de trabajo. Determina el ámbito en el que se evalúan los permisos.
- **Agent (participación)**: vínculo `User`↔`Project` con un **rol** y condiciones económicas. Es la fuente de verdad de los permisos: el rol vive aquí, por proyecto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

> SC-001 y SC-002 son verificables **al cerrar S08**. El resto se verifican al completar S09/S10, pero la spec ya los fija como contrato.

- **SC-001**: Con el servidor arrancado, `GET /api/health` responde un estado de salud sin autenticación. *(S08)*
- **SC-002**: Forzar una ruta inexistente, una entrada inválida y un fallo interno produce, en los tres casos, una respuesta con la forma `{ "error": { "code", "message", "details" } }` y el código correcto (`NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`). *(S08)*
- **SC-003**: Una persona con credenciales válidas inicia sesión y realiza una petición autenticada sin reenviar la contraseña; con credenciales inválidas no entra y recibe un error genérico. *(S09)*
- **SC-004**: Un usuario autenticado como Constructor recibe `FORBIDDEN` al pedir los costes privados del promotor, y esos datos **no** aparecen en ninguna parte de la respuesta; el mismo recurso pedido por el PM sí los devuelve. *(S10)*
- **SC-005**: La misma cuenta participa en dos proyectos con roles distintos y, en cada uno, el servidor aplica los permisos del rol correspondiente sin interferencia. *(S10)*
- **SC-006**: Un repaso de la matriz §15 confirma que, para cada acción y cada rol, el servidor permite o deniega exactamente lo indicado. *(S10)*
- **SC-007**: Un usuario no autenticado recibe `UNAUTHENTICATED` en cualquier endpoint protegido, sin filtrar datos. *(S09/S10)*

## Assumptions

- El stack está decidido (ADR-004): API REST con Express bajo `/api`, sesiones en PostgreSQL con cookie `httpOnly`. Esta spec no reabre esas decisiones.
- El modelo de datos y las cuentas de demo ya existen (feature 002, S07): `User`, `Project`, `Agent` con `role` por proyecto, y las contraseñas sembradas con hash argon2. El login de S09 las consume sin re-sembrar.
- La librería de validación de entrada es **Zod** (mini-ADR-009, cierra §20.2.1). La librería de sesión (`express-session` + `connect-pg-simple`) se propondrá e instalará en S09, no en S08.
- El frontend aplicará también filtrado por rol por usabilidad, pero **la seguridad real vive en el servidor** (principio constitucional V); el frontend nunca es la única barrera.
- El detalle de las políticas RLS depende del modelo de dominio y se diseña en S10; esta spec solo fija que la segunda capa debe existir.
- La auditoría de los eventos de acceso (login/logout) se apoyará en el `AuditEvent` ya modelado; su cableado fino es de S09/S10.
