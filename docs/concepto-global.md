# IPD Platform — Concepto global del producto

**Estado:** Versión 1.1 — fuente de verdad funcional
**Fecha:** 2026-06-11
**Ubicación canónica:** `docs/concepto-global.md` (sustituye al borrador de `Doc inicial/IPD_Platform_Concepto_Global.md`)
**Propósito:** explicar la foto global de la plataforma IPD Platform antes de convertir el alcance en épicas, historias de usuario, issues, specs SDD y tareas técnicas.

> **Nota de anonimización:** los nombres de empresas, proyectos y cifras que aparecen en los ejemplos son ficticios. El material real del cliente vive en `Doc inicial/` (fuera de git) y no debe copiarse a este documento.

**Changelog**

- v1.1 (2026-06-11): añadidos datos almacenados vs derivados (§7), estados por entidad (§7), fórmulas EVM exactas con reglas de división por cero (§9.6) y auditoría transversal `AuditEvent` (§8.9).
- v1.0 (2026-06-11): primera versión versionada en `docs/`, a partir del borrador privado, incorporando la revisión funcional: captura de avance físico para EV, previsión a cierre con regla por defecto, reglas del promotor en el FRC, visibilidad del FRC cerrada según briefing, tratamiento de comparativos, flujo cero (usuarios y seed), definición de fases, matriz de permisos sin ambigüedades, anulación trazable de costes, moneda fija EUR y mapeo de módulos contra el briefing (Anexo A).

---

## 1. Qué es este documento

Este documento explica **qué se va a desarrollar**, **para qué sirve**, **cómo se espera que funcione la aplicación**, **en qué módulos se divide** y **qué lógica de negocio debe reflejar cada módulo**.

No es un ADR, no es una especificación técnica de base de datos y no es un diseño de pantallas cerrado. Es un documento de **concepto funcional del producto**: una descripción suficientemente aterrizada para que, al leerla, se pueda construir el mapa mental de la aplicación y después derivar de él:

- épicas del panel de GitHub;
- historias de usuario;
- flujos de pantalla;
- criterios de aceptación;
- specs SDD;
- tests de dominio;
- prioridades de desarrollo;
- decisiones técnicas pendientes.

La idea es que este documento cumpla el papel que tendría una explicación tipo: “estamos construyendo una App Store; tiene una portada, categorías, ficha de aplicación, valoraciones, desarrolladores, compras, descargas, etc.”, pero aplicado al dominio IPD.

### 1.1 Relación con el resto de la documentación

- **ADRs (`docs/adr/`):** las decisiones técnicas (stack, arquitectura, modelo de dominio estructural) viven en los ADRs. Este documento las **asume** (sección 13) pero no las re-decide. Si hay conflicto, manda el ADR.
- **Constitución SDD (`.specify/memory/constitution.md`):** los principios de negocio de la sección 8 y los criterios de éxito de la sección 18 son el material base de la constitución.
- **Specs SDD (`specs/`):** cada módulo o flujo de este documento se convertirá en una o varias specs (`specify → clarify → plan → tasks`). La spec manda sobre este documento en el detalle fino; este documento manda sobre la spec en la visión de conjunto.
- **Briefing del cliente:** la numeración de módulos de este documento es propia. El Anexo A mapea cada módulo contra el módulo equivalente del briefing, que es el vocabulario que usará el evaluador.

---

## 2. Resumen ejecutivo

IPD Platform es un prototipo funcional de plataforma web para gestionar proyectos de construcción desarrollados bajo metodología **IPD — Integrated Project Delivery**.

Un proyecto IPD no funciona como un contrato tradicional de construcción. En lugar de que promotor, proyectista y constructor trabajen con intereses separados, el proyecto se organiza como un contrato colaborativo donde los principales agentes participan desde fases tempranas, trabajan con **Libros Abiertos**, comparten riesgos y beneficios, y toman decisiones de forma coordinada.

La plataforma debe resolver un problema concreto: hoy la información de estos proyectos está repartida entre ACC, Excel, Power BI, MS Project, correo electrónico, actas de reunión y herramientas internas de cada constructor. Eso provoca dispersión, pérdida de trazabilidad, dificultad para saber qué decisión se tomó y, sobre todo, dificultad para entender en tiempo real cómo la evolución económica del proyecto afecta a cada agente.

La plataforma no pretende ser inicialmente un CDE completo ni sustituir todas las herramientas existentes. El valor diferencial del prototipo está en centralizar los flujos propios de IPD:

1. creación de un proyecto IPD con fases, agentes, roles y condiciones económicas;
2. gestión del presupuesto objetivo como línea base;
3. imputación de costes reales contra partidas y registro del avance físico;
4. seguimiento de desviaciones, contingencias y previsión a cierre;
5. cálculo del **FRC — Fondo de Riesgo Compartido**;
6. dashboard de KPIs económicos, EVM, riesgos, cambios y restricciones;
7. registro de riesgos, incidencias y decisiones;
8. gestión tipificada de cambios con impacto automático en presupuesto, honorarios y FRC;
9. control de acceso por rol, con vista privada del promotor aplicada en servidor y base de datos.

La pregunta que debe poder responder la plataforma en todo momento es:

> Si el proyecto cerrara hoy con los datos actuales, ¿cuánto cobra, gana, pierde o arriesga cada agente?

Ese es el centro del producto.

---

## 3. Idea de producto en una frase

IPD Platform es una aplicación web donde los agentes de un proyecto IPD pueden ver y gestionar, con trazabilidad y permisos reales, el estado económico del proyecto, sus riesgos, cambios, decisiones y KPIs, entendiendo en tiempo real cómo cada evento afecta al presupuesto objetivo, a las contingencias y al reparto del Fondo de Riesgo Compartido.

---

## 4. Qué problema resuelve

### 4.1 Problema operativo actual

En los proyectos IPD reales, la información suele estar fragmentada:

- ACC o similar se usa como repositorio documental;
- Excel se usa para presupuesto, seguimiento económico y registros auxiliares;
- Power BI se usa para cuadros de mando;
- MS Project, TaktPlan u otras herramientas se usan para planificación;
- el correo y Teams absorben incidencias, decisiones y discusiones;
- las constructoras imputan costes en sus propios ERPs o herramientas presupuestarias;
- las actas de reunión contienen decisiones importantes pero no siempre son buscables o trazables.

El resultado es que el equipo puede tener mucha información, pero no necesariamente una **visión integrada y accionable**.

### 4.2 Problema específico de IPD

En un contrato tradicional, cada agente mira su parte: el promotor mira coste total, el constructor mira margen, el proyectista mira alcance y honorarios. En IPD, en cambio, las decisiones se toman sabiendo que el resultado económico del proyecto impacta en todos.

Por eso la plataforma debe reflejar tres ideas que no son habituales en herramientas convencionales:

1. **Transparencia económica:** todos los agentes del núcleo IPD deben poder consultar los costes reales relevantes del proyecto.
2. **Alineamiento económico:** el ahorro o sobrecoste no pertenece solo a un agente; se traduce en bonus/malus a través del FRC.
3. **Trazabilidad de decisiones:** una decisión, un riesgo materializado o un cambio aprobado no son notas sueltas; deben modificar o explicar indicadores del proyecto.

### 4.3 Problema de decisión

La plataforma debe ayudar a responder preguntas como:

- ¿Cuál era el presupuesto objetivo aprobado?
- ¿Qué coste real se ha imputado hasta ahora?
- ¿Qué partidas están desviadas?
- ¿Qué parte de las contingencias se ha consumido?
- ¿Qué cambios aprobados han modificado el presupuesto objetivo?
- ¿Qué riesgos siguen activos y cuánto impacto económico ponderado representan?
- ¿Qué decisiones justifican la situación actual?
- ¿Qué ve el promotor que no ve el constructor?
- ¿Qué resultado económico proyectado tiene cada agente?
- ¿El FRC está en bonus, en equilibrio o en malus?
- ¿Qué pasaría si se aprueba este cambio de alcance?

---

## 5. Quién usa la plataforma

La aplicación se diseña alrededor de usuarios reales con roles asignados **por proyecto**. Un mismo usuario puede tener un rol en un proyecto y otro rol distinto en otro.

### 5.1 Usuario

`User` representa una cuenta de acceso a la plataforma. Es una identidad de login: email, contraseña, sesión, datos básicos del perfil.

Un `User` no es lo mismo que un `Agent`.

**Alta de usuarios en el MVP:** no hay registro abierto ni pantalla de alta. Los usuarios se crean mediante un **script de seed** (ver flujo 0, §10.0). Las invitaciones o el alta self-service quedan fuera del MVP (§19). No existe un rol de "administrador global de plataforma": toda autoridad nace del rol que el usuario tiene en cada proyecto.

### 5.2 Agente

`Agent` representa la participación de una persona, empresa o equipo dentro de un proyecto concreto. Tiene rol, permisos y condiciones económicas asociadas al FRC.

Ejemplo:

- María puede ser `User`.
- En el Proyecto A puede ser `Agent` con rol `Project Manager`.
- En el Proyecto B puede ser `Agent` con rol `Observador`.

Esta separación es importante porque los permisos y las condiciones económicas pertenecen al proyecto, no al usuario de forma global.

### 5.3 Roles principales

#### Promotor

Es quien encarga y financia el proyecto. Tiene acceso a toda la información compartida del contrato IPD y, además, puede ver información privada de promoción que no es relevante para proyectista ni constructor: suelo, tasas, financiación, costes de desarrollo u otros costes privados.

En la plataforma, el promotor debe poder:

- ver el dashboard general del proyecto;
- ver su inversión total;
- ver costes privados de desarrollo;
- ver el estado del FRC (cuadro completo, ver §9.5);
- consultar presupuesto, costes reales, cambios, riesgos, incidencias y decisiones;
- participar en la validación de decisiones según el flujo definido;
- consultar comparativos y documentación asociada si el módulo documental existe.

No debe entenderse como “el jefe que aprueba todo unilateralmente”. En IPD muchas decisiones son consensuadas por el equipo.

#### Proyectista

Es el equipo de arquitectura o ingeniería. Participa desde fases tempranas, aporta soluciones de diseño y asume parte de sus honorarios en riesgo.

En la plataforma debe poder:

- consultar información compartida;
- ver el presupuesto objetivo y costes reales compartidos;
- ver su propio resultado proyectado en el FRC (solo el suyo, regla del briefing);
- registrar riesgos, incidencias o propuestas de cambio;
- consultar decisiones vinculadas a cambios, alternativas o incidencias;
- no ver los costes privados del promotor.

#### Constructor

Es la empresa que ejecuta y compra. En fase de construcción suele ser quien imputa los costes reales de obra y gestiona contrataciones.

En la plataforma debe poder:

- consultar información compartida;
- imputar costes reales a partidas;
- registrar el avance físico de las partidas;
- ver desviaciones por capítulo y partida;
- ver su propio resultado proyectado en el FRC (solo el suyo, regla del briefing);
- registrar riesgos, incidencias y propuestas de cambio;
- consultar decisiones y cambios aprobados;
- no ver los costes privados del promotor.

#### Project Manager

Es el equipo gestor del proceso. Coordina el proyecto, estructura reuniones, registra decisiones, gestiona restricciones y opera el flujo de cambios en la herramienta.

En la plataforma debe poder:

- crear y configurar proyectos;
- asignar agentes y roles;
- gestionar fases;
- gestionar restricciones, incidencias y decisiones;
- transicionar cambios por el flujo formal;
- aprobar o rechazar cambios en la aplicación como registro de lo decidido por la Comisión Ejecutiva;
- anular imputaciones erróneas mediante contra-asiento (§9.4);
- consultar toda la información necesaria para coordinar, incluida la información privada del promotor (el briefing le da "acceso completo a toda la información del proyecto").

El Project Manager no sustituye al consenso IPD. La app refleja que una decisión se tomó en la Comisión Ejecutiva, pero operativamente alguien debe registrarla.

#### Observador

Usuario de solo lectura sobre información compartida.

Debe poder:

- entrar al proyecto;
- consultar dashboards y registros permitidos;
- no editar datos;
- no ver información privada del promotor;
- no ver resultados individuales del FRC (no participa en el fondo).

---

## 6. Cómo se organiza la aplicación

La plataforma se organiza alrededor de proyectos. La navegación principal parte de una lista de proyectos y, al entrar en uno, el usuario accede a módulos funcionales.

### 6.1 Estructura conceptual de navegación

Una estructura razonable de alto nivel sería:

```txt
/login
/projects
/projects/new
/projects/:projectId/overview
/projects/:projectId/dashboard
/projects/:projectId/agents
/projects/:projectId/budget
/projects/:projectId/real-costs
/projects/:projectId/frc
/projects/:projectId/risks
/projects/:projectId/incidents
/projects/:projectId/decisions
/projects/:projectId/changes
/projects/:projectId/planning
/projects/:projectId/restrictions
/projects/:projectId/documents
/projects/:projectId/settings
```

No todas las rutas tienen que existir en el MVP inicial, pero este mapa ayuda a entender la división natural del producto.

### 6.2 Layout general

Una vez autenticado, el usuario ve:

- selector/listado de proyectos;
- menú lateral del proyecto activo;
- cabecera con nombre del proyecto, fase activa y rol del usuario;
- zona principal de contenido;
- acciones principales según módulo;
- avisos o notificaciones de estado.

Ejemplo:

```txt
[IPD Platform] [Proyecto: Hotel Azahar] [Fase: Construcción] [Rol: Constructor]

Dashboard
Control económico
Cambios
Riesgos
Incidencias
Decisiones
Planificación
Documentos
Configuración
```

### 6.3 Misma URL, distinta información

Un criterio importante del producto es que dos usuarios puedan entrar en la misma URL y ver información distinta según su rol.

Ejemplo:

```txt
/projects/123/dashboard
```

El promotor ve:

- indicadores compartidos;
- estado de FRC;
- costes IPD;
- costes privados de desarrollo;
- inversión total.

El constructor ve:

- indicadores compartidos;
- estado de FRC propio;
- costes IPD;
- datos de imputación de costes;
- no ve costes privados del promotor.

Esto no debe resolverse ocultando tarjetas en React después de haber recibido todos los datos. El backend y las políticas RLS deben impedir que el dato privado llegue a quien no corresponde.

---

## 7. Modelo mental del proyecto IPD dentro de la app

Para entender el producto, conviene imaginar un proyecto como una estructura formada por estas piezas:

```txt
Project
  ├── Phase[]
  ├── Agent[]
  ├── Budget
  │     └── BudgetLine[]
  ├── RealCost[]
  ├── FRC derivado
  ├── Change[]
  ├── Risk[]
  ├── Incident[]
  ├── Decision[]
  ├── Restriction[]
  ├── PlanningData[]
  ├── Document[]
  └── AuditEvent[]
```

Las entidades obligatorias del dominio son:

- `Project`
- `Phase`
- `Budget`
- `BudgetLine`
- `RealCost`
- `Risk`
- `Change`
- `Incident`
- `Decision`
- `Agent`
- `FRC`

El objetivo no es tener muchas tablas, sino que el modelo refleje bien el dominio. La dificultad está en que casi todo se conecta con el control económico.

Por ejemplo:

- un `RealCost` afecta a una `BudgetLine`;
- una `BudgetLine` afecta al presupuesto vigente;
- el presupuesto vigente afecta al `FRC`;
- un `Change` aprobado puede crear ajustes sobre una o varias `BudgetLine`;
- un `Risk` materializado puede consumir contingencias y generar un `RealCost`;
- una `Decision` puede justificar un `Change`, una adjudicación, una alternativa o el cierre de una incidencia;
- un `Agent` determina quién ve qué y cómo se reparte el FRC;
- el avance físico de cada `BudgetLine` determina el EV del proyecto.

### Datos almacenados vs datos derivados

Regla de oro: **lo derivado no se persiste**. Se calcula al consultar (funciones puras). Si el rendimiento obligara algún día a cachear, el caché nunca sería fuente de verdad. Esta tabla evita el error de modelo más caro que existe: guardar lo que se debe calcular.

| Concepto | Tipo | Fuente |
|---|---|---|
| Presupuesto base por partida | Almacenado | `BudgetLine` (inmutable tras aprobar) |
| Ajustes aprobados por partida | Almacenado | entidad de ajuste vinculada a `Change` y `BudgetLine` (nombre candidato: `ChangeAdjustment`) |
| Presupuesto vigente | Derivado | base + Σ ajustes aprobados |
| Coste real acumulado | Derivado | Σ de todos los `RealCost` (los contra-asientos restan) |
| Avance físico actual | Almacenado | campo en `BudgetLine`, con autor y fecha |
| EV | Derivado | Σ (presupuesto vigente de partida × % avance) |
| Previsión manual | Almacenado | campo opcional en `BudgetLine` |
| Previsión efectiva | Derivado | manual si existe; si no, `max(coste real, presupuesto vigente)` |
| Contingencia consumida | Derivado | Σ eventos que la consumen (cambios tipo 2, riesgos materializados) |
| Impacto acumulado de cambios | Derivado | Σ ajustes de cambios aprobados |
| Honorarios y % de reparto vigentes | Almacenado | `Agent` (solo los modifica un cambio tipo 3 aprobado, con evento de auditoría) |
| FRC actual | Derivado | `calculateFRC()` |
| Indicadores EVM | Derivado | `calculateEVM()` |
| Estado "anulado" de un coste | Derivado | existencia de contra-asiento vinculado |
| Estado de cada fase | Derivado | posición respecto a la fase activa del proyecto |
| Eventos de auditoría | Almacenado | `AuditEvent` (append-only) |

### Estados por entidad

Vista concentrada de las máquinas de estado del dominio. Sirve para tres cosas: validaciones de la API (las transiciones no listadas se rechazan con `CONFLICT`/`DOMAIN_ERROR`), botones visibles en cada pantalla, y casos de test.

| Entidad | Estados | Transiciones y notas |
|---|---|---|
| `Project` | active / archived | active → archived (PM). Archivado = solo lectura. |
| `Phase` | planned / active / closed | **Derivados**, no almacenados: se deducen de la posición respecto a la fase activa del proyecto. |
| `Budget` | draft / approved | draft → approved (PM, al confirmar la carga). Aprobado = base inmutable (§8.1). |
| `BudgetLine` | — | Sin estados propios: vive del estado de su `Budget`. |
| `RealCost` | normal / reversal (tipo, no estado) | Inmutable, sin máquina de estados: "anulado" es condición **derivada** (existe contra-asiento vinculado). |
| `Risk` | Activo / Materializado / Cerrado | Activo → Materializado (PM) · Activo → Cerrado · Materializado → Cerrado. |
| `Change` | Propuesto / Evaluado / Aprobado / Rechazado | Propuesto → Evaluado → Aprobado ∣ Rechazado (transiciona solo el PM). Aprobado y Rechazado son terminales. |
| `Incident` | Abierta / En curso / Cerrada | Abierta → En curso → Cerrada; se permite Abierta → Cerrada directa. |
| `Decision` | registrada | Inmutable una vez registrada: un error se corrige con otra decisión que la referencia. |
| `Restriction` | Abierta / Resuelta | "Vencida" no es estado: se deriva de fecha límite pasada con estado Abierta. |
| `Agent` | activo / inactivo | Desactivar no borra: preserva la historia económica y de permisos. |

---

## 8. Principios de negocio que debe respetar la app

### 8.1 El presupuesto objetivo no se machaca

El presupuesto aprobado no debe sobrescribirse cada vez que ocurre algo. La plataforma debe conservar una línea base y registrar ajustes posteriores.

Esto permite responder:

- ¿cuál era el presupuesto inicial aprobado?
- ¿qué cambios lo han modificado?
- ¿cuánto impacto acumulado tienen los cambios aprobados?
- ¿qué presupuesto vigente tenemos hoy?

Modelo mental:

```txt
Presupuesto vigente = presupuesto base aprobado + suma de ajustes aprobados
```

### 8.2 El dinero se gestiona en céntimos enteros

Todo importe económico se almacena y calcula en céntimos enteros. La conversión a euros ocurre solo en la presentación, formularios o importaciones.

Esto evita errores de redondeo en cálculos económicos, especialmente en FRC.

La moneda del MVP es **EUR, fija** (constante de la aplicación, no configurable por proyecto). Multi-moneda queda fuera del alcance (§19).

### 8.3 El FRC no es una tabla editable

El FRC es un resultado derivado. No se edita manualmente. Se calcula a partir de:

- presupuesto vigente;
- costes reales acumulados;
- previsión a cierre (con la regla por defecto de §9.4);
- condiciones económicas de cada agente;
- porcentajes de reparto;
- honorarios garantizados;
- honorarios en riesgo;
- cambios aprobados;
- reglas de bonus/malus y límites (§9.5).

La plataforma puede mostrar snapshots o histórico más adelante, pero el valor actual debe calcularse de forma coherente (decisión ya tomada en ADR-005: cálculo al vuelo).

### 8.4 Los cambios no son notas: tienen efectos

Una propuesta de cambio puede no tener efecto económico, o puede modificar presupuesto, honorarios y reparto FRC.

Por eso el módulo de cambios es un motor de negocio, no un simple CRUD.

### 8.5 La trazabilidad es parte del producto

Cada dato importante debe tener explicación:

- qué lo originó;
- quién lo registró;
- cuándo se aprobó;
- a qué decisión se vincula;
- qué partida afecta;
- qué impacto tiene.

La plataforma debe permitir reconstruir el relato económico del proyecto.

### 8.6 Los permisos forman parte del dominio

Los permisos no son un añadido técnico. En IPD, saber qué se comparte y qué no se comparte forma parte del contrato y de la confianza entre agentes.

Por tanto, la aplicación debe diferenciar:

- información compartida del núcleo IPD;
- información privada del promotor;
- permisos de lectura;
- permisos de edición;
- permisos de transición de estados;
- permisos por proyecto.

### 8.7 El avance físico se registra, no se deduce

El porcentaje de avance de cada partida es un **dato que alguien registra** (constructor o PM), no algo que la app infiere de los costes. Gastar dinero no es avanzar obra: una partida puede llevar el 80% del coste gastado y el 40% del trabajo hecho — esa diferencia es exactamente lo que el EVM existe para detectar.

El avance alimenta el **EV (Earned Value)**: `EV = Σ (presupuesto vigente de partida × % avance)`. Sin avance registrado no hay EV, y sin EV no hay CV ni CPI (que el dashboard debe mostrar incluso sin planificación). Cada actualización de avance guarda quién y cuándo.

### 8.8 Los costes imputados no se editan: se anulan

Un `RealCost` guardado es inmutable — también su "estado". Si se imputó mal (importe erróneo, partida equivocada), no se edita ni se borra: se **anula con un contra-asiento** (un `RealCost` de tipo `reversal`, signo contrario, vinculado al original, con motivo obligatorio) y, si procede, se crea la imputación correcta.

Modelo contable puro: el original no se modifica nunca; el acumulado es la **suma de todos los asientos** (los contra-asientos restan); y "anulado" es una condición derivada (tener contra-asiento vinculado) que la UI usa para tachar el apunte. La corrección es un evento más del relato económico, visible en Libros Abiertos.

### 8.9 Las acciones relevantes dejan evento de auditoría

En un producto de Libros Abiertos, la confianza no es una pantalla: es poder responder "quién hizo qué y cuándo" sobre cualquier dato económico. Por eso, además de los historiales por entidad, la plataforma registra un **`AuditEvent`** (append-only: nunca se edita ni se borra) por cada acción relevante:

```txt
project.created
project.archived
phase.changed
agent.added
agent.conditionsChanged      (honorarios, % de reparto)
budget.imported
budget.approved
realCost.created
realCost.voided
progress.updated
forecast.updated
change.proposed
change.evaluated
change.approved
change.rejected
decision.created
risk.created
risk.materialized
incident.statusChanged
restriction.resolved
```

Cada evento guarda: tipo, fecha, autor (`User`/`Agent`), entidad afectada y un resumen mínimo de datos (p. ej. importe, estado anterior → nuevo). Reglas:

- **Visibilidad:** cada evento hereda los permisos de su entidad. Los eventos sobre costes privados del promotor no son visibles para quien no puede ver esos costes (la RLS también cubre `AuditEvent`).
- **MVP sin pantalla propia:** los eventos alimentan los historiales que ya muestran los detalles de partida, cambio, riesgo o incidencia. Una vista global de auditoría es ampliación posterior.
- El modelo y el helper de registro nacen en la Epic 2; cada épica posterior registra los suyos.

---

## 9. Módulos de la plataforma

> La numeración de módulos es propia de este documento. La equivalencia con los módulos del briefing (el vocabulario del evaluador) está en el **Anexo A**.

## 9.1 Módulo 1 — Autenticación, sesión y roles *(briefing: Módulo 1)*

### Finalidad

Permitir que usuarios reales accedan a la plataforma, mantengan una sesión segura y vean o editen datos según su rol en cada proyecto.

### Qué resuelve

Sin autenticación y roles, no existe IPD Platform. El producto depende de demostrar que los permisos funcionan de verdad, especialmente en la vista privada del promotor.

### Cómo debería funcionar

El usuario entra en `/login`, introduce email y contraseña, y el backend crea una sesión almacenada en PostgreSQL. El navegador recibe una cookie `httpOnly`. A partir de ahí, cada petición a `/api` se resuelve con esa sesión.

Cuando el usuario entra en un proyecto, la API consulta qué `Agent` representa a ese `User` dentro de ese `Project`. A partir de ese agente se aplican permisos.

### Alta de usuarios (MVP)

- No hay registro abierto ni pantalla de signup.
- Los usuarios se crean con el **script de seed** (§10.0), que genera un usuario por rol para la demo.
- Las contraseñas de seed son solo para entorno local de demo y se documentan en el README; no hay credenciales hardcodeadas en el código de la aplicación.
- Invitaciones, recuperación de contraseña y alta self-service quedan fuera del MVP (§19).

### Comportamiento esperado

- Un usuario no autenticado no puede acceder a proyectos.
- Un usuario autenticado solo ve proyectos donde participa.
- Un usuario puede tener distinto rol en cada proyecto.
- Los roles se aplican en API y en base de datos.
- Un constructor no recibe costes privados del promotor, aunque llame manualmente al endpoint.
- Un observador no puede crear, editar ni aprobar elementos.
- El Project Manager puede operar flujos de gestión.
- No existe rol de administrador global: la gestión de agentes de un proyecto corresponde a su PM.

### Pantallas mínimas

- Login.
- Listado de proyectos accesibles.
- Vista de “mi rol en este proyecto”.
- Gestión de agentes del proyecto, accesible al PM.

### Lógica de negocio

El rol no debe ser una propiedad global del usuario. Debe pertenecer a la relación usuario-proyecto.

Ejemplo:

```txt
User: ruben@example.com
Project A: Agent(role = ProjectManager)
Project B: Agent(role = Observer)
```

### Integración técnica decidida

- Backend propio Node + TypeScript.
- API Express bajo `/api`.
- Sesiones en PostgreSQL con cookie `httpOnly`.
- Middleware de sesión.
- Middleware de permisos.
- PostgreSQL RLS como red de seguridad.

---

## 9.2 Módulo 2 — Gestión de proyectos *(briefing: Módulo 2)*

### Finalidad

Crear el contenedor principal de trabajo. Todo en la plataforma ocurre dentro de un proyecto.

### Qué es un proyecto

Un `Project` representa un proyecto de construcción gestionado mediante metodología IPD. Tiene fases, agentes, fechas, presupuesto y registros asociados.

### Datos principales

Un proyecto debería tener, al menos:

- nombre;
- descripción;
- código interno;
- cliente/promotor;
- fase activa: Validación, Pre-Construcción, Construcción o Cierre (ver “Fases del proyecto”);
- indicador de archivado;
- fechas planificadas;
- fechas reales;
- umbral de alerta de desviación;
- agentes participantes;
- configuración FRC;
- visibilidad y permisos.

La moneda no es un dato del proyecto: el MVP trabaja en EUR fijo (§8.2).

### Fases del proyecto

`Phase` es entidad obligatoria del dominio y funciona así:

- Al crear un proyecto se crean **automáticamente las cuatro fases fijas**: Validación, Pre-Construcción, Construcción y Cierre, en ese orden.
- Cada `Phase` tiene fechas planificadas (inicio/fin) y fechas reales, todas opcionales al inicio.
- El proyecto tiene una **fase activa**, que es un puntero a una de sus fases. "Estado del proyecto" y "fase activa" son la misma cosa (más el indicador de archivado).
- Cambiar la fase activa es una acción del PM y queda trazada (quién, cuándo, de qué fase a cuál).
- En el MVP, el cambio de fase **no bloquea funcionalidades** (regla suave): sirve de contexto para el dashboard, los registros y los informes. Endurecer reglas por fase (p. ej. "el presupuesto base solo se aprueba al cerrar Pre-Construcción") queda anotado para specs posteriores.

### Cómo debería funcionar

Desde `/projects`, el usuario ve los proyectos donde participa. Al seleccionar uno, entra en su vista general.

**Creación de proyectos (MVP):** cualquier usuario autenticado puede crear un proyecto. Quien lo crea queda asignado automáticamente como `Agent` con rol **Project Manager** de ese proyecto. No hace falta un rol global de administrador.

El flujo de creación no debería limitarse a “nombre y descripción”. Para que el resto de la aplicación funcione, el proyecto necesita un setup inicial:

1. datos generales;
2. fase inicial (por defecto, Validación);
3. agentes participantes;
4. roles de cada agente;
5. condiciones económicas de FRC;
6. presupuesto objetivo, aunque inicialmente pueda estar vacío;
7. configuración de permisos.

### Acciones principales

- Crear proyecto.
- Editar datos generales.
- Cambiar fase activa.
- Añadir agentes.
- Asignar roles.
- Configurar condiciones FRC.
- Archivar/cerrar proyecto.

### Lógica de negocio

La gestión de proyecto debe actuar como módulo de inicialización. No tiene mucho valor aislado, pero desbloquea todo lo demás.

Ejemplo:

Antes de imputar costes reales, debe existir:

- proyecto;
- presupuesto;
- partidas;
- agente constructor o PM con permisos.

Antes de calcular FRC, debe existir:

- presupuesto objetivo;
- agentes con porcentaje de reparto;
- honorarios garantizados y honorarios en riesgo;
- costes reales o previsión a cierre.

---

## 9.3 Módulo 3 — Agentes, roles y condiciones FRC *(briefing: Módulo 2, parte de configuración)*

### Finalidad

Modelar quién participa en el proyecto y cómo se vincula económicamente al resultado.

### Qué es un agente

Un `Agent` es una participación dentro de un proyecto. Puede representar a una empresa o a un usuario concreto, según el nivel de detalle que se implemente.

En el MVP puede ser suficiente con:

- nombre del agente;
- rol;
- usuario asociado;
- organización;
- porcentaje de reparto del FRC;
- honorarios base;
- honorarios en riesgo;
- estado activo/inactivo.

### Por qué es importante

El FRC no se puede calcular si no se sabe:

- quién participa;
- qué porcentaje de reparto tiene;
- cuánto tiene en riesgo;
- qué honorarios están garantizados;
- qué límites de pérdida o bonus aplican.

Los permisos tampoco se pueden aplicar si no se sabe qué rol tiene cada agente.

### Cómo debería funcionar

En la vista de agentes, el PM configura el equipo IPD del proyecto.

Ejemplo (datos ficticios):

```txt
Promotor: Promotora Levante
  Rol: Promotor
  Reparto FRC: 33%
  Aportación al fondo: dato contractual informativo (no entra en el cálculo del MVP)

Constructor: Construcciones Turia
  Rol: Constructor
  Reparto FRC: 58%
  Honorarios base: 1.200.000 €
  Honorarios en riesgo: 600.000 €

Proyectista: Estudio Albor
  Rol: Proyectista
  Reparto FRC: 9%
  Honorarios base: 200.000 €
  Honorarios en riesgo: 100.000 €
```

### Reglas funcionales

- La suma de porcentajes de reparto debe validarse (100%).
- Un agente puede tener 0% si no participa en FRC pero sí en el proyecto.
- El promotor no tiene "honorarios": su participación en el FRC se define solo por su porcentaje de reparto. Su aportación al fondo es un dato contractual informativo en el MVP (no entra en `calculateFRC()`); las reglas completas del promotor en el cálculo están en §9.5.
- Cambios de alcance pueden modificar honorarios y, opcionalmente, reponderar porcentajes.
- Debe quedar trazabilidad si se modifican condiciones FRC.

---

## 9.4 Módulo 4 — Control económico y presupuesto objetivo *(briefing: Módulo 3)*

### Finalidad

Gestionar el presupuesto objetivo, los costes reales y el avance físico del proyecto bajo lógica de Libros Abiertos.

Este es el módulo central del producto.

### Qué es el presupuesto objetivo

El presupuesto objetivo es la línea base económica pactada por el equipo. No es un precio cerrado tradicional. Es la referencia contra la que se compara el coste real y desde la que se calcula la desviación que alimenta el FRC.

### Estructura del presupuesto

El presupuesto debe organizarse en capítulos y partidas.

Ejemplo:

```txt
Budget
  Capítulo 01 — Acondicionamiento del terreno
    01.01 Excavación
    01.02 Rellenos
  Capítulo 02 — Cimentaciones
    02.01 Losa de cimentación
    02.02 Muros
  Capítulo 03 — Estructura
    03.01 Pilares
    03.02 Forjados
```

Cada `BudgetLine` puede tener:

- código;
- descripción;
- capítulo;
- unidad;
- cantidad;
- precio unitario;
- importe objetivo;
- importe ajustado vigente;
- coste real acumulado;
- previsión a cierre (ver regla por defecto más abajo);
- desviación;
- porcentaje de avance (con autor y fecha de última actualización);
- marca de contingencia si aplica.

### Carga del presupuesto

Para el MVP, el presupuesto puede cargarse de dos formas:

1. manualmente mediante formularios;
2. importando un Excel con formato controlado.

No es obligatorio soportar `.bc3` en el prototipo inicial, aunque el dominio real lo contempla.

### Presupuesto base y ajustes

El presupuesto aprobado debe conservarse como base inmutable. Los cambios aprobados generan ajustes.

Ejemplo:

```txt
BudgetLine 02.01 Losa de cimentación
  Base aprobada: 500.000 €
  Ajuste cambio CHG-003: +25.000 €
  Ajuste cambio CHG-011: -10.000 €
  Presupuesto vigente: 515.000 €
```

Esto permite que la plataforma muestre tanto la foto actual como el historial que la explica.

### Imputación de costes reales

Un `RealCost` representa un coste real imputado a una partida.

Debe incluir:

- partida destino;
- fecha;
- importe;
- descripción;
- agente que lo registra;
- documento asociado si existe;
- origen: factura, albarán, certificación, ajuste manual, materialización de riesgo, etc.;
- estado si se necesita validación.

### Anulación de imputaciones

Los `RealCost` son **inmutables**: no se editan ni se borran (§8.8). Si una imputación es errónea:

1. el PM la anula creando un **contra-asiento**: un `RealCost` de tipo `reversal`, signo contrario, vinculado al original, con motivo obligatorio;
2. el original no se modifica; "anulado" es una condición derivada (tener contra-asiento vinculado) que la UI muestra tachando el apunte;
3. el coste real acumulado es la suma de **todos** los asientos (los contra-asientos restan), de modo que las funciones de cálculo suman sin casos especiales;
4. ambas filas quedan visibles en el historial de la partida (Libros Abiertos: la corrección también se ve);
5. si procede, se crea la imputación correcta.

### Avance físico y valor ganado (EV)

El avance físico es la pieza que conecta el control económico con el EVM. Sin él no hay EV, y sin EV no hay CV ni CPI (§8.7).

- **Quién:** el constructor o el PM.
- **Dónde:** en el detalle de partida, acción "Actualizar avance".
- **Qué:** un porcentaje de 0 a 100 por partida, con autor y fecha de última actualización. El MVP guarda el último valor; el histórico completo de avances queda como ampliación.
- **Cómo se usa:**

```txt
EV de partida   = presupuesto vigente de la partida × % avance
EV del proyecto = Σ EV de partidas
```

- El avance **no se infiere de los costes**: gastar no es avanzar. La app no rellena avance automáticamente.
- Si ninguna partida tiene avance registrado, el dashboard muestra los indicadores EVM dependientes (EV, CV, CPI, EAC, ETC, VAC) como "sin datos de avance", igual que hace con PV cuando no hay planificación.

### Previsión a cierre

La previsión a cierre (forecast) es lo que el equipo estima que costará cada partida al final. Es el dato contra el que el FRC proyecta resultados. **Regla del MVP:**

```txt
Previsión de partida = max(coste real acumulado, presupuesto vigente de la partida)
                       salvo que exista una previsión manual, que tiene prioridad
Previsión del proyecto = Σ previsiones de partida
```

Consecuencias de esta regla:

- una partida sin costes se prevé a su presupuesto vigente (conservador: lo no gastado se gastará según presupuesto);
- una partida que **supera** su presupuesto empuja la previsión hacia arriba inmediatamente, y el FRC reacciona en el momento (demostrable en demo);
- el constructor o PM pueden afinar la previsión manualmente partida a partida cuando tengan mejor información.

### Cómo debería funcionar en pantalla

El usuario entra en `Control económico` y ve una tabla agrupada por capítulos.

Cada fila muestra:

```txt
Código | Partida | Presupuesto base | Ajustes | Presupuesto vigente | Coste real | Avance % | Previsión cierre | Desviación € | Desviación %
```

Al clicar en una partida, se abre un panel lateral o vista de detalle con:

- datos de la partida;
- costes imputados (incluidas anulaciones);
- cambios que la afectan;
- riesgos asociados;
- avance físico y su última actualización;
- previsión a cierre (default o manual);
- documentos vinculados;
- historial.

Si el constructor o PM pulsa “Imputar coste”, rellena formulario:

```txt
Partida: 02.01 Losa de cimentación
Importe: 12.500 €
Fecha: 2026-06-11
Descripción: Certificación parcial estructura
Documento: factura.pdf
```

Al guardar:

1. se crea `RealCost`;
2. se actualiza el coste real acumulado de la partida;
3. se recalculan desviaciones y previsión a cierre (regla por defecto);
4. se invalidan consultas del dashboard;
5. se recalcula FRC;
6. el usuario ve el impacto actualizado.

### Alertas de desviación

La tabla debe resaltar partidas con desviación significativa.

Ejemplo:

- desviación menor al 5%: normal;
- desviación entre 5% y 10%: atención;
- desviación mayor al 10%: alerta.

Los umbrales deben ser configurables en proyecto o definidos inicialmente como constantes (decisión pendiente, §20).

### Contingencias

Las contingencias son una reserva explícita. No deben confundirse con margen oculto.

El módulo debe mostrar:

- contingencia presupuestada;
- contingencia consumida;
- contingencia disponible;
- riesgos activos ponderados;
- cambios tipo 2 cargados contra contingencia;
- eventos que consumieron contingencia.

Un cambio tipo 2 puede tener dos destinos:

1. consumir contingencia;
2. ajustar presupuesto objetivo.

Esa decisión la registra el PM al aprobar el cambio.

---

## 9.5 Módulo 5 — FRC: Fondo de Riesgo Compartido *(briefing: dentro de los Módulos 3 y 4)*

### Finalidad

Mostrar el mecanismo de bonus/malus del contrato IPD.

El FRC es el corazón diferencial del producto. Es lo que permite que los agentes entiendan cómo la situación actual del proyecto afecta a su resultado económico.

### Qué debe responder

La pantalla o bloque FRC debe responder:

- ¿cuál es el presupuesto objetivo vigente?
- ¿cuál es el coste real o coste previsto a cierre?
- ¿hay ahorro o sobrecoste?
- ¿cómo se reparte ese ahorro o sobrecoste?
- ¿qué bonus o malus corresponde a cada agente?
- ¿cuánto tiene en riesgo cada uno?
- ¿cuál es el resultado total proyectado?

### Cálculo conceptual

A nivel simplificado:

```txt
Desviación = Presupuesto vigente - Coste previsto a cierre
```

donde el coste previsto a cierre sigue la regla por defecto de §9.4 si no hay previsión manual.

Si la desviación es positiva, hay ahorro. Si es negativa, hay sobrecoste.

Ese resultado se reparte según porcentajes del FRC, aplicando límites según honorarios en riesgo.

```txt
Resultado agente = Honorarios garantizados + bonus/malus FRC
```

### Reglas de reparto y límites

Estas reglas son parte del contrato de `calculateFRC()` y de sus tests:

1. **Ahorro (bonus):** se reparte según el porcentaje de cada agente. El MVP no aplica tope de bonus (si el contrato real pactara un tope, sería una ampliación).
2. **Sobrecoste (malus) de constructor y proyectista:** cada uno asume su porcentaje del sobrecoste **hasta agotar sus honorarios en riesgo**. Ese es su límite máximo de pérdida.
3. **Sobrecoste del promotor:** asume su porcentaje **sin límite**. Es quien paga la obra; su "riesgo" no está acotado por honorarios.
4. **Exceso tras agotar el fondo:** si el sobrecoste asignado a constructor o proyectista supera sus honorarios en riesgo, el exceso **lo absorbe el promotor**. El fondo en riesgo es finito; el coste de la obra no.
5. **Agente con 0% de reparto:** no recibe bonus ni malus.
6. **Aportación del promotor al fondo:** dato contractual informativo en el MVP; no altera el cálculo.
7. Todos los cálculos en céntimos enteros; los repartos se redondean al céntimo y la suma de repartos debe cuadrar con la desviación total (el ajuste de redondeo se asigna de forma determinista, p. ej. al agente de mayor porcentaje).

### Vista por rol (regla cerrada, viene del briefing)

- **Proyectista y constructor:** ven **solo su propio resultado** del FRC. No ven el de los demás.
- **Promotor y PM:** ven el cuadro completo (todos los agentes).
- **Observador:** no ve resultados individuales del FRC (puede ver el estado agregado del fondo: bonus/neutro/malus).

### Estado visual

El dashboard puede representar el FRC como:

- estado en bonus;
- estado neutro;
- estado en malus;
- riesgo de agotamiento del fondo;
- evolución respecto a último periodo;
- reparto por agente (solo para quien puede verlo).

### Por qué no se edita manualmente

El FRC debe calcularse desde datos fuente. Si se edita manualmente, se pierde confianza en el sistema.

Los datos fuente son:

- presupuesto vigente;
- costes reales;
- previsiones (manuales o por regla default);
- condiciones de agentes;
- cambios aprobados.

### Tests obligatorios

`calculateFRC()` debe tener tests unitarios con casos conocidos:

- ahorro repartido entre agentes;
- sobrecoste repartido;
- límite de pérdida por honorarios en riesgo;
- **sobrecoste que agota los honorarios en riesgo de un agente y cuyo exceso absorbe el promotor;**
- **previsión a cierre por defecto (sin previsión manual) y con previsión manual que la sustituye;**
- agente sin participación (0%);
- redondeos al céntimo que cuadran con la desviación total;
- cambio de alcance que repondera porcentajes.

---

## 9.6 Módulo 6 — Dashboard de KPIs *(briefing: Módulo 4)*

### Finalidad

Dar una visión ejecutiva del proyecto con datos reales del sistema.

No debe ser un dashboard decorativo con datos inventados. Debe alimentarse de presupuesto, costes reales, avance, riesgos, cambios, restricciones y planificación.

### Qué debe ver el usuario al entrar

El dashboard debe funcionar como portada del proyecto. Al entrar, el usuario debe entender:

- estado general del proyecto;
- fase activa;
- coste objetivo;
- coste real;
- desviación;
- estado FRC;
- riesgos activos;
- cambios pendientes;
- restricciones abiertas;
- principales alertas.

### Indicadores económicos

Indicadores mínimos:

- presupuesto objetivo vigente;
- coste real acumulado;
- previsión a cierre;
- desviación estimada;
- grado de desviación;
- contingencia presupuestada;
- contingencia consumida;
- contingencia disponible;
- impacto acumulado de cambios aprobados.

### Indicadores FRC

- resultado FRC actual;
- bonus/malus del usuario autenticado;
- honorarios garantizados;
- honorarios en riesgo;
- resultado total proyectado;
- estado general del fondo.

### Indicadores EVM

El módulo debe calcular, cuando haya datos suficientes:

- PV — Planned Value;
- EV — Earned Value;
- AC — Actual Cost;
- CV — Cost Variance;
- SV — Schedule Variance;
- CPI — Cost Performance Index;
- SPI — Schedule Performance Index;
- EAC — Estimate at Completion;
- ETC — Estimate to Complete;
- VAC — Variance at Completion.

#### Fórmulas exactas (contrato de `calculateEVM()`)

```txt
BAC = presupuesto vigente total del proyecto
PV  = valor planificado acumulado a la fecha (curva de planificación valorada, §9.11)
EV  = Σ (presupuesto vigente de partida × % avance)          ← del avance físico, §9.4
AC  = coste real acumulado (los contra-asientos restan)

CV  = EV - AC
SV  = EV - PV
CPI = EV / AC
SPI = EV / PV
EAC = BAC / CPI
ETC = EAC - AC
VAC = BAC - EAC
```

#### Reglas de cálculo (cierran las ambigüedades para TDD)

- Los importes (BAC, PV, EV, AC, CV, SV, EAC, ETC, VAC) se calculan en **céntimos enteros**; EAC y derivados se redondean al céntimo. CPI y SPI son ratios adimensionales (presentación con 2 decimales; la precisión exacta la fijan los tests).
- **EV** sale del avance físico por partida (§9.4), **no** de la planificación. Con avance registrado, CV y CPI están disponibles aunque no haya planificación.
- Si **ninguna partida tiene avance** registrado → EV "sin datos" → CV, CPI, EAC, ETC y VAC "sin datos".
- Si **AC = 0** → CPI "sin datos" (división por cero) → EAC, ETC y VAC "sin datos". CV sí se calcula (CV = EV).
- Si **no hay planificación valorada o PV = 0** → PV, SV y SPI "sin datos de planificación".
- "Sin datos" es un estado explícito del resultado de `calculateEVM()`, nunca un 0 silencioso. El dashboard no inventa datos: cero datos = estado "sin datos", no números de ejemplo.

### Indicadores de riesgos

- riesgos activos;
- riesgos de impacto alto;
- riesgos materializados;
- coste ponderado total;
- contingencia necesaria estimada;
- evolución respecto al periodo anterior.

### Indicadores de cambios

- cambios propuestos;
- cambios evaluados;
- cambios aprobados;
- cambios rechazados;
- impacto económico aprobado;
- impacto pendiente de aprobación;
- cambios de alcance con modificación de honorarios.

### Indicadores de restricciones

- restricciones abiertas;
- restricciones vencidas;
- restricciones resueltas;
- tiempo medio de resolución.

### Vista diferenciada

El dashboard no es idéntico para todos.

Promotor:

- ve inversión total;
- ve costes privados;
- ve costes IPD;
- ve estado de FRC completo (todos los agentes);
- ve impacto global.

Constructor:

- ve costes compartidos;
- puede ver alertas de partidas;
- ve su propio FRC (solo el suyo);
- no ve costes privados del promotor.

Proyectista:

- ve estado compartido;
- ve su propio FRC (solo el suyo);
- ve cambios y decisiones que afectan diseño;
- no ve costes privados del promotor.

PM:

- ve vista de control más completa (incluido el cuadro FRC completo);
- ve pendientes de gestión;
- ve cambios por aprobar;
- ve restricciones abiertas;
- ve incidencias pendientes.

### Interacción

Cada tarjeta del dashboard debe permitir ir al detalle.

Ejemplos:

- Clicar en “Cambios pendientes” abre módulo de cambios filtrado por estado.
- Clicar en “Desviación de presupuesto” abre control económico con partidas desviadas.
- Clicar en “Riesgos activos” abre registro de riesgos.
- Clicar en “Restricciones abiertas” abre planificación/restricciones.

---

## 9.7 Módulo 7 — Registro de riesgos y oportunidades *(briefing: Módulo 5)*

### Finalidad

Registrar, cuantificar y seguir riesgos y oportunidades desde fases tempranas.

En IPD, los riesgos no son solo una lista de problemas: alimentan la definición de contingencias y ayudan a explicar por qué se reserva presupuesto.

### Qué es un riesgo

Un `Risk` representa un evento incierto que puede tener impacto en el proyecto.

Puede incluir:

- título;
- descripción;
- tipo: riesgo u oportunidad;
- fase;
- probabilidad;
- impacto económico;
- impacto en plazo;
- coste ponderado;
- estrategia: evitar, transferir, mitigar, aceptar;
- responsable;
- estado: **Activo, Materializado o Cerrado** (nomenclatura del briefing; un estado "Mitigado" adicional queda anotado como posible ampliación, pero el MVP mantiene los tres estados para que la nomenclatura sea comparable entre los tres prototipos);
- fecha de revisión;
- comentarios/historial.

### Cómo se usa

En fase de Validación se crean riesgos iniciales. Durante Pre-Construcción y Construcción se actualizan. El dashboard compara la contingencia disponible con el coste ponderado de riesgos activos.

### Flujo de materialización

Si un riesgo se materializa:

1. se cambia su estado a Materializado;
2. se registra el coste real o estimado asociado;
3. se decide si consume contingencia;
4. puede generarse una imputación de coste real;
5. puede registrarse una decisión vinculada;
6. el dashboard actualiza riesgos y contingencias.

### Ejemplo

```txt
Riesgo: Aparición de roca no prevista en excavación
Probabilidad: 30%
Impacto estimado: 100.000 €
Coste ponderado: 30.000 €
Estrategia: Mitigar
Responsable: Constructor
Estado: Activo
```

Si aparece la roca y se aprueba tratarlo como cambio tipo 2 o coste contra contingencia, el riesgo deja de ser una amenaza abstracta y se conecta con control económico.

---

## 9.8 Módulo 8 — Incidencias *(briefing: Módulo 6, parte de incidencias)*

### Finalidad

Registrar problemas operativos, dudas, bloqueos o necesidades de aclaración que aparecen durante el proyecto.

Este módulo debe funcionar como una lista viva de asuntos pendientes vinculada a reuniones y responsables.

### Qué es una incidencia

Una `Incident` representa algo que requiere seguimiento.

Ejemplos:

- falta información en un plano;
- hay contradicción entre documentos;
- una partida necesita aclaración;
- falta decisión del promotor;
- una restricción impide avanzar;
- una factura no puede validarse;
- un comparativo necesita revisión.

### Datos mínimos

- título;
- descripción;
- fecha de creación;
- responsable;
- fecha prevista de resolución;
- estado: abierta, en curso, cerrada;
- prioridad;
- módulo vinculado;
- partida vinculada si aplica;
- cambio vinculado si aplica;
- decisión vinculada si aplica;
- comentarios.

### Cómo debería funcionar

El usuario entra en incidencias y ve una lista filtrable **y buscable por texto libre** (sobre título y descripción). El briefing exige búsqueda de texto libre tanto en incidencias como en decisiones; no basta con filtros.

Puede filtrar por:

- abiertas;
- asignadas a mí;
- vencidas;
- alta prioridad;
- vinculadas a presupuesto;
- vinculadas a cambio;
- cerradas.

Al clicar una incidencia, se abre su detalle con historial y decisiones asociadas.

### Relación con reuniones

Aunque no se implemente un módulo completo de reuniones, las incidencias deben poder alimentar un orden del día:

```txt
Incidencias abiertas para próxima reunión
- INC-012 Falta definición de acabado en baños
- INC-018 Pendiente validación de comparativo carpintería
- INC-021 Revisión de coste de certificación energética
```

---

## 9.9 Módulo 9 — Decisiones *(briefing: Módulo 6, parte de decisiones)*

### Finalidad

Crear una memoria consultable de decisiones relevantes del proyecto.

La trazabilidad de decisiones es uno de los dolores reales del cliente. No basta con saber el estado actual; hay que poder encontrar por qué se llegó ahí.

### Qué es una decisión

Una `Decision` representa una decisión formal tomada durante el proyecto.

Puede venir de:

- una reunión;
- una aprobación de cambio;
- una adjudicación;
- una alternativa de diseño;
- una incidencia;
- una revisión de riesgo;
- una actualización de planificación;
- una validación de comparativo.

### Comparativos de adjudicación (alcance MVP)

Los comparativos (documento que presenta en paralelo las ofertas de varios proveedores para una misma partida, que todos los agentes validan antes de adjudicar) **no tienen módulo propio en el MVP** (§19). Se representan así:

- la adjudicación se registra como una `Decision` con contexto "adjudicación";
- el documento del comparativo se adjunta a esa decisión (módulo documental ligero, §9.12);
- la decisión se vincula a la partida o partidas afectadas.

Esto cubre la trazabilidad ("¿por qué se adjudicó a X?") sin construir el flujo completo de validación colaborativa de ofertas, que queda para fases posteriores.

### Datos mínimos

- título;
- descripción;
- fecha;
- órgano o contexto: Comisión Ejecutiva, Comisión Senior, reunión semanal, adjudicación, etc.;
- quién la registra;
- agentes implicados;
- motivo;
- alternativas consideradas si aplica;
- impacto económico;
- impacto en plazo;
- vínculos a incidencias, cambios, riesgos, partidas o documentos;
- acta o referencia documental.

### Cómo debería funcionar

Debe existir una vista buscable por texto libre:

```txt
Buscar: "baños industrializados"
Resultado:
- DEC-008 Se descarta baño industrializado por coste adicional >170.000 €
- CHG-004 Cambio de acabado en baños
- INC-021 Pendiente decisión sobre plato de ducha
```

La búsqueda no necesita IA en el MVP. Puede ser texto libre simple sobre título y descripción.

### Decisiones automáticas desde otros módulos

Algunos módulos deben crear decisiones automáticamente o sugerirlas.

Ejemplo:

- al aprobar un cambio, se crea una `Decision` vinculada;
- al materializar un riesgo y consumir contingencia, se crea una `Decision` o se solicita referencia a una existente;
- al modificar planificación aceptada, se registra una `Decision`.

---

## 9.10 Módulo 10 — Gestión de cambios *(briefing: Módulo 7)*

### Finalidad

Gestionar propuestas de cambio y aplicar sus efectos económicos de forma controlada, trazable y coherente con IPD.

Este es uno de los módulos más importantes y delicados.

### Tipos de cambio

#### Tipo 1 — Incidental

Cambio menor sin impacto económico ni en KPIs.

Ejemplo:

- cambiar color de revestimiento sin coste relevante;
- ajustar una solución menor dentro del alcance previsto.

Efecto:

```txt
Sin ajuste de presupuesto
Sin ajuste de honorarios
Sin cambio FRC
Solo registro y trazabilidad
```

#### Tipo 2 — Impacto en coste

Cambio que aumenta o reduce coste, pero no modifica alcance ni honorarios. Los ajustes pueden ser positivos o negativos (un cambio puede abaratar).

Ejemplo:

- condición imprevista de terreno;
- partida más cara por circunstancia externa;
- coste adicional que no implica más trabajo de diseño ni más plazo.

Efecto posible:

```txt
Opción A: consume contingencia
Opción B: ajusta presupuesto objetivo
FRC se recalcula según decisión
Honorarios no cambian
```

#### Tipo 3 — Cambio de alcance

Cambio sustancial decidido por el promotor o por el equipo que modifica alcance, presupuesto y posiblemente honorarios.

Ejemplo:

- añadir una planta;
- cambiar uso del edificio;
- introducir calidades superiores;
- cambio de programa que exige rediseño y nueva valoración.

Efecto:

```txt
Ajusta presupuesto objetivo
Puede actualizar honorarios
Puede reponderar FRC
Crea decisión formal
Recalcula indicadores
```

### Estados del flujo

Flujo mínimo:

```txt
Propuesto → Evaluado → Aprobado
                    ↘ Rechazado
```

Puede ampliarse más adelante con:

```txt
Borrador → Propuesto → En evaluación → Pendiente Comisión → Aprobado/Rechazado → Aplicado
```

Para MVP, conviene mantenerlo simple.

### Quién hace qué

- Cualquier agente del núcleo puede proponer un cambio.
- El PM transiciona estados en la aplicación.
- La Comisión Ejecutiva toma la decisión real.
- Al aprobar, el PM referencia la reunión o acta.
- La app aplica los efectos dentro de una transacción.

### Datos mínimos de un cambio

- código;
- título;
- descripción;
- motivo;
- tipo;
- estado;
- partidas afectadas;
- impacto económico estimado;
- impacto plazo estimado;
- propuesta por;
- evaluado por;
- aprobado/rechazado por;
- referencia a reunión o decisión;
- destino económico si es tipo 2;
- ajustes por partida;
- cambios de honorarios si es tipo 3;
- reponderación FRC si aplica.

### Pantalla de cambios

La vista principal debe mostrar una tabla o tablero con:

```txt
Código | Título | Tipo | Estado | Impacto € | Impacto plazo | Propuesto por | Fecha | Acción
```

Filtros:

- pendientes de evaluación;
- pendientes de aprobación;
- aprobados;
- rechazados;
- por tipo;
- con impacto económico;
- con impacto en FRC.

### Detalle de cambio

Al clicar en un cambio, el usuario ve:

- descripción;
- motivo;
- tipo;
- partidas afectadas;
- evaluación económica;
- decisiones vinculadas;
- historial;
- efectos esperados si se aprueba;
- botón de transición si tiene permisos.

### Motor de cambios

La lógica de efectos vive en `applyChange()` como función pura. La API llama a esa función y persiste sus efectos dentro de una transacción.

Ejemplo de aprobación:

```txt
Cambio CHG-006: Mejora de acabado en fachada
Tipo: Scope Change
Impacto presupuesto: +120.000 €
Honorarios constructor: +8.000 €
Honorarios proyectista: +5.000 €
Reponderación FRC: no
```

Al aprobar:

1. se marca `Change` como aprobado;
2. se crea `Decision` vinculada;
3. se crean ajustes de presupuesto;
4. se actualizan honorarios si aplica;
5. se recalcula FRC;
6. el dashboard refleja el impacto.

---

## 9.11 Módulo 11 — Planificación básica y restricciones *(briefing: Módulo 8, opcional)*

### Finalidad

Registrar una planificación mínima y restricciones que afectan al avance.

Este módulo es menos diferencial que el control económico y el FRC, pero alimenta la parte temporal del EVM y Lean Construction.

### Planificación básica

La plataforma puede manejar tres líneas:

- planificación inicial;
- planificación aceptada o actualizada;
- avance real.

Para el MVP, no hace falta construir un MS Project. Puede ser suficiente con hitos, fechas y curva de valor planificado.

### Datos mínimos

- fase;
- hito;
- fecha planificada inicial;
- fecha planificada aceptada;
- fecha real;
- valor planificado asociado;
- avance;
- motivo de modificación.

### Relación con EVM

EVM necesita PV, EV y AC, y cada uno viene de un sitio distinto:

- **PV** sale de la planificación valorada (este módulo): la curva de cuánto debería llevarse gastado en cada momento.
- **EV** sale del **avance físico por partida** registrado en control económico (§9.4) — no de este módulo.
- **AC** sale de los costes reales imputados (§9.4).

Por eso, si este módulo no está implementado: PV, SV y SPI se muestran como "sin datos de planificación", pero **CV y CPI siguen disponibles** mientras haya avance físico registrado.

### Restricciones

Una restricción es una condición que debe resolverse antes de ejecutar una tarea.

Datos mínimos:

- descripción;
- responsable;
- fecha límite;
- estado;
- impacto si no se libera;
- tarea/hito relacionado;
- fecha de resolución.

### Pantalla de restricciones

Vista filtrable por:

- abiertas;
- vencidas;
- asignadas a mí;
- resueltas;
- por fase;
- por impacto.

El dashboard consume:

- número de restricciones abiertas;
- número de restricciones vencidas;
- tiempo medio de resolución.

---

## 9.12 Módulo 12 — Gestión documental ligera *(sin equivalente directo en briefing; soporte transversal)*

### Finalidad

No es el módulo diferencial del MVP, pero muchos datos necesitan evidencia documental: facturas, actas, comparativos, informes, documentos de decisión.

### Enfoque recomendado para MVP

No construir un CDE completo. Implementar una capa documental ligera vinculada a entidades.

Ejemplos:

- una factura vinculada a `RealCost`;
- un acta vinculada a `Decision`;
- un comparativo vinculado a `Decision` (adjudicación) o `Change`;
- un Excel vinculado a importación de presupuesto;
- un PDF vinculado a riesgo o incidencia.

### Datos mínimos de documento

- nombre;
- tipo;
- entidad vinculada;
- fecha subida;
- subido por;
- ruta o identificador de almacenamiento;
- versión simple si aplica.

### Qué no hacer al inicio

- visor BIM;
- versionado documental complejo;
- flujos ISO 19650 completos;
- gestión avanzada de carpetas;
- permisos documentales demasiado granulares.

---

## 9.13 Módulo 13 — Informes y exportaciones *(sin equivalente directo en briefing; soporte)*

### Finalidad

Permitir obtener una salida resumida del estado del proyecto.

Los informes mensuales reales del dominio muestran que el producto debe acabar pudiendo generar o alimentar informes periódicos. Para MVP, basta con que el dashboard y las tablas puedan consultarse y quizás exportarse.

### Posible alcance inicial

- exportar presupuesto y desviaciones a CSV/Excel;
- exportar listado de cambios;
- exportar riesgos;
- generar vista imprimible del dashboard;
- preparar estructura para informe mensual.

### Alcance posterior

- informe mensual automático;
- comparativas entre periodos;
- anexos gráficos;
- narrativa semiautomática;
- integración Power BI.

---

## 9.14 Módulo 14 — Capa IA básica *(briefing: Módulo 9, opcional)*

### Finalidad

Detectar o explicar desviaciones usando los datos ya estructurados en la plataforma.

No debe ser el centro del MVP inicial. La capa IA tiene sentido cuando la plataforma ya tiene datos fiables.

### Ejemplos futuros

- “El CPI lleva tres semanas por debajo de 0,85.”
- “La contingencia disponible no cubre el coste ponderado de riesgos activos.”
- “Este cambio de alcance agota el margen del FRC del constructor.”
- “Hay 6 incidencias vencidas vinculadas a decisiones de fachada.”

### Regla

La IA no debe inventar datos. Solo interpreta datos existentes.

---

# 10. Flujos principales de usuario

## 10.0 Flujo 0 — Preparar usuarios y datos semilla (seed)

### Objetivo

Tener un entorno de demo reproducible sin pantallas de administración: usuarios de cada rol y un proyecto de ejemplo coherente.

### Pasos

1. El desarrollador ejecuta el script de seed (`pnpm seed` o equivalente, se define en spec).
2. El script crea cinco usuarios, uno por rol: promotor, proyectista, constructor, PM y observador.
3. El script crea el proyecto demo "Hotel Azahar" (el escenario del §17) con sus agentes, condiciones FRC y presupuesto con al menos tres capítulos.
4. Las credenciales de demo quedan documentadas en el README (solo para entorno local).

### Resultado esperado

Cualquier evaluador puede clonar el repo, seguir el README, ejecutar el seed y hacer login con cualquiera de los cinco roles. La verificación del briefing ("crear dos usuarios con roles distintos y comprobar qué ven en la misma URL") es inmediata.

### Criterios de aceptación conceptuales

- El seed es re-ejecutable (regenera el estado de demo sin duplicar datos).
- No hay credenciales hardcodeadas en el código de la aplicación; las de seed son datos de demo documentados.
- El proyecto demo cuadra con el ejemplo narrativo del §17 (sirve también para tests de aceptación).

---

## 10.1 Flujo A — Crear proyecto IPD y configurar agentes

### Objetivo

Crear un proyecto operativo con agentes, roles y condiciones FRC.

### Pasos

1. Un usuario autenticado entra en la plataforma.
2. Pulsa “Nuevo proyecto” (cualquier usuario autenticado puede; quien crea queda como PM del proyecto).
3. Introduce nombre, descripción, fase inicial y fechas.
4. Añade agentes: promotor, proyectista, constructor, PM, observador.
5. Asigna usuarios a cada agente.
6. Configura porcentajes de reparto FRC (la suma debe dar 100%).
7. Introduce honorarios base y honorarios en riesgo.
8. Guarda.
9. La plataforma crea el proyecto con sus cuatro fases.
10. El dashboard aparece en estado “sin presupuesto cargado”.

### Resultado esperado

El proyecto existe, los usuarios pueden acceder según rol, y el sistema ya sabe quién participa en el FRC.

### Criterios de aceptación conceptuales

- La suma de porcentajes se valida.
- Un usuario sin rol no ve el proyecto.
- El promotor ve su área privada.
- Constructor/proyectista no ven área privada del promotor.

---

## 10.2 Flujo B — Cargar presupuesto objetivo

### Objetivo

Crear la línea base económica del proyecto.

### Pasos

1. PM entra en Control económico.
2. Pulsa “Cargar presupuesto”.
3. Elige carga manual o Excel.
4. El sistema valida capítulos, códigos, importes y formato.
5. El usuario revisa previsualización.
6. Confirma carga.
7. El presupuesto queda aprobado como base.
8. El dashboard muestra presupuesto objetivo.

### Resultado esperado

El proyecto ya tiene `Budget` y `BudgetLine`. Todavía no hay coste real, por lo que la desviación está a cero o sin datos reales.

### Criterios de aceptación conceptuales

- El presupuesto base no se modifica después directamente.
- Las partidas se pueden consultar agrupadas por capítulos.
- Los importes se guardan en céntimos.
- La carga queda trazada.

---

## 10.3 Flujo C — Imputar coste real, registrar avance y ver impacto en FRC y EVM

### Objetivo

Registrar un coste real y el avance físico, y comprobar cómo afectan a desviaciones, FRC y EVM.

### Pasos

1. Constructor entra en Control económico.
2. Busca una partida.
3. Abre detalle de partida.
4. Pulsa “Imputar coste”.
5. Introduce importe, fecha, descripción y documento si existe.
6. Guarda.
7. La API crea `RealCost`.
8. El frontend invalida consultas con TanStack Query.
9. La tabla de presupuesto actualiza coste real acumulado y previsión a cierre (regla por defecto).
10. El dashboard actualiza desviación y FRC.
11. El constructor pulsa “Actualizar avance” y registra el % de avance físico de la partida.
12. El dashboard recalcula EV, CV y CPI con el nuevo avance.

### Resultado esperado

El usuario ve que el coste imputado y el avance ya están reflejados en:

- partida;
- capítulo;
- control económico global;
- FRC;
- indicadores EVM (CV/CPI);
- dashboard.

### Criterios de aceptación conceptuales

- El constructor puede imputar costes y registrar avance.
- Un observador no puede imputar costes ni registrar avance.
- El FRC se recalcula con datos reales.
- CV y CPI se calculan sin necesidad de planificación.
- No hay datos inventados en frontend.

### Variante: corregir una imputación errónea

1. El PM abre el detalle de la partida y localiza la imputación errónea.
2. Pulsa “Anular” e indica el motivo (obligatorio).
3. La API crea el contra-asiento vinculado al original.
4. Ambos asientos quedan visibles en el historial; los acumulados, la previsión y el FRC se recalculan.

---

## 10.4 Flujo D — Registrar un riesgo y materializarlo

### Objetivo

Demostrar que los riesgos alimentan contingencias y pueden convertirse en impacto económico real.

### Pasos

1. Un agente registra un riesgo.
2. Introduce probabilidad e impacto.
3. El sistema calcula coste ponderado.
4. El dashboard actualiza “riesgos activos” y “contingencia necesaria estimada”.
5. Más adelante, el riesgo se materializa.
6. El PM cambia estado a Materializado.
7. Decide cargarlo contra contingencia o generar coste real vinculado.
8. Se crea una imputación económica o ajuste según flujo.
9. Se registra decisión vinculada.

### Resultado esperado

El riesgo deja de ser una nota aislada y pasa a explicar consumo de contingencia o coste real.

---

## 10.5 Flujo E — Proponer, evaluar y aprobar un cambio

### Objetivo

Demostrar la lógica diferencial de cambios IPD.

### Pasos

1. Un agente crea propuesta de cambio.
2. Indica motivo, descripción y partidas afectadas.
3. Estima impacto económico y en plazo.
4. El PM evalúa y clasifica: incidental, impacto en coste o cambio de alcance.
5. El PM registra la decisión de la Comisión Ejecutiva.
6. Si se aprueba, la app aplica efectos.
7. Se crea una `Decision` vinculada.
8. El presupuesto vigente se actualiza si corresponde.
9. Los honorarios se actualizan si corresponde.
10. El FRC se recalcula.
11. El dashboard muestra impacto acumulado.

### Resultado esperado

El usuario puede ver antes y después del cambio.

Ejemplo:

```txt
Antes:
Presupuesto vigente: 20.000.000 €
Coste previsto cierre: 20.100.000 €
FRC: malus moderado

Cambio aprobado tipo 3:
+500.000 € presupuesto
+20.000 € honorarios constructor
+10.000 € honorarios proyectista

Después:
Presupuesto vigente: 20.500.000 €
Coste previsto cierre: 20.600.000 €
FRC recalculado
```

---

## 10.6 Flujo F — Buscar una incidencia o decisión pasada

### Objetivo

Resolver el problema de trazabilidad. La búsqueda de texto libre cubre tanto decisiones como incidencias (requisito del briefing).

### Pasos

1. Usuario entra en Decisiones (o Incidencias).
2. Busca “baños”, “certificación”, “fachada”, “cambio alcance” o similar.
3. El sistema devuelve decisiones (o incidencias) relacionadas.
4. El usuario abre un resultado.
5. Ve contexto, fecha, motivo, agentes implicados, cambio/incidencia vinculada y documento de referencia.

### Resultado esperado

La plataforma permite reconstruir por qué se tomó una decisión sin buscar manualmente en actas dispersas.

---

## 10.7 Flujo G — Ver la misma URL con roles distintos

### Objetivo

Demostrar permisos reales.

### Pasos

1. Usuario promotor entra en `/projects/123/dashboard`.
2. Ve dashboard general + costes privados + inversión total.
3. Usuario constructor entra en la misma URL.
4. Ve dashboard compartido + su estado FRC.
5. No ve costes privados.
6. Si intenta llamar al endpoint privado, la API no devuelve datos.

### Resultado esperado

La diferencia de visibilidad no depende solo del frontend. La API y RLS protegen el dato.

---

# 11. División del producto en épicas para GitHub

Este documento puede convertirse directamente en épicas del panel. Cada épica lleva su prioridad (P0–P4, según §12) para que el panel se ordene directamente. Las épicas con cálculos críticos (6, 7 y 11) **arrancan por los tests** (rol `tdd-harness`): primero el test en rojo, después la implementación.

El modelo `AuditEvent` y su helper de registro nacen en la Epic 2; **cada épica posterior registra sus propios eventos** (§8.9) como parte de su definición de terminado.

## 11.1 Épicas recomendadas

### Epic 1 — Foundation & project shell `[P0]`

Incluye:

- setup Vite/React/TS;
- Express API;
- Prisma/PostgreSQL;
- configuración entorno;
- estructura de carpetas;
- layout base;
- React Router;
- TanStack Query;
- Mantine;
- README de arranque.

### Epic 2 — Auth, sessions & project roles `[P0]`

Incluye:

- usuarios;
- login/logout;
- sesiones PostgreSQL;
- cookies httpOnly;
- middleware sesión;
- roles por proyecto;
- RLS inicial;
- modelo `AuditEvent` y helper de registro de eventos;
- seed de usuarios de demo;
- vista protegida por rol.

### Epic 3 — Project setup & agents `[P1]`

Incluye:

- CRUD proyecto;
- fases (creación automática de las cuatro, fase activa, trazabilidad del cambio);
- agentes;
- condiciones FRC;
- validaciones de reparto;
- seed del proyecto demo;
- pantalla de configuración.

### Epic 4 — Budget & open books `[P1]`

Incluye:

- modelo `Budget` y `BudgetLine`;
- carga manual;
- importación Excel;
- tabla agrupada;
- detalle de partida;
- presupuesto base inmutable;
- ajustes derivados.

### Epic 5 — Real costs, progress & deviations `[P1]`

Incluye:

- modelo `RealCost`;
- imputación de coste;
- anulación con contra-asiento;
- registro de avance físico por partida;
- previsión a cierre (regla por defecto + override manual);
- acumulados por partida/capítulo;
- desviaciones;
- alertas;
- invalidación TanStack Query.

### Epic 6 — FRC calculation `[P1]` *(arranca por tests)*

Incluye:

- `calculateFRC()`;
- tests unitarios (incluidos límites de honorarios en riesgo y exceso absorbido por promotor);
- vista FRC con visibilidad por rol;
- integración con dashboard;
- resultado por agente.

### Epic 7 — EVM calculation `[P2]` *(arranca por tests)*

Incluye:

- `calculateEVM()`;
- tests unitarios;
- PV/EV/AC;
- CV/SV/CPI/SPI/EAC/ETC/VAC;
- estados "sin datos de avance" / "sin datos de planificación";
- integración dashboard.

### Epic 8 — Dashboard `[P1]`

Incluye:

- tarjetas económicas;
- tarjetas FRC;
- indicadores riesgos;
- indicadores cambios;
- indicadores restricciones;
- navegación al detalle;
- vista diferenciada por rol.

### Epic 9 — Risk register `[P2]`

Incluye:

- CRUD riesgo;
- coste ponderado;
- estrategias;
- estados (Activo/Materializado/Cerrado);
- materialización;
- vínculo con contingencias.

### Epic 10 — Incidents & decisions `[P2]`

Incluye:

- registro de incidencias;
- asignación;
- estados;
- búsqueda de texto libre en incidencias y decisiones;
- registro de decisiones;
- decisiones automáticas desde otros módulos;
- vínculos entre entidades.

### Epic 11 — Change engine `[P2]` *(arranca por tests)*

Incluye:

- modelo `Change`;
- flujo de estados;
- clasificación;
- `applyChange()`;
- tests unitarios;
- aprobación con decisión vinculada;
- ajustes presupuesto (positivos y negativos);
- destino dual del tipo 2 (contingencia o ajuste);
- cambio honorarios;
- reponderación FRC opcional.

### Epic 12 — Planning & restrictions `[P3]`

Incluye:

- hitos básicos;
- curva PV si se implementa;
- restricciones;
- estados;
- indicadores dashboard.

### Epic 13 — Lightweight documents `[P3]`

Incluye:

- adjuntos simples;
- vínculo a entidades;
- actas;
- facturas;
- comparativos como adjuntos de decisiones;
- evidencias.

### Epic 14 — Developer process & documentation `[transversal]`

Incluye:

- ADRs;
- SDD specs;
- diario desarrollo;
- README;
- tests;
- decisiones pendientes;
- playbook de aprendizajes.

---

# 12. Priorización funcional recomendada

## 12.1 Prioridad 0 — Base técnica mínima

Antes de módulos de negocio:

1. app React funcionando;
2. API Express funcionando;
3. PostgreSQL + Prisma;
4. sesión básica;
5. layout base;
6. test runner Vitest;
7. estructura de dominio;
8. seed de usuarios de demo.

## 12.2 Prioridad 1 — Demo IPD mínima

Debe permitir hacer una demo significativa:

1. crear proyecto;
2. configurar agentes y FRC;
3. cargar presupuesto;
4. imputar costes;
5. registrar avance físico;
6. calcular FRC;
7. mostrar dashboard económico;
8. demostrar permisos promotor vs constructor.

## 12.3 Prioridad 2 — Complejidad diferencial

Añade los flujos que muestran que no es un Excel:

1. gestión de cambios;
2. motor `applyChange()`;
3. EVM completo en dashboard;
4. decisiones vinculadas y búsqueda;
5. riesgos y contingencias;
6. impacto en dashboard.

## 12.4 Prioridad 3 — Gestión operativa

Mejora la utilidad diaria:

1. incidencias;
2. restricciones;
3. planificación básica;
4. documentos vinculados;
5. exportaciones.

## 12.5 Prioridad 4 — Valor añadido posterior

No es prioritario para el MVP:

1. gestión documental completa;
2. visor BIM;
3. IA avanzada;
4. informes automáticos complejos;
5. integración con ACC, Presto, Power BI o ERPs.

---

# 13. Arquitectura técnica asumida por las ADRs

> Esta sección **asume** lo decidido en `docs/adr/001` a `008`. No re-decide nada: si hay conflicto, manda el ADR.

## 13.1 Stack general

El proyecto se construye con:

- Node 20+;
- TypeScript strict;
- pnpm;
- React;
- Vite;
- Express;
- PostgreSQL;
- Prisma;
- Mantine;
- TanStack Query;
- React Router v7;
- Vitest.

## 13.2 Backend

La API vive bajo `/api` y se construye con Express.

Responsabilidades:

- autenticación;
- sesiones;
- permisos;
- validación de entrada;
- llamadas a Prisma;
- aplicación de transacciones;
- propagación de identidad a RLS;
- exposición de endpoints REST.

La lógica de negocio crítica no debe vivir dentro de rutas Express. Debe estar en funciones puras reutilizables y testeables.

## 13.3 Base de datos

PostgreSQL es la fuente de verdad.

Prisma se usa para:

- esquema;
- migraciones;
- cliente tipado;
- acceso a datos.

RLS actúa como red de seguridad en base de datos. La API aplica permisos primero, pero la base debe impedir fugas si un endpoint se implementa mal.

## 13.4 Frontend

React + Vite es la SPA.

Mantine resuelve:

- componentes;
- formularios;
- fechas;
- notificaciones;
- gráficas básicas;
- layout.

TanStack Query resuelve:

- datos de servidor;
- caché;
- reintentos;
- estados de carga;
- invalidación tras mutaciones.

React state nativo resuelve:

- modales;
- filtros locales;
- selecciones;
- estado UI sencillo.

## 13.5 Routing

React Router v7 resuelve navegación.

Las rutas protegidas deben comprobar:

- usuario autenticado;
- acceso al proyecto;
- rol en el proyecto;
- permisos por pantalla.

## 13.6 Testing

Vitest ejecuta tests.

Tests obligatorios:

- `calculateEVM()`;
- `calculateFRC()`;
- `applyChange()`.

Orden recomendado:

1. tests unitarios de funciones puras;
2. tests de integración de API para permisos y transacciones;
3. tests de componentes si la UI se estabiliza;
4. e2e solo si sobra tiempo.

---

# 14. Contrato funcional frontend-backend

## 14.1 Estilo de API

Frontend y backend se comunican mediante REST sobre HTTP JSON.

Ejemplos de endpoints conceptuales:

```txt
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/me

GET    /api/projects
POST   /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId          # incluye cambiar la fase activa

GET    /api/projects/:projectId/agents
POST   /api/projects/:projectId/agents
PATCH  /api/projects/:projectId/agents/:agentId

GET    /api/projects/:projectId/budget
POST   /api/projects/:projectId/budget/import
GET    /api/projects/:projectId/budget-lines/:budgetLineId
PATCH  /api/projects/:projectId/budget-lines/:budgetLineId/progress   # avance físico
PATCH  /api/projects/:projectId/budget-lines/:budgetLineId/forecast   # previsión manual

GET    /api/projects/:projectId/real-costs
POST   /api/projects/:projectId/real-costs
POST   /api/projects/:projectId/real-costs/:realCostId/void           # contra-asiento

GET    /api/projects/:projectId/frc
GET    /api/projects/:projectId/dashboard

GET    /api/projects/:projectId/risks
POST   /api/projects/:projectId/risks
PATCH  /api/projects/:projectId/risks/:riskId

GET    /api/projects/:projectId/incidents?q=texto                     # búsqueda texto libre
POST   /api/projects/:projectId/incidents
PATCH  /api/projects/:projectId/incidents/:incidentId

GET    /api/projects/:projectId/decisions?q=texto                     # búsqueda texto libre
POST   /api/projects/:projectId/decisions

GET    /api/projects/:projectId/changes
POST   /api/projects/:projectId/changes
POST   /api/projects/:projectId/changes/:changeId/evaluate
POST   /api/projects/:projectId/changes/:changeId/approve
POST   /api/projects/:projectId/changes/:changeId/reject

GET    /api/projects/:projectId/restrictions
POST   /api/projects/:projectId/restrictions
PATCH  /api/projects/:projectId/restrictions/:restrictionId

GET    /api/projects/:projectId/audit-events?entity=...&entityId=...  # historial transversal (opcional en MVP:
                                                                      # los detalles de entidad ya lo embeben)
```

## 14.2 Validación

Express no trae validación de datos de serie. Se debe decidir e implementar una librería de validación, probablemente Zod (decisión pendiente, §20).

La API debe validar:

- parámetros de ruta;
- body;
- permisos;
- estados permitidos;
- importes;
- porcentajes;
- coherencia de cambios.

## 14.3 Errores

La API debería devolver errores consistentes:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "No tienes permiso para ver los costes privados del promotor.",
    "details": {}
  }
}
```

Códigos útiles:

- `UNAUTHENTICATED`;
- `FORBIDDEN`;
- `NOT_FOUND`;
- `VALIDATION_ERROR`;
- `DOMAIN_ERROR`;
- `CONFLICT`;
- `INTERNAL_ERROR`.

---

# 15. Reglas de permisos por módulo

## 15.1 Matriz inicial (sin ambigüedades)

Cada celda es Sí o No. Donde antes había "limitado", ahora hay una regla concreta (las notas al pie). Esta matriz se traslada tal cual a las specs y a las políticas RLS.

| Acción | Promotor | Proyectista | Constructor | PM | Observador |
|---|---:|---:|---:|---:|---:|
| Ver proyecto | Sí | Sí | Sí | Sí | Sí |
| Editar proyecto (datos generales, fase) | No | No | No | Sí | No |
| Ver costes compartidos | Sí | Sí | Sí | Sí | Sí |
| Ver costes privados del promotor | Sí | No | No | Sí ¹ | No |
| Cargar presupuesto | No | No | No | Sí | No |
| Imputar coste real | No | No | Sí | Sí | No |
| Anular imputación (contra-asiento) | No | No | No | Sí | No |
| Registrar avance físico | No | No | Sí | Sí | No |
| Ajustar previsión a cierre manual | No | No | Sí | Sí | No |
| Ver FRC propio | Sí | Sí | Sí | Sí ² | No ³ |
| Ver FRC global (todos los agentes) | Sí | No | No | Sí | No |
| Crear riesgo | Sí | Sí | Sí | Sí | No |
| Crear incidencia | Sí | Sí | Sí | Sí | No |
| Crear propuesta de cambio | Sí | Sí | Sí | Sí | No |
| Evaluar/aprobar/rechazar cambio en app | No | No | No | Sí | No |
| Registrar decisión manual | No | No | No | Sí | No |
| Ver decisiones | Sí | Sí | Sí | Sí | Sí |
| Gestionar agentes del proyecto | No | No | No | Sí | No |

¹ El briefing da al PM "acceso completo a toda la información del proyecto". Si un proyecto real quisiera restringirlo, sería configuración post-MVP.
² Solo si el PM participa en el FRC con porcentaje > 0; si no, no tiene "resultado propio" que ver.
³ El observador no participa en el fondo; ve únicamente el estado agregado (bonus/neutro/malus) en el dashboard.

## 15.2 Principio principal

La mayoría de la información IPD es compartida. La excepción relevante es la información privada del promotor y ciertos permisos de edición.

No hay roles globales de plataforma: todo permiso nace del `Agent` que el usuario tiene en cada proyecto. Los usuarios se crean por seed en el MVP (§10.0).

---

# 16. Qué pantallas debería tener el MVP

## 16.1 Pantallas imprescindibles

### Login

Permite entrar al sistema con usuario real.

### Listado de proyectos

Muestra proyectos accesibles según usuario.

### Crear/editar proyecto

Permite crear proyecto y configurar datos básicos.

### Agentes y FRC setup

Permite configurar roles, porcentajes y honorarios. Accesible al PM.

### Dashboard

Muestra KPIs de coste, FRC, riesgos, cambios y restricciones.

### Presupuesto

Tabla de capítulos y partidas con importes.

### Detalle de partida

Costes reales (incluidas anulaciones), ajustes, desviaciones, previsión a cierre y actualización de avance físico.

### Imputar coste real

Formulario para crear `RealCost`.

### Cambios

Lista de cambios y detalle.

### Aprobar cambio

Formulario o acción para aplicar `applyChange()`.

### Riesgos

Registro de riesgos.

### Incidencias y decisiones

Registro y búsqueda de texto libre en ambos.

## 16.2 Pantallas secundarias

- planificación básica;
- restricciones;
- documentos vinculados;
- configuración avanzada;
- informes/exportación.

---

# 17. Ejemplo narrativo completo

Este ejemplo ayuda a visualizar la aplicación funcionando. **Es además el escenario oficial del seed de demo (§10.0)** y la base de los tests de aceptación. Todos los nombres y cifras son ficticios.

## 17.1 Setup inicial

Wise Build crea el proyecto “Hotel Azahar”.

Configura agentes:

- Promotor: Promotora Levante;
- Proyectista: Estudio Albor;
- Constructor: Construcciones Turia;
- PM: Vivare;
- Observador: invitado de seguimiento.

Define condiciones FRC:

- Promotor: 33%;
- Constructor: 58% (honorarios base 1.200.000 €, en riesgo 600.000 €);
- Proyectista: 9% (honorarios base 200.000 €, en riesgo 100.000 €).

Carga presupuesto objetivo:

```txt
Presupuesto objetivo: 20.000.000 €
Contingencias: 500.000 €
```

El dashboard muestra que el proyecto está sin costes reales imputados.

## 17.2 Primeras imputaciones

El constructor imputa:

```txt
Excavación: 80.000 €
Cimentación: 120.000 €
Estructura: 200.000 €
```

Y registra el avance físico de esas partidas. La tabla económica muestra coste real, avance y desviación por partida. El FRC empieza a calcular resultado provisional y el dashboard muestra CV y CPI.

## 17.3 Aparece un riesgo

Se registra riesgo:

```txt
Roca no prevista en excavación
Probabilidad: 30%
Impacto: 100.000 €
Coste ponderado: 30.000 €
```

El dashboard incrementa contingencia necesaria estimada.

## 17.4 El riesgo se materializa

La roca aparece. Se decide consumir contingencia por 60.000 €.

Se registra decisión:

```txt
DEC-014: Se aprueba cargar sobrecoste de excavación contra contingencias.
```

La contingencia disponible baja.

## 17.5 Cambio de alcance

El promotor decide introducir una mejora de calidades con impacto económico y trabajo adicional.

Se crea:

```txt
CHG-006 Mejora de calidades en fachada
Tipo: Scope Change
Impacto presupuesto: +300.000 €
Honorarios proyectista: +15.000 €
Honorarios constructor: +20.000 €
```

La Comisión Ejecutiva lo aprueba. El PM registra acta y aprueba en la app.

La app:

- crea decisión vinculada;
- ajusta presupuesto objetivo;
- actualiza honorarios;
- recalcula FRC;
- actualiza dashboard;
- muestra impacto acumulado de cambios.

## 17.6 Diferencia por rol

El promotor entra en dashboard y ve:

- presupuesto IPD;
- coste real;
- inversión total;
- costes de desarrollo;
- FRC completo;
- cambios y decisiones.

El constructor entra en la misma URL y ve:

- presupuesto IPD;
- costes reales compartidos;
- su resultado FRC (solo el suyo);
- cambios y decisiones;
- no ve costes privados del promotor.

---

# 18. Criterios de éxito del producto

El prototipo se puede considerar conceptualmente correcto si demuestra estos puntos:

1. Se puede crear un proyecto IPD con agentes y condiciones FRC.
2. Se puede cargar un presupuesto objetivo estructurado.
3. Se pueden imputar costes reales a partidas.
4. Se actualizan desviaciones económicas.
5. Se calcula FRC con datos reales.
6. Se puede registrar y aprobar un cambio tipificado.
7. El cambio aprobado modifica presupuesto/honorarios/FRC según tipo.
8. Se registran riesgos y se conectan con contingencias.
9. Se registran incidencias y decisiones buscables por texto libre.
10. El dashboard se alimenta de datos reales.
11. La misma URL muestra distinta información según rol.
12. Los cálculos críticos tienen tests.
13. Las decisiones técnicas están documentadas en ADRs.
14. Se puede registrar avance físico por partida, y CV/CPI se calculan sin necesitar planificación.
15. Una imputación errónea puede anularse con trazabilidad (contra-asiento visible).
16. Las acciones relevantes generan eventos de auditoría que permiten responder quién hizo qué y cuándo.

---

# 19. Qué no debe absorber el MVP

Para no dispersar el desarrollo, el MVP no debería intentar resolver:

- CDE completo;
- visor BIM;
- gestión avanzada de versiones documentales;
- integración real con ACC;
- importación `.bc3` completa;
- integración con ERP constructor;
- informes mensuales automáticos con maquetación final;
- aprobaciones multi-firma complejas;
- IA conversacional;
- permisos documentales ISO 19650 detallados;
- planificación avanzada tipo MS Project;
- Last Planner System completo;
- **comparativos de adjudicación como módulo propio** (en el MVP se registran como `Decision` de adjudicación con el documento adjunto, §9.9);
- **registro abierto de usuarios, invitaciones y recuperación de contraseña** (los usuarios se crean por seed, §10.0);
- **multi-moneda** (el MVP es EUR fijo, §8.2);
- **histórico completo de actualizaciones de avance** (el MVP guarda el último valor con autor y fecha).

Algunos de estos temas son importantes, pero no son los que demuestran el corazón IPD del prototipo.

---

# 20. Decisiones de producto: cerradas y pendientes

## 20.1 Cerradas en esta versión (v1.0)

Estas dudas estaban abiertas en el borrador y quedan decididas aquí (la justificación, en la sección indicada):

1. **Visibilidad del FRC:** proyectista y constructor ven solo su propio resultado; promotor y PM ven el cuadro completo; el observador solo el estado agregado. Lo fija el briefing. (§9.5)
2. **PM y costes privados del promotor:** el PM los ve. El briefing le da "acceso completo a toda la información del proyecto". (§15)
3. **Previsión a cierre:** por defecto `max(coste real acumulado, presupuesto vigente)` por partida, con override manual que tiene prioridad. (§9.4)
4. **Histórico del FRC:** solo valor actual calculado al vuelo (ya decidido en ADR-005); snapshots si una spec futura pide curva de evolución.
5. **Captura del EV:** el avance físico se registra manualmente por partida (constructor/PM); el MVP guarda el último valor con autor y fecha. (§8.7, §9.4)
6. **Corrección de imputaciones:** los `RealCost` son inmutables; se anulan con contra-asiento vinculado y motivo. (§8.8, §9.4)
7. **Moneda:** EUR fija, constante de la aplicación. (§8.2)
8. **Comparativos:** sin módulo propio en MVP; se registran como `Decision` de adjudicación + documento. (§9.9, §19)
9. **Estados de riesgo:** los tres del briefing (Activo / Materializado / Cerrado), para mantener la nomenclatura comparable entre prototipos. (§9.7)
10. **Alta de usuarios y creación de proyectos:** usuarios por seed; cualquier usuario autenticado puede crear un proyecto y queda como su PM; no hay rol de administrador global. (§5.1, §9.2, §10.0)
11. **Fases:** las cuatro fases fijas se crean con el proyecto; la fase activa es un puntero con cambio trazado; en MVP no bloquea funcionalidades. (§9.2)
12. **Auditoría transversal:** las acciones relevantes generan `AuditEvent` append-only que hereda los permisos de su entidad; en MVP sin pantalla propia (alimenta los historiales por entidad). (§8.9)
13. **Fórmulas EVM y reglas de "sin datos":** cerradas como contrato de `calculateEVM()`, incluidas divisiones por cero y redondeos. (§9.6)
14. **Separación almacenado/derivado:** lo derivado no se persiste nunca; tabla de referencia para el esquema Prisma. (§7)
15. **Anulación de costes, modelo contable puro:** el original no se muta; el acumulado suma todos los asientos; "anulado" es condición derivada. (§8.8, §9.4)

## 20.2 Aún pendientes (se cierran en ADR o spec)

1. **Librería de validación de la API.** Candidato natural: Zod. → ADR cuando se implemente el primer endpoint.
2. **Hash de contraseñas.** Candidatos: argon2 (preferido en ADR-004), bcrypt. → ADR/spec del módulo de auth.
3. **Componente de tabla del presupuesto.** Candidatos: `mantine-datatable`, TanStack Table + componentes Mantine. → spec de la pantalla de presupuesto (anotado en ADR-002).
4. **Formato exacto de importación Excel.** Columnas candidatas: `Código capítulo | Capítulo | Código partida | Descripción | Unidad | Cantidad | Precio unitario | Importe`. → spec de importación.
5. **Umbrales de alerta de desviación:** constantes de aplicación vs configurables por proyecto. → spec del control económico.
6. **Partida de contingencias dentro del EVM:** ¿entra en BAC y puede tener avance, o se excluye del cálculo? Afecta a que EV pueda alcanzar BAC. → spec de `calculateEVM()`.

---

# 21. Glosario funcional

## IPD

Integrated Project Delivery. Método colaborativo de entrega de proyectos donde promotor, proyectista y constructor trabajan con objetivos compartidos, libros abiertos y reparto de riesgos/beneficios.

## Libros Abiertos

Modelo de transparencia donde los costes reales y la información económica relevante son visibles para los agentes del núcleo IPD.

## FRC

Fondo de Riesgo Compartido. Mecanismo de bonus/malus que reparte ahorro o sobrecoste según condiciones pactadas.

## Presupuesto objetivo

Base económica acordada contra la que se mide el proyecto. No es un precio cerrado tradicional.

## Coste real

Coste efectivamente incurrido e imputado a partidas.

## Contingencia

Reserva explícita para absorber riesgos identificados o eventos económicos previstos como posibles.

## Avance físico

Porcentaje de trabajo realmente ejecutado de una partida, registrado por constructor o PM. Alimenta el EV. No se deduce del gasto: gastar no es avanzar.

## Contra-asiento

Imputación de signo contrario (`RealCost` de tipo `reversal`) vinculada a una imputación errónea, con motivo obligatorio. Es la única forma de corregir un coste: los `RealCost` no se editan ni se borran.

## AuditEvent

Evento de auditoría append-only que registra quién hizo qué y cuándo (tipo, fecha, autor, entidad afectada, resumen). Hereda los permisos de su entidad. Es la base técnica de la trazabilidad de Libros Abiertos.

## Previsión a cierre

Estimación de lo que costará cada partida al final. Por defecto `max(coste real, presupuesto vigente)`; puede ajustarse manualmente.

## Cambio incidental

Cambio sin impacto económico o de KPIs.

## Cambio con impacto en coste

Cambio que afecta al presupuesto pero no a honorarios ni alcance.

## Cambio de alcance

Cambio que afecta al alcance del proyecto, presupuesto y potencialmente honorarios/FRC.

## EVM

Earned Value Management. Método para medir desempeño de coste y plazo mediante PV, EV, AC y métricas derivadas.

## Restricción

Condición que debe resolverse antes de poder ejecutar una actividad.

## Decisión

Registro formal de una decisión relevante, con contexto, motivo y vínculos.

## Comparativo

Documento que presenta en paralelo las ofertas de varios proveedores para una misma partida. En el MVP se registra como decisión de adjudicación con documento adjunto.

---

# 22. Lectura del producto en una frase final

IPD Platform debe comportarse como una sala de control económica y de trazabilidad para proyectos IPD: cada coste, riesgo, cambio y decisión se registra en su lugar, afecta a los indicadores que corresponde, respeta los permisos de cada agente y permite entender en tiempo real cómo evoluciona el resultado del proyecto y el reparto del Fondo de Riesgo Compartido.

---

# Anexo A — Equivalencia de módulos con el briefing

El evaluador usa la numeración del briefing. Esta tabla traduce entre ambos documentos:

| Briefing | Módulo del briefing | Este documento | Obligatorio |
|---|---|---|---|
| Módulo 1 | Autenticación y roles | §9.1 | Sí |
| Módulo 2 | Gestión de proyectos | §9.2 + §9.3 | Sí |
| Módulo 3 | Control económico (Libros Abiertos) | §9.4 + §9.5 (FRC) | Sí |
| Módulo 4 | Dashboard de KPIs | §9.6 (+ §9.5 para el bloque FRC) | Sí |
| Módulo 5 | Registro de riesgos | §9.7 | Sí |
| Módulo 6 | Incidencias y decisiones | §9.8 + §9.9 | Sí |
| Módulo 7 | Gestión de cambios | §9.10 | Sí |
| Módulo 8 | Planificación básica | §9.11 | Opcional |
| Módulo 9 | Capa IA básica | §9.14 | Opcional |
| — | (sin equivalente: soporte) | §9.12 documental ligera, §9.13 informes | No |

Los tres cálculos con tests innegociables del briefing viven en: `calculateEVM` (§9.6/§9.11), `calculateFRC` (§9.5) y `applyChange` (§9.10).





