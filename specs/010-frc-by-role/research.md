# Research: FRC servido por rol (Fase 0)

Sin marcadores `NEEDS CLARIFICATION` pendientes (resueltos en `/speckit-clarify`). Este
documento consolida las **decisiones de diseño** que guían la Fase 1. Formato por decisión:
Decisión / Motivo / Alternativas descartadas.

## D1 — Filtrado por rol: dónde y cómo

- **Decisión**: el filtrado vive en una **función pura** `projectFrcForRole(result, requester, agents)`
  en `src/lib/frc/visibility.ts`, invocada por el servicio `getProjectFrc()`. La respuesta es una
  **unión discriminada por `visibility`** (`'global' | 'own' | 'aggregate'`).
- **Motivo**: (Principio V) el innegociable es que el servidor recorte el contenido. Una unión
  discriminada hace que la respuesta del observador **no tenga ni el campo** `agents`/`deviationCents`
  — no es que se oculte en el frontend, es que no existe en el JSON. Al ser función pura, el recorte
  se prueba exhaustivamente con TDD sin BD (SC-003/SC-004 verificables al céntimo y por forma).
- **Alternativas descartadas**: (a) filtrar en el frontend → viola Principio V; (b) un único DTO con
  campos opcionales a `null` → un bug de serialización podría filtrar datos y el tipo no lo impediría;
  la unión discriminada lo hace imposible por construcción.

## D2 — Puerta del endpoint y denegación al no-agente

- **Decisión**: `GET /projects/:projectId/frc` se protege con `requireProjectPermission(prisma, 'project.view')`.
  El servicio decide la `visibility` a partir de `req.projectAgent.role` (+ `agentId`).
- **Motivo**: el **observador no tiene** `frc.own.view` ni `frc.global.view` en la matriz, pero SÍ debe
  recibir el estado agregado (FR-009). Cerrar con un permiso `frc.*` lo dejaría fuera. `project.view` lo
  tienen todos los participantes y **nadie más**: `resolveProjectAgent()` lanza `notFound` si el
  solicitante no es agente activo del proyecto → cubre FR-004/SC-005. Es el mismo patrón que
  `GET /budget/economics`.
- **Alternativas descartadas**: gate con `frc.own.view` (excluiría al observador); gate con
  `frc.global.view` (excluiría a constructor/proyectista/observador). Ambas rompen la spec.

## D3 — Mapeo de la visibilidad desde el rol

- **Decisión**, dentro de `projectFrcForRole()`:
  1. `hasPermission(role, 'frc.global.view')` (PROMOTER, PROJECT_MANAGER) → **`global`**: `deviationCents`
     + filas de todos los agentes + `fundStatus`.
  2. si no, `hasPermission(role, 'frc.own.view')` (DESIGNER, CONSTRUCTOR) y existe fila propia en
     el resultado del cálculo → **`own`**: `deviationCents` + `own` + `fundStatus`.
  3. si no hay fila propia porque el agente no participa (`sharePercent = 0`), o si el rol es
     OBSERVER → **`aggregate`**: solo `fundStatus` (+ `budgetStatus`). Sin importes (FR-009/FR-011).
- **Motivo**: reutiliza la matriz existente sin tocarla; expresa §9.5 literalmente. El PM ve el cuadro
  completo por `frc.global.view`, así que la Nota² (“PM solo tiene FRC propio si `sharePercent > 0`”) no
  necesita rama especial: el PM nunca pide “solo su fila”. Un agente con visibilidad propia pero 0 %
  cae en `aggregate`, porque FR-011 exige que no reciba ni fila propia ni importes agregados.
- **Alternativas descartadas**: tratar al PM como “propio” (contradice que ve el cuadro completo);
  devolver `own: null` con `deviationCents` para 0 % (filtra un importe que FR-011 equipara al agregado);
  añadir una 4.ª visibilidad para 0 % (innecesaria: `aggregate` ya lo modela).

## D4 — Construcción del `FrcInput` desde datos reales

- **Decisión**: `getProjectFrc()`, bajo `withRlsContext`, (a) carga el presupuesto; si no está `APPROVED`
  devuelve “sin datos” (respuesta con `budgetStatus` y `fundStatus: 'neutral'`, sin filas); (b) calcula
  el **vigente total** y la **previsión a cierre total** reutilizando `deriveBudgetLine` + `summarizeEconomics`
  de S15 (los mismos números que `GET /budget/economics`); (c) construye `agents: AgentFrcTerms[]` desde
  los `Agent` del proyecto **con rol de parte del fondo** (PROMOTER/CONSTRUCTOR/DESIGNER) y `sharePercent > 0`;
  (d) llama a `calculateFRC({ currentBudget, forecastAtCompletion, agents })`.
- **Motivo**: el modelo `Agent` ya persiste `role`, `sharePercent`, `guaranteedFee`, `feeAtRisk` (céntimos):
  no hace falta migración. `AgentFrcTerms.role` del dominio solo admite `promoter|constructor|designer`, que
  son exactamente las partes del fondo; PM/OBSERVER no entran al cálculo (no reparten). Reutilizar los
  derivados de S15 garantiza que la desviación del FRC cuadra con la tabla económica (coherencia SC-002).
- **Alternativas descartadas**: recalcular vigente/previsión a mano (duplicaría S15 y arriesgaría
  divergencias); incluir a PM/OBSERVER en `calculateFRC` (no son parties; el tipo de dominio no los admite).

## D5 — Estado del fondo (bonus/neutro/malus)

- **Decisión**: helper puro `fundStatusFromDeviation(deviationCents): 'bonus' | 'neutral' | 'malus'`
  (`> 0` bonus, `< 0` malus, `0` neutral), en `src/lib/frc/visibility.ts`, cubierto por los mismos tests.
- **Motivo**: FR-005; es la única pieza que el observador recibe. Trivial y determinista.
- **Alternativas descartadas**: derivarlo en el frontend (viola Principio V: el observador no debe
  recibir el importe de desviación del que inferirlo).

## D6 — Ruta del endpoint y de la vista

- **Decisión**: endpoint `GET /projects/:projectId/frc`; vista en la sección `frc` ya existente
  (`src/lib/sections.ts`, hoy placeholder) → `ready: true` + ruta real en `App.tsx` a `<ProjectFrcPage/>`.
- **Motivo**: el FRC es su propia sección de navegación (distinta de Presupuesto). Mantener el endpoint
  bajo `/frc` (no bajo `/budget`) alinea API, ruta y menú, y deja `economics` como la foto de partidas.
- **Alternativas descartadas**: colgarlo de `/budget/frc` (mezclaría dos secciones de UI distintas).

## D7 — Sin persistencia, sin auditoría de escritura

- **Decisión**: el resultado del FRC se calcula al consultar; el endpoint es de solo lectura y **no**
  registra `AuditEvent`.
- **Motivo**: Principio IV (nada derivado se persiste) y coherencia con `GET /budget/economics`, que
  tampoco audita lecturas. La auditoría append-only (Principio VI) es para acciones que mutan datos.
- **Alternativas descartadas**: cachear/persistir el FRC (prohibido); auditar cada consulta (ruido sin
  valor y fuera de alcance).

## Riesgos y mitigaciones

- **Fuga de datos por rol** (el riesgo central): mitigado por la unión discriminada (D1) + tests puros
  que verifican, para cada rol, que la respuesta **no contiene** las claves prohibidas (SC-003/SC-004).
- **Divergencia con la tabla económica**: mitigado reutilizando los derivados de S15 (D4).
