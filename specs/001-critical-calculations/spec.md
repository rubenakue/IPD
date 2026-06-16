# Feature Specification: Cálculos económicos críticos (FRC, EVM, motor de cambios)

**Feature Branch**: `001-critical-calculations`

**Created**: 2026-06-12

**Status**: Draft

**Input**: Los tres cálculos innegociables del briefing (`calculateFRC`, `calculateEVM`, `applyChange`) como lógica de dominio pura, base sobre la que se construye todo el control económico de la plataforma.

> **Nota de alcance**: esta spec cubre solo la **lógica de cálculo** (el QUÉ y el POR QUÉ del dominio económico). La persistencia (Prisma/Postgres), la API (Express) y la UI (React) son otras features con sus propias specs. Aquí no hay tecnología: hay reglas de negocio verificables. Fuente de dominio: `docs/concepto-global.md` §7, §8, §9.4, §9.5, §9.6, §9.10.

## Clarifications

Como esta sesión se delega por completo, las ambigüedades que normalmente resolvería Rubén en `/speckit.clarify` se resuelven aquí con la fuente de verdad (`docs/concepto-global.md`) y quedan para su revisión.

### Session 2026-06-12

- **Q: ¿Sobre qué se mide la desviación del FRC: coste real acumulado o previsión a cierre?** → A: Sobre la **previsión a cierre** (`Desviación = Presupuesto vigente − Coste previsto a cierre`). La previsión por defecto de cada partida es `max(coste real acumulado, presupuesto vigente)`, salvo override manual. (§9.4, §9.5)
- **Q: ¿El malus del promotor tiene límite?** → A: **No.** Constructor y proyectista pierden como máximo sus honorarios en riesgo; el promotor asume su porcentaje sin tope. (§9.5, regla 3)
- **Q: ¿Qué pasa con el sobrecoste que excede los honorarios en riesgo de constructor/proyectista?** → A: El **exceso lo absorbe el promotor**. El fondo en riesgo es finito; el coste de la obra no. (§9.5, regla 4)
- **Q: ¿De dónde sale el EV (Earned Value)?** → A: Del **avance físico por partida** (`EV = Σ presupuesto vigente × % avance`), nunca del gasto ni de la planificación. (§8.7, §9.6)
- **Q: ¿Qué se muestra cuando faltan datos para el EVM?** → A: Un estado explícito **"sin datos"**, nunca un 0. `AC = 0` → CPI/EAC/ETC/VAC sin datos, pero CV sí (= EV); sin avance → EV y derivados sin datos; sin planificación o `PV = 0` → PV/SV/SPI sin datos. (§9.6)
- **Q: ¿El coste real acumulado cómo trata las anulaciones?** → A: Es la **suma de todos los asientos**; los contra-asientos (reversals) restan. El cálculo suma sin casos especiales. (§8.8)
- **Q: ¿Cómo se reparte el redondeo al céntimo?** → A: Todo en **céntimos enteros**; la suma de los repartos debe cuadrar exactamente con la desviación total, asignando el ajuste de redondeo de forma determinista (al agente de mayor porcentaje). (§9.5, regla 7)
- **Q: ¿Un cambio tipo 2 a dónde aplica su importe?** → A: Lo decide quien aprueba: **consumir contingencia** o **ajustar el presupuesto objetivo**. El cálculo recibe ese destino como dato de entrada. (§9.10)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Estado del FRC por agente (Priority: P1)

Cualquier agente del proyecto necesita saber, en todo momento, cuánto cobrará, ganará, perderá o arriesgará **si el proyecto cerrara hoy** con los datos actuales. Es la pregunta central del producto. El sistema, dados el presupuesto vigente, la previsión a cierre y las condiciones económicas de cada agente (porcentaje de reparto, honorarios garantizados, honorarios en riesgo), calcula el reparto del ahorro o sobrecoste y el resultado total proyectado de cada agente.

**Why this priority**: es el elemento más diferencial de IPD y el corazón del dashboard. Sin él, la plataforma no se distingue de una hoja de cálculo. El roadmap lo pone en verde el primero (S3).

**Independent Test**: se puede probar de forma totalmente aislada como función pura: se le dan unas cifras de entrada conocidas y se comprueba que el resultado por agente coincide al céntimo con el valor esperado, sin necesidad de base de datos ni interfaz.

**Acceptance Scenarios**:

1. **Ahorro repartido** — **Given** presupuesto vigente 20.000.000 € y previsión a cierre 19.000.000 € (ahorro 1.000.000 €), con reparto promotor 33 % / constructor 58 % / proyectista 9 %, **When** se calcula el FRC, **Then** el bonus es promotor 330.000 €, constructor 580.000 €, proyectista 90.000 €, y la suma de bonus es exactamente 1.000.000 €.
2. **Sobrecoste con agotamiento del fondo** — **Given** previsión 22.000.000 € sobre presupuesto 20.000.000 € (sobrecoste 2.000.000 €), honorarios en riesgo de constructor 600.000 € y proyectista 100.000 €, **When** se calcula el FRC, **Then** el constructor pierde 600.000 € (su 58 % serían 1.160.000 €, pero topa en su riesgo), el proyectista pierde 100.000 € (de 180.000 € teóricos), y el promotor absorbe 1.300.000 € (su 33 % de 660.000 € más el exceso de 640.000 €); la suma de pérdidas es exactamente 2.000.000 €.
3. **Equilibrio** — **Given** previsión igual al presupuesto vigente, **When** se calcula el FRC, **Then** el bonus/malus de cada agente es 0 y el resultado de cada uno es igual a sus honorarios garantizados.
4. **Agente sin participación** — **Given** un agente con 0 % de reparto, **When** se calcula el FRC en cualquier escenario, **Then** su bonus/malus es 0.
5. **Resultado total** — **Given** cualquier escenario, **When** se calcula el FRC, **Then** el resultado total de cada agente es `honorarios garantizados + bonus/malus`.

---

### User Story 2 - Indicadores EVM del proyecto (Priority: P2)

El equipo necesita medir el rendimiento de coste y de plazo del proyecto con las métricas estándar de Earned Value Management. Dados el presupuesto vigente total (BAC), el avance físico por partida (que produce el EV), el coste real acumulado (AC) y, si existe, el valor planificado (PV), el sistema calcula CV, SV, CPI, SPI, EAC, ETC y VAC, indicando explícitamente qué métricas no se pueden calcular por falta de datos.

**Why this priority**: es obligatorio para el dashboard y uno de los tres cálculos con tests innegociables. Va después del FRC porque el dashboard económico básico puede demostrarse antes con FRC + desviaciones.

**Independent Test**: función pura; con un conjunto conocido de PV/EV/AC se verifica cada métrica derivada y cada estado "sin datos".

**Acceptance Scenarios**:

1. **Cálculo completo** — **Given** BAC 20.000.000 €, EV 6.000.000 €, AC 6.500.000 € y PV 7.000.000 €, **When** se calcula el EVM, **Then** CV = −500.000 €, SV = −1.000.000 €, CPI ≈ 0,923, SPI ≈ 0,857, EAC ≈ 21.666.667 €, ETC ≈ 15.166.667 €, VAC ≈ −1.666.667 €.
2. **Sin planificación** — **Given** que no hay PV (no existe planificación valorada), **When** se calcula el EVM, **Then** PV, SV y SPI se devuelven como "sin datos", pero CV y CPI sí se calculan.
3. **Sin avance** — **Given** que ninguna partida tiene avance registrado (EV = sin datos), **When** se calcula el EVM, **Then** EV, CV, CPI, EAC, ETC y VAC se devuelven como "sin datos".
4. **Coste real cero** — **Given** AC = 0, **When** se calcula el EVM, **Then** CPI, EAC, ETC y VAC se devuelven como "sin datos" (división por cero), pero CV se calcula como CV = EV.
5. **Avance neto de anulaciones** — **Given** costes imputados con un contra-asiento, **When** se calcula AC, **Then** AC refleja la suma de todos los asientos (el contra-asiento resta).

---

### User Story 3 - Aplicar los efectos de un cambio aprobado (Priority: P3)

Cuando se aprueba un cambio, sus efectos económicos deben propagarse de forma controlada según su tipo. Dado un cambio aprobado y el estado económico actual, el sistema determina los efectos a aplicar (ajustes por partida, cambios de honorarios, reponderación de porcentajes) sin ejecutar ninguna escritura: devuelve la lista de efectos para que la capa de datos los persista en una transacción.

**Why this priority**: es el tercer cálculo innegociable y el que conecta la gestión de cambios con el control económico. Va en tercer lugar porque depende conceptualmente de entender FRC y presupuesto vigente.

**Independent Test**: función pura; para cada tipo de cambio se verifica que los efectos devueltos son los esperados y que no se produce ningún efecto secundario.

**Acceptance Scenarios**:

1. **Tipo 1 (incidental)** — **Given** un cambio incidental aprobado, **When** se aplica, **Then** los efectos están vacíos: sin ajuste de presupuesto, sin cambio de honorarios, sin reponderación; solo queda el registro.
2. **Tipo 2 contra contingencia** — **Given** un cambio con impacto en coste de +120.000 € con destino "contingencia", **When** se aplica, **Then** se consume 120.000 € de la bolsa de contingencias, el presupuesto objetivo no cambia, y los honorarios no cambian.
3. **Tipo 2 ajuste de presupuesto** — **Given** el mismo cambio con destino "presupuesto", **When** se aplica, **Then** se genera un ajuste de +120.000 € sobre las partidas afectadas (el presupuesto vigente sube) y los honorarios no cambian.
4. **Tipo 2 negativo** — **Given** un cambio con impacto de −50.000 € (un ahorro), **When** se aplica, **Then** el ajuste es negativo y reduce el presupuesto vigente o repone contingencia según el destino.
5. **Tipo 3 (alcance)** — **Given** un cambio de alcance de +300.000 € con honorarios constructor +20.000 € y proyectista +15.000 €, **When** se aplica, **Then** se genera el ajuste de presupuesto, se actualizan esos honorarios y, si el cambio incluye reponderación, se aplican los nuevos porcentajes (que deben seguir sumando 100 %).

---

### Edge Cases

- Reparto que no suma 100 %: es un estado inválido; el cálculo asume porcentajes válidos y la validación ocurre antes (feature de agentes). La spec exige que el cálculo sea determinista solo con entradas válidas.
- Importes muy grandes: al trabajar en céntimos enteros, no debe haber pérdida de precisión en el rango de un proyecto de construcción (cientos de millones de euros).
- Sobrecoste que agota los fondos de varios agentes simultáneamente: el promotor absorbe la suma de todos los excesos.
- Cambio de alcance sin reponderación: solo afecta a presupuesto y honorarios; los porcentajes se mantienen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST calcular el resultado del FRC por agente como `honorarios garantizados + bonus/malus`, repartiendo el ahorro o sobrecoste según el porcentaje de cada agente.
- **FR-002**: El sistema MUST limitar la pérdida de constructor y proyectista a sus honorarios en riesgo, y MUST asignar al promotor el porcentaje propio sin límite más cualquier exceso que supere el fondo en riesgo de los demás.
- **FR-003**: El sistema MUST medir la desviación del FRC contra la previsión a cierre, usando por defecto `max(coste real acumulado, presupuesto vigente)` por partida cuando no haya previsión manual.
- **FR-004**: El sistema MUST calcular CV, SV, CPI, SPI, EAC, ETC y VAC a partir de BAC, EV, AC y PV, donde `EV = Σ (presupuesto vigente de partida × % avance)`.
- **FR-005**: El sistema MUST devolver un estado explícito "sin datos" (no un 0) para cada métrica EVM que no pueda calcularse: sin avance (EV y derivados), `AC = 0` (CPI/EAC/ETC/VAC, pero CV = EV sí), sin planificación o `PV = 0` (PV/SV/SPI).
- **FR-006**: El sistema MUST calcular el coste real acumulado como la suma de todos los asientos, restando los contra-asientos (anulaciones).
- **FR-007**: El sistema MUST determinar los efectos de un cambio aprobado según su tipo (1 sin efectos; 2 ajuste de coste con destino contingencia o presupuesto; 3 ajuste de presupuesto + honorarios + reponderación opcional) y MUST devolverlos sin ejecutar ninguna escritura.
- **FR-008**: Todos los importes MUST representarse y calcularse en céntimos enteros; los repartos MUST cuadrar exactamente con el total, con el ajuste de redondeo asignado de forma determinista.
- **FR-009**: Los tres cálculos MUST ser deterministas y reproducibles: las mismas entradas producen siempre la misma salida, sin depender de fecha, azar ni estado externo.
- **FR-010**: Los ajustes de presupuesto y de honorarios MUST admitir valores negativos (un cambio puede abaratar o un ahorro puede reponer contingencia).

### Key Entities *(include if feature involves data)*

- **FRC (resultado, derivado)**: por agente — honorarios garantizados, honorarios en riesgo, porcentaje de reparto, bonus/malus calculado, resultado total. No se almacena: se calcula al vuelo.
- **Condiciones de Agent (entrada)**: porcentaje de reparto, honorarios base, honorarios en riesgo, rol.
- **Estado económico (entrada)**: presupuesto vigente total y por partida, coste real acumulado (neto de anulaciones), previsión a cierre, contingencia disponible.
- **Avance físico (entrada de EVM)**: porcentaje por partida; produce el EV.
- **Cambio aprobado (entrada de applyChange)**: tipo, impacto económico, partidas afectadas, destino (tipo 2), deltas de honorarios y reponderación (tipo 3).
- **Efectos de cambio (salida de applyChange)**: ajustes por partida, deltas de honorarios, nuevos porcentajes; los aplica la capa de datos, no el cálculo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dado el caso de ahorro del escenario US1.1, el bonus calculado por agente coincide al céntimo con el esperado (330.000 / 580.000 / 90.000 €) y la suma es exactamente el ahorro total.
- **SC-002**: Dado el caso de agotamiento del escenario US1.2, las pérdidas por agente coinciden al céntimo (600.000 / 100.000 / 1.300.000 €) y suman exactamente el sobrecoste.
- **SC-003**: Dado el caso EVM completo del escenario US2.1, las siete métricas derivadas coinciden con los valores esperados (con la precisión de redondeo definida para CPI/SPI).
- **SC-004**: En los tres escenarios de datos incompletos (sin planificación, sin avance, AC = 0), el sistema devuelve "sin datos" en las métricas correctas y nunca un 0 engañoso.
- **SC-005**: Para cada uno de los tres tipos de cambio, los efectos devueltos por `applyChange` coinciden con los esperados y no se produce ninguna escritura.
- **SC-006**: Los tres cálculos tienen tests automatizados que cubren todos los escenarios de aceptación de esta spec, y todos pasan (`pnpm test` verde).
- **SC-007**: Ningún cálculo pierde precisión: todos los totales cuadran al céntimo en los casos de prueba.

## Assumptions

- Los datos de entrada llegan ya validados (porcentajes que suman 100 %, importes no nulos donde se requieren): la validación es responsabilidad de las features de agentes/presupuesto, no de estos cálculos.
- El eje del FRC implementado es el de **coste**; los ejes de plazo y sostenibilidad quedan fuera de esta feature (opcionales, §9.5 del concepto).
- El stack está decidido (ADRs 001–008), por lo que el plan de esta feature puede referenciarlo sin reabrir decisiones.
- Estos cálculos son funciones puras reutilizables; la persistencia y la API que los invocan son features posteriores (S6–S20 del roadmap).
