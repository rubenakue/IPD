# Feature Specification: Alta de usuarios por invitación

**Feature Branch**: `user-invitation` *(rama propia en su sesión)*

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Alta de usuarios por invitación: al gestionar los agentes de un proyecto, poder invitar/dar de alta un usuario nuevo por email cuando no existe en el sistema. Sin servicio de correo: se crea con una contraseña temporal mostrada una sola vez a quien invita; el invitado entra con ella y establece su contraseña en el primer acceso. Auditoría user.invited. Se desvía del §5.1 (usuarios solo por seed) → requiere ADR."

> **Origen:** esta feature nace al **acotar la sesión S12** (setup de proyecto, `specs/005-project-setup`),
> que se limita a asignar usuarios **existentes**. Aquí se añade la capacidad de **crear usuarios
> nuevos por invitación**. Depende, por tanto, del flujo de gestión de agentes de S12.
> Seguimiento: issue [#37](https://github.com/rubenakue/IPD/issues/37).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invitar a un usuario nuevo por email (Priority: P1)

El PM de un proyecto, al añadir un agente, introduce el email de una persona que **todavía no
existe** en el sistema. La plataforma crea el usuario nuevo y genera una **contraseña temporal**
que se muestra **una sola vez** al PM para que se la comunique al invitado. El nuevo usuario queda
asignado como agente del proyecto.

**Why this priority**: Es el núcleo de la feature: permite incorporar participantes que no estaban
en el seed, sin lo cual los proyectos quedan limitados a un conjunto fijo de usuarios. Entrega
valor por sí sola (un proyecto puede tener a su gente real como agentes).

**Independent Test**: El PM añade un agente con un email no registrado; el sistema crea el usuario,
muestra una contraseña temporal una única vez y el agente aparece en el proyecto.

**Acceptance Scenarios**:

1. **Given** el PM de un proyecto, **When** añade un agente con un email que no existe, **Then** se crea el usuario, se muestra una contraseña temporal una sola vez y el usuario queda como agente del proyecto.
2. **Given** un email que ya corresponde a un usuario existente, **When** el PM lo usa para un agente, **Then** se asigna el usuario existente sin crear uno nuevo ni alterar su contraseña.
3. **Given** un email mal formado, **When** se intenta invitar, **Then** se rechaza con un mensaje claro y no se crea nada.
4. **Given** un usuario que NO es PM del proyecto, **When** intenta invitar, **Then** el servidor lo rechaza (no basta con ocultar la opción en la interfaz).
5. **Given** una invitación realizada, **When** se consulta el registro de auditoría, **Then** existe un evento `user.invited` sin datos sensibles (la contraseña temporal NO se registra).

---

### User Story 2 - Primer acceso del usuario invitado (Priority: P2)

La persona invitada inicia sesión por primera vez con la contraseña temporal y la plataforma le
exige **establecer una contraseña propia** antes de continuar. A partir de ese momento, accede con
su nueva contraseña como cualquier usuario.

**Why this priority**: Cierra el ciclo de la invitación y evita que queden cuentas con una
contraseña temporal conocida por un tercero (el PM). Depende de US1.

**Independent Test**: Con la contraseña temporal de un usuario recién invitado, este inicia sesión,
se le pide cambiarla, la cambia y puede volver a entrar con la nueva.

**Acceptance Scenarios**:

1. **Given** un usuario invitado con contraseña temporal, **When** inicia sesión por primera vez, **Then** la plataforma le exige establecer una contraseña propia antes de darle acceso al resto.
2. **Given** un usuario invitado que ha establecido su contraseña, **When** vuelve a iniciar sesión, **Then** entra con su nueva contraseña y ya no se le exige cambiarla.
3. **Given** una contraseña nueva que no cumple los requisitos mínimos, **When** el usuario intenta establecerla, **Then** se rechaza con un mensaje claro.

---

### Edge Cases

- **Contraseña temporal perdida** (no comunicada o extraviada): su reemisión o la recuperación de contraseña queda **fuera de alcance** (feature posterior).
- **El invitado no cambia la contraseña**: hasta que establezca la suya, el sistema sigue exigiéndoselo en cada acceso (no puede operar con la temporal indefinidamente).
- **Reinvitar un email ya invitado pero que aún no entró**: se trata como usuario ya existente (no se crea otro ni se regenera la contraseña automáticamente).
- **Email con mayúsculas/espacios**: se normaliza antes de comprobar existencia, para no crear duplicados.
- **Invitación concurrente del mismo email** en dos proyectos: se crea un único usuario; ambos proyectos lo referencian como agente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir al PM de un proyecto invitar a un usuario indicando un email; si el email no corresponde a un usuario existente, MUST crear un usuario nuevo con ese email.
- **FR-002**: Al crear un usuario por invitación, el sistema MUST generar una contraseña temporal y mostrarla **una sola vez** a quien invita; la contraseña temporal NO se vuelve a mostrar ni se almacena de forma legible.
- **FR-003**: Cuando el email ya corresponde a un usuario existente, el sistema MUST asignar ese usuario sin crear uno nuevo ni modificar su contraseña.
- **FR-004**: El sistema MUST exigir al usuario invitado establecer una contraseña propia en su primer inicio de sesión, antes de permitirle el resto de la aplicación.
- **FR-005**: El sistema MUST rechazar emails mal formados antes de crear ningún usuario, con un mensaje claro.
- **FR-006**: El sistema MUST normalizar el email (p. ej. minúsculas y espacios) antes de comprobar la existencia, para evitar usuarios duplicados.
- **FR-007**: La invitación MUST autorizarse en el servidor: solo el PM del proyecto puede invitar en el contexto de ese proyecto; un usuario sin ese permiso recibe un rechazo aunque llame directamente al servicio.
- **FR-008**: El sistema MUST registrar un evento de auditoría `user.invited` al crear un usuario por invitación, sin incluir la contraseña temporal ni otros datos sensibles.
- **FR-009**: La interfaz y los textos de negocio MUST estar en español, con ortografía y acentuación correctas.

### Key Entities *(include if feature involves data)*

- **User (usuario)**: persona con credenciales. Esta feature permite crearlo por invitación. Incluye un indicador de que debe establecer su contraseña (estado de "contraseña temporal pendiente de cambio").
- **Agent (agente)**: vínculo usuario↔proyecto; la invitación ocurre en el contexto de añadir un agente (definido en S12).
- **AuditEvent (evento de auditoría)**: registro append-only; esta feature añade `user.invited`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El PM puede invitar a una persona nueva por email y obtener su contraseña temporal en un solo paso, en menos de 1 minuto.
- **SC-002**: Una persona invitada puede iniciar sesión con la contraseña temporal, se le obliga a cambiarla y, tras hacerlo, accede con la nueva en intentos posteriores.
- **SC-003**: El 100% de las invitaciones dejan un evento de auditoría `user.invited` sin la contraseña temporal.
- **SC-004**: Un usuario que no es PM del proyecto no consigue invitar, ni siquiera invocando el servicio directamente (verificable en servidor).
- **SC-005**: No se crean usuarios duplicados al invitar el mismo email con distinto formato (mayúsculas/espacios).

## Assumptions

- Esta feature **depende de S12** (gestión de agentes de un proyecto): la invitación se realiza al añadir un agente.
- **No hay servicio de correo electrónico** en el prototipo: la contraseña temporal se comunica mostrándola al PM una vez; no se envía email.
- Se **desvía conscientemente del §5.1** del concepto (usuarios solo por seed) → requiere un **ADR** que documente la decisión.
- Construye sobre el sistema de autenticación existente (sesiones con cookie, contraseñas con hash, permisos por proyecto).
- **Fuera de alcance**: recuperación/restablecimiento de contraseña olvidada, reemisión de la contraseña temporal, gestión administrativa global de usuarios (listar/editar/desactivar) y verificación del email mediante correo.
- Los requisitos mínimos de la contraseña propia siguen la política de contraseñas ya existente en el proyecto.
- Soporte de escritorio como objetivo principal.
