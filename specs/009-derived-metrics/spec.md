# Feature Specification: Derivados económicos y alertas de desviación

**Feature Branch**: `s15-derived-metrics`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "S15 — Derivados económicos y alertas de desviación. Calcular y mostrar presupuesto vigente, acumulados, desviación y previsión a cierre; resaltar partidas desviadas."

## Resumen del problema

Con el presupuesto aprobado (S13) y los costes reales y el avance ya registrados (S14), el
proyecto tiene los datos fuente pero todavía no muestra **la foto económica que importa para
decidir**: cuánto se ha desviado cada partida y cuánto se prevé que costará al cierre. Esta
feature calcula y muestra, **sin persistir nada** (§7), los **derivados económicos** del
control de obra:

- **presupuesto vigente** = presupuesto base aprobado + ajustes de cambios aprobados;
- **coste real acumulado** por partida y por capítulo (ya disponible de S14);
- **previsión a cierre** = `max(coste real acumulado, presupuesto vigente)`, salvo que exista
  una **previsión manual** por partida, que tiene prioridad;
- **desviación** en € y % = presupuesto vigente − previsión a cierre (positivo = ahorro,
  negativo = sobrecoste);
- y una **señal de alerta** que resalta las partidas con desviación significativa.

El objetivo es que el equipo vea, en la tabla de control económico agrupada por capítulos, qué
partidas están en riesgo, y que el constructor o el PM puedan **afinar la previsión manualmente**
cuando tengan mejor información. Es la base que alimentará el FRC y el EVM en sprints
posteriores. La transparencia es de Libros Abiertos: todos los agentes del proyecto ven la misma
foto.

## Clarifications

### Session 2026-06-29

- Q: ¿Cómo se obtiene el presupuesto vigente mientras el motor de cambios (H8) no existe? → A:
  Vigente = base + Σ ajustes. La lógica suma ajustes (leyendo `ChangeAdjustment`), pero como
  hoy no hay cambios aprobados, vigente = base y la columna "Ajustes" muestra 0. Preparado para
  H8 sin deuda.
- Q: ¿Qué significa una previsión a cierre manual de 0 €? → A: La previsión manual debe ser
  > 0. Para quitar el override se elimina (la partida vuelve al default `max(coste, vigente)`);
  0 no es un override válido.
- Q: ¿Los umbrales de alerta (5% / 10%) son constantes o configurables? → A: Constantes fijas en
  este sprint; la configurabilidad por proyecto queda pendiente (§20.2).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la tabla de control económico con derivados y alertas (Priority: P1)

Cualquier agente del proyecto entra en el control económico y ve la tabla de partidas agrupada
por capítulos. Cada fila muestra, además del presupuesto base: el **presupuesto vigente**, el
**coste real acumulado**, el **% de avance**, la **previsión a cierre**, y la **desviación en €
y %**. Las partidas con desviación significativa se **resaltan** según su nivel (atención /
alerta). Los capítulos muestran sus subtotales y el proyecto su total para cada magnitud.

**Why this priority**: Es el corazón de la feature y de H6 — convertir los datos fuente
(presupuesto + costes + avance) en la información de gestión que el usuario necesita. Si solo se
implementa esta historia, el proyecto ya ofrece la foto económica completa y las alertas.

**Independent Test**: Con un presupuesto aprobado y costes imputados conocidos, abrir el control
económico y comprobar que el vigente, el acumulado, la previsión y la desviación de cada partida
**cuadran a mano** con el caso, y que una partida cuyo coste supera su presupuesto aparece
resaltada.

**Acceptance Scenarios**:

1. **Given** una partida con presupuesto vigente y sin costes, **When** se consulta el control
   económico, **Then** su previsión a cierre es igual al presupuesto vigente y su desviación es
   0 (conservador: lo no gastado se gastará según presupuesto).
2. **Given** una partida cuyo coste real acumulado **supera** su presupuesto vigente, **When** se
   consulta, **Then** su previsión a cierre es el coste real acumulado, su desviación es negativa
   (sobrecoste) y la fila se resalta como alerta.
3. **Given** partidas en varios capítulos, **When** se consulta, **Then** cada capítulo muestra
   los subtotales (vigente, coste real, previsión, desviación) y el proyecto el total, todo
   cuadrando al céntimo con la suma de sus partidas.
4. **Given** los importes en céntimos, **When** se presentan, **Then** se muestran en euros y los
   porcentajes con la precisión definida, sin que ningún derivado se haya almacenado.
5. **Given** un usuario que no es agente del proyecto, **When** intenta consultar, **Then** se
   deniega en el servidor.

---

### User Story 2 - Afinar la previsión a cierre de una partida (Priority: P2)

El constructor o el PM, al disponer de mejor información sobre una partida, fija manualmente su
**previsión a cierre** (un importe que sustituye a la regla por defecto). También puede **quitar**
ese valor manual para que la partida vuelva a la previsión por defecto. El cambio se refleja de
inmediato en la previsión, la desviación y las alertas de esa partida y en los totales.

**Why this priority**: Aporta control fino sobre la proyección económica, pero la tabla con la
regla por defecto (US1) ya entrega el valor central; el override es un refinamiento.

**Independent Test**: Como constructor, fijar una previsión manual mayor que la previsión por
defecto de una partida y comprobar que la previsión efectiva, la desviación y la alerta cambian;
luego quitarla y comprobar que vuelve al valor por defecto.

**Acceptance Scenarios**:

1. **Given** una partida con previsión por defecto, **When** el constructor/PM fija una previsión
   manual, **Then** la previsión efectiva pasa a ser ese valor y la desviación y la alerta se
   recalculan.
2. **Given** una partida con previsión manual, **When** se elimina el valor manual, **Then** la
   partida vuelve a la previsión por defecto `max(coste real, vigente)`.
3. **Given** un agente sin permiso (promotor, proyectista, observador), **When** intenta fijar la
   previsión manual, **Then** se deniega en el servidor.
4. **Given** una previsión manual negativa o no válida, **When** se intenta fijar, **Then** se
   rechaza con un mensaje claro.

---

### Edge Cases

- **Partida sin avance ni costes**: previsión = vigente, desviación = 0, sin alerta.
- **Presupuesto vigente 0**: la desviación en % no debe dividir por cero (se muestra "—" o 0%).
- **Coste real acumulado negativo** (más anulaciones que cargos, transitorio): la previsión usa
  `max(...)` con el vigente, nunca un valor negativo.
- **Previsión manual = 0**: no es un override válido (FR-014: manual > 0); para volver al
  default se elimina el valor manual, no se pone 0.
- **Sin presupuesto o presupuesto en borrador**: el control económico de derivados se muestra
  vacío o sin alertas; los derivados tienen sentido sobre la base aprobada.
- **Capítulo con desviación mixta**: el subtotal de desviación del capítulo es la suma de las de
  sus partidas (una partida con ahorro puede compensar a otra con sobrecoste).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST calcular el **presupuesto vigente** de cada partida como el
  presupuesto base aprobado más la suma de los **ajustes de cambios aprobados** que la afecten.
- **FR-002**: El sistema MUST calcular el **coste real acumulado** de cada partida como la suma de
  sus asientos (los contra-asientos restan), reutilizando la regla de S14.
- **FR-003**: El sistema MUST calcular la **previsión a cierre** de cada partida como
  `max(coste real acumulado, presupuesto vigente)`, salvo que exista una **previsión manual**
  para esa partida, en cuyo caso prevalece la manual.
- **FR-004**: El sistema MUST calcular la **desviación** de cada partida como `presupuesto
  vigente − previsión a cierre`, en € y en % sobre el vigente (positivo = ahorro, negativo =
  sobrecoste).
- **FR-005**: El sistema MUST calcular los **subtotales por capítulo** y los **totales del
  proyecto** de vigente, coste real, previsión y desviación como suma de las partidas.
- **FR-006**: El sistema MUST asignar a cada partida un **nivel de alerta** según el valor
  absoluto de su desviación %: normal (< 5%), atención (5–10%), alerta (> 10%).
- **FR-007**: El sistema MUST tratar todos estos valores como **derivados no persistidos**: se
  calculan al consultar a partir de los datos fuente (base, ajustes, costes, avance, previsión
  manual). Lo único almacenado es la **previsión manual** por partida.
- **FR-008**: El sistema MUST permitir a un agente con permiso (constructor o PM) **fijar** la
  previsión a cierre manual de una partida y **eliminarla** (volver a la regla por defecto).
- **FR-009**: El sistema MUST almacenar y calcular los importes en **céntimos enteros**; la
  conversión a euros y el formato de porcentajes ocurren solo en presentación.
- **FR-010**: El sistema MUST permitir a **cualquier agente del proyecto** consultar la tabla de
  derivados, y MUST denegar el acceso a quien no sea agente, verificado en el servidor.
- **FR-011**: El sistema MUST restringir la edición de la previsión manual a **constructor o PM**,
  verificado en el servidor (permiso `forecast.update`).
- **FR-012**: El sistema MUST presentar la tabla **agrupada por capítulos** con las columnas:
  base, ajustes, vigente, coste real, avance %, previsión a cierre, desviación € y desviación %,
  y resaltar visualmente las partidas en atención/alerta.
- **FR-013**: El sistema MUST calcular el presupuesto vigente como base + Σ ajustes de cambios
  aprobados (`ChangeAdjustment`). Mientras el motor de cambios (H8) no exista, no habrá ajustes y
  el vigente será igual a la base, mostrando la columna "Ajustes" en 0; la lógica de suma de
  ajustes queda implementada para cuando existan.
- **FR-014**: El sistema MUST exigir que una previsión manual sea **> 0**; para anular el override
  el usuario lo **elimina** (la partida vuelve a la regla por defecto `max(coste, vigente)`). Una
  previsión manual de 0 no es un override válido.
- **FR-015**: El sistema MUST usar **umbrales de alerta constantes** (atención ≥ 5%, alerta ≥ 10%
  en valor absoluto de la desviación %); la configurabilidad por proyecto queda fuera de alcance
  (§20.2).
- **FR-016**: El sistema MUST recalcular previsión, desviación y alertas **al consultar**, de modo
  que tras imputar un coste, registrar avance o cambiar la previsión manual, la foto refleje los
  datos actuales sin pasos manuales.

### Key Entities *(include if feature involves data)*

- **BudgetLine (partida)**: ya existente; aporta el presupuesto base, el avance y la **previsión
  manual** (`manualForecast`, único dato almacenado de esta feature). Todos los demás valores de
  su fila son derivados.
- **ChangeAdjustment (ajuste)**: ajuste de presupuesto vinculado a un cambio aprobado; suma al
  vigente. Su creación es de la feature del motor de cambios (H8); aquí solo se **lee** para
  calcular el vigente.
- **RealCost (asiento)**: ya existente (S14); su suma da el coste real acumulado.
- **Derivados de control económico** (NO se persisten): presupuesto vigente, coste real
  acumulado, previsión a cierre efectiva, desviación € y %, nivel de alerta — por partida, por
  capítulo y por proyecto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para un caso de prueba conocido, el vigente, el coste real, la previsión a cierre y
  la desviación de cada partida coinciden **exactamente** (al céntimo en €, y en % con la
  precisión definida) con el cálculo manual.
- **SC-002**: Una partida cuyo coste real supera su presupuesto vigente aparece **resaltada** como
  alerta, y su previsión a cierre es igual a su coste real acumulado.
- **SC-003**: Fijar una previsión manual cambia la previsión efectiva, la desviación y la alerta
  de esa partida y los totales; eliminarla los devuelve al valor por defecto.
- **SC-004**: Ningún derivado se almacena: una segunda consulta sin cambios de datos fuente
  produce exactamente los mismos valores, calculados al vuelo.
- **SC-005**: El 100% de los intentos de editar la previsión manual por un rol sin permiso, o de
  consultar por quien no es agente, son denegados en el servidor (verificable sin la interfaz).
- **SC-006**: Los subtotales por capítulo y el total del proyecto cuadran al céntimo con la suma
  de las partidas para cada magnitud.

## Assumptions

- **No se calcula EVM aquí**: EV, CV, CPI y el FRC servido por rol son de S16/dashboard. Esta
  feature cubre la tabla de control económico (vigente, coste, previsión, desviación, alertas).
- **El modelo de datos ya existe**: `BudgetLine.manualForecast` (céntimos) y `ChangeAdjustment`
  están en el esquema; esta feature no rediseña el modelo (a lo sumo lee ajustes, hoy vacíos).
- **Los derivados se calculan sobre la base aprobada**: tienen sentido cuando el presupuesto está
  aprobado; en borrador o sin presupuesto, la tabla de derivados no muestra alertas.
- **Importes en euros en la interfaz, céntimos por dentro**; porcentajes con la precisión que
  fijen los tests.
- **Contingencias y cambios tipo 2 quedan fuera de alcance** (dependen del motor de cambios y del
  registro de riesgos, sprints posteriores).

## Dependencies

- Presupuesto objetivo aprobado con partidas (S13) y costes reales / avance (S14).
- Proyecto, agentes y permisos por proyecto (servidor + RLS); el permiso `forecast.update` ya
  existe en la matriz (constructor + PM).
