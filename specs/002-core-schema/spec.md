# Feature Specification: Esquema núcleo de persistencia + seed de usuarios

**Feature Branch**: `002-core-schema`

**Created**: 2026-06-18

**Status**: Draft

**Input**: Modelar la capa de persistencia del núcleo del dominio IPD (las entidades sobre las que se construyen auth, presupuesto, costes, FRC y dashboard) y sembrar los usuarios de demo. Sesión S07, issue #8, hito H3. Fuente de dominio: `docs/concepto-global.md` §5, §7, §8.8, §9.2 y ADR-005.

> **Nota de alcance**: esta spec cubre **qué datos debe guardar el sistema y bajo qué reglas** (el QUÉ y el POR QUÉ del modelo de dominio). El CÓMO (Prisma, tipos de columna, migraciones) es del plan. Quedan FUERA: la API, la autenticación real, el RLS, y el modelado completo de `Change`/`Risk`/`Incident`/`Decision`/`Restriction`/`PlanningData`/`Document` (features posteriores).

## Clarifications

> Dudas de modelo a resolver con Rubén antes de planificar (las marca esta spec como `[NEEDS CLARIFICATION]`). Se registran aquí tras `/speckit.clarify`.

### Session 2026-06-18

- **Q: `ChangeAdjustment` está vinculado a `Change`, que no es del núcleo de S07. ¿Cómo modelarlo?** → A: **Incluir un `Change` mínimo** (esqueleto: proyecto, tipo, estado) que sostenga la relación, junto con `ChangeAdjustment` (vinculado a `Change` y `BudgetLine`). Así el presupuesto vigente (base + ajustes) es derivable y trazable desde ya; el flujo completo de cambios es de otra feature.
- **Q: ¿Qué siembra el seed? (el rol es por proyecto vía `Agent`, no por `User`)** → A: **Usuarios + proyecto demo + agentes**: las 5 cuentas de login y, además, un proyecto de demo con sus 4 fases y 5 agentes (uno por rol) vinculados a esas cuentas, para ver la relación de extremo a extremo. Adelanta parte del seed íntegro de S17.
- **Q: ¿Cómo se guardan las contraseñas de demo en S07?** → A: **Hashear ya con argon2** (dependencia contemplada en ADR-004): el seed genera hashes reales, de modo que el login de S08/S09 funcione sin re-sembrar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identidades de acceso sembradas (Priority: P1)

El sistema necesita un punto de partida con cuentas de acceso reales para poder probar todo lo demás. Como en el MVP no hay registro abierto, un script de **seed** crea las cuentas de demo. Cada cuenta representa a una persona que, en un proyecto, encarnará uno de los roles del dominio.

**Why this priority**: sin cuentas no se puede entrar ni demostrar nada. Es el primer dato que debe existir y desbloquea el trabajo de auth (S08+).

**Independent Test**: ejecutar el seed sobre una base limpia y comprobar que quedan registradas las cuentas de demo, una por cada rol del dominio, distinguibles entre sí, con su contraseña guardada de forma no reversible.

**Acceptance Scenarios**:

1. **Given** una base de datos recién migrada y vacía, **When** se ejecuta el seed, **Then** existen exactamente las cuentas de demo previstas (una por rol) y se pueden listar.
2. **Given** que el seed ya se ejecutó, **When** se vuelve a ejecutar, **Then** no se duplican cuentas (es idempotente o reinicia de forma controlada).
3. **Given** una cuenta sembrada, **When** se inspecciona, **Then** su contraseña no está almacenada en texto plano.

---

### User Story 2 - Estructura de un proyecto IPD (Priority: P1)

El producto gira alrededor del `Project`. Un proyecto debe poder existir con sus **cuatro fases fijas** (Validación, Pre-Construcción, Construcción, Cierre) y con sus **agentes** (la participación de cada persona/empresa en ESE proyecto, con su rol y sus condiciones económicas de FRC). La misma persona puede ser un agente con un rol en un proyecto y con otro rol distinto en otro.

**Why this priority**: es el contenedor del que cuelga todo lo demás (presupuesto, costes, FRC). Sin proyecto, agentes y fases no hay dominio.

**Independent Test**: crear un proyecto y verificar que quedan registradas sus cuatro fases en el orden correcto, que tiene un puntero a su fase activa, y que se le pueden asociar agentes con rol y condiciones económicas, vinculados a una cuenta de acceso.

**Acceptance Scenarios**:

1. **Given** una cuenta de acceso, **When** se crea un proyecto, **Then** el proyecto nace con sus cuatro fases fijas en orden y con la fase de Validación como activa.
2. **Given** un proyecto, **When** se le añaden agentes, **Then** cada agente tiene un rol del dominio, un porcentaje de reparto, honorarios garantizados y honorarios en riesgo, y referencia a la cuenta de acceso de la persona.
3. **Given** una misma cuenta de acceso, **When** participa en dos proyectos, **Then** puede tener roles y condiciones distintos en cada uno sin interferencia.
4. **Given** un agente que deja de participar, **When** se desactiva, **Then** no se borra: queda inactivo y conserva su historia.

---

### User Story 3 - Presupuesto objetivo y sus ajustes (Priority: P2)

El control económico parte del **presupuesto objetivo**: un `Budget` con sus `BudgetLine` (partidas). El presupuesto base, una vez aprobado, es inmutable; las modificaciones posteriores se registran como **ajustes por partida** (vinculados a un cambio aprobado). El presupuesto vigente NO se guarda: se calcula como base + ajustes.

**Why this priority**: es la base del dashboard económico y del FRC, pero puede modelarse después de tener proyecto y agentes.

**Independent Test**: registrar un presupuesto con partidas, aprobarlo, añadir un ajuste por partida y comprobar que el presupuesto vigente se puede derivar (base + ajustes) sin que exista ninguna columna de "presupuesto vigente".

**Acceptance Scenarios**:

1. **Given** un proyecto, **When** se carga un presupuesto con partidas y se aprueba, **Then** el presupuesto queda como base inmutable y cada partida guarda su importe base, su avance físico (con autor y fecha) y, opcionalmente, una previsión manual.
2. **Given** un presupuesto aprobado, **When** se registra un ajuste por partida, **Then** el ajuste queda vinculado a su partida y al cambio que lo originó, y el presupuesto vigente se deriva sumando base + ajustes.
3. **Given** el modelo de presupuesto, **When** se revisa, **Then** no existe ninguna magnitud derivada (presupuesto vigente, EV, previsión efectiva) como dato almacenado.

---

### User Story 4 - Costes reales como libro contable inmutable (Priority: P2)

Los costes reales son un **libro de apuntes inmutable**. Un `RealCost` mal imputado no se edita ni se borra: se anula con un **contra-asiento** (un `RealCost` de tipo `reversal`, importe de signo contrario, vinculado al original y con motivo obligatorio). El coste acumulado es la suma de todos los apuntes; "anulado" no es un estado guardado, es una condición derivada (tener un contra-asiento vinculado).

**Why this priority**: imprescindible para el control económico real, pero depende de tener presupuesto y partidas.

**Independent Test**: imputar un coste, anularlo con un contra-asiento y comprobar que el original permanece intacto, que el contra-asiento queda vinculado con su motivo, y que el acumulado refleja la resta.

**Acceptance Scenarios**:

1. **Given** una partida, **When** se imputa un coste real, **Then** queda registrado como apunte normal, vinculado a la partida, con autor y fecha, y es inmutable.
2. **Given** un coste mal imputado, **When** se anula, **Then** se crea un apunte de tipo `reversal` con signo contrario, vinculado al original y con motivo obligatorio; el original no se modifica.
3. **Given** un coste con su contra-asiento, **When** se consulta el estado "anulado", **Then** se deriva de la existencia del contra-asiento, no de una columna de estado.

---

### User Story 5 - Rastro de auditoría (Priority: P3)

Las acciones relevantes dejan un `AuditEvent`. Es un registro **append-only**: nunca se edita ni se borra. Sirve a la trazabilidad ("libros abiertos") del producto.

**Why this priority**: transversal y valioso, pero el esquema puede nacer mínimo y enriquecerse cuando existan las acciones que lo generan (S10+).

**Independent Test**: registrar un evento de auditoría y comprobar que queda almacenado con actor, acción, entidad afectada y momento, y que el modelo no permite editarlo ni borrarlo como parte del flujo normal.

**Acceptance Scenarios**:

1. **Given** una acción relevante, **When** ocurre, **Then** se registra un evento con quién, qué acción, sobre qué entidad y cuándo.
2. **Given** eventos registrados, **When** se consulta el historial, **Then** están todos, en orden, sin huecos por ediciones o borrados.

---

### Edge Cases

- **Misma persona, varios proyectos**: la separación cuenta-de-acceso / participación debe permitir roles distintos por proyecto sin colisión.
- **Anulación de un coste ya anulado**: el modelo no impide múltiples apuntes; el acumulado sigue siendo la suma de todos (las funciones de cálculo no necesitan casos especiales).
- **Proyecto sin presupuesto todavía**: un proyecto recién creado puede no tener presupuesto ni costes; el modelo no debe exigirlos para existir.
- **Borrado de datos**: desactivar un agente o anular un coste nunca implica borrado físico (preserva la historia económica).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST distinguir la **cuenta de acceso** (identidad de login: email, contraseña, perfil) de la **participación en un proyecto** (rol, permisos y condiciones económicas), de modo que una misma cuenta pueda participar con roles distintos en proyectos distintos.
- **FR-002**: El sistema MUST soportar los roles del dominio: Promotor, Proyectista, Constructor, Project Manager y Observador. No existe rol de administrador global.
- **FR-003**: El sistema MUST crear, al nacer un proyecto, sus **cuatro fases fijas** (Validación, Pre-Construcción, Construcción, Cierre) en ese orden, y MUST guardar qué fase es la activa. El estado de cada fase (planificada/activa/cerrada) MUST derivarse de esa posición, nunca almacenarse.
- **FR-004**: El sistema MUST almacenar las magnitudes monetarias como **céntimos enteros** (sin decimales) en una única moneda (EUR), sin guardar la moneda por proyecto.
- **FR-005**: El sistema MUST NOT persistir ninguna magnitud derivada: presupuesto vigente, coste real acumulado, EV, indicadores EVM, FRC, contingencia consumida, previsión efectiva, impacto acumulado de cambios, estado "anulado" de un coste y estado de fase se calculan al vuelo.
- **FR-006**: El sistema MUST almacenar, como únicos datos económicos base: el presupuesto base por partida, los ajustes aprobados por partida, el avance físico por partida (con autor y fecha), la previsión manual opcional por partida, y los honorarios y porcentaje de reparto de cada agente.
- **FR-007**: El sistema MUST tratar cada `RealCost` como inmutable y de tipo `normal` o `reversal`; una corrección MUST hacerse con un contra-asiento (signo contrario, vinculado al original, motivo obligatorio), nunca editando o borrando el original.
- **FR-008**: El sistema MUST almacenar los estados que sí son estado real: `Project` (activo/archivado), `Budget` (borrador/aprobado; aprobado = base inmutable) y `Agent` (activo/inactivo; desactivar preserva la historia).
- **FR-009**: El sistema MUST registrar los eventos de auditoría de forma **append-only** (sin edición ni borrado en el flujo normal).
- **FR-010**: El sistema MUST permitir aplicar el modelo a una base limpia mediante una migración inicial reproducible, y MUST proveer un seed que cree las cuentas de demo (una por rol).
- **FR-011**: El sistema MUST guardar las contraseñas de las cuentas de forma no reversible (nunca en texto plano), generando el hash definitivo ya en el seed (con argon2, ADR-004), de modo que la autenticación posterior lo use sin re-sembrar.
- **FR-012**: El sistema MUST registrar los ajustes de presupuesto **por partida** (`ChangeAdjustment`) vinculados al cambio que los origina. Para sostener esa relación se incluye una entidad `Change` mínima (esqueleto: proyecto, tipo, estado) en esta feature; el flujo completo de cambios es posterior.
- **FR-013**: El seed MUST dejar el sistema en un estado demostrable de extremo a extremo: las cuentas de acceso (una por rol) **y** un proyecto de demo con sus cuatro fases y sus agentes (uno por rol) vinculados a esas cuentas.

### Key Entities *(include if feature involves data)*

- **User (cuenta de acceso)**: identidad de login. Atributos: email, contraseña (no reversible), datos básicos de perfil. No tiene rol global.
- **Project**: contenedor de trabajo. Atributos: nombre, descripción, código interno, cliente/promotor, puntero a fase activa, indicador de archivado, fechas planificadas y reales, umbral de alerta de desviación. Estado: activo/archivado.
- **Phase**: una de las cuatro fases fijas de un proyecto. Atributos: nombre/orden, fechas planificadas y reales (opcionales). Su estado es derivado.
- **Agent (participación)**: vínculo entre una cuenta de acceso y un proyecto. Atributos: rol del dominio, porcentaje de reparto, honorarios garantizados, honorarios en riesgo, estado activo/inactivo. Las condiciones pertenecen al proyecto, no a la cuenta.
- **Budget**: presupuesto objetivo de un proyecto. Estado: borrador/aprobado (aprobado = base inmutable).
- **BudgetLine (partida)**: línea del presupuesto. Atributos: importe base (céntimos), avance físico (con autor y fecha), previsión manual opcional. Sin estado propio.
- **RealCost (apunte de coste real)**: importe (céntimos), tipo (normal/reversal), partida afectada, autor y fecha; el reversal apunta al original y lleva motivo. Inmutable.
- **Change (cambio, esqueleto)**: registro mínimo de un cambio del proyecto (tipo y estado) que origina ajustes de presupuesto. El flujo completo (propuesta → evaluación → aprobación, efectos) es de la feature de gestión de cambios.
- **ChangeAdjustment (ajuste por partida)**: ajuste de presupuesto (céntimos, con signo) sobre una partida, vinculado al `Change` que lo origina.
- **AuditEvent**: registro append-only. Atributos: actor, acción, entidad afectada, momento, y datos contextuales.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sobre una base limpia, aplicar la migración inicial deja el modelo listo sin errores ni pasos manuales.
- **SC-002**: Tras ejecutar el seed, existe exactamente una cuenta de demo por cada rol del dominio y se pueden listar e inspeccionar.
- **SC-003**: Crear un proyecto produce automáticamente sus cuatro fases en orden y deja Validación como fase activa.
- **SC-004**: Una revisión del modelo confirma que **ninguna** de las magnitudes derivadas de la tabla §7 del concepto existe como dato almacenado.
- **SC-005**: Un coste anulado conserva el apunte original intacto y su contra-asiento vinculado con motivo; el acumulado calculado refleja la resta.
- **SC-006**: La misma cuenta de acceso puede participar en dos proyectos con roles distintos sin colisión de permisos ni de condiciones económicas.

## Assumptions

- El stack de persistencia está decidido (ADR-001/005): PostgreSQL + Prisma, dinero en céntimos como entero grande. Esta spec no reabre esa decisión.
- La autenticación real (verificación de contraseña, sesión, RLS) es de features posteriores (S08+); aquí solo se persisten las cuentas y sus contraseñas no reversibles.
- El seed usa datos ficticios de demo; las contraseñas de demo se documentarán fuera del código versionado sensible (p. ej. README), nunca credenciales reales.
- El modelado completo de `Change`, `Risk`, `Incident`, `Decision`, `Restriction`, `PlanningData` y `Document` llega en sus propias features; aquí solo se incluye lo imprescindible para el núcleo económico y de identidad.
