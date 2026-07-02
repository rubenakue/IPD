# API Contracts — FRC servido por rol (S16)

`requireAuth` + `requireProjectPermission(prisma, 'project.view')` + RLS. Importes en
**céntimos** (enteros con signo). Errores con el sobre estándar §14.3.

La clave del contrato: **una misma petición devuelve formas distintas según el rol** del
solicitante. El servidor recorta el contenido (Principio V); la respuesta es una **unión
discriminada por `visibility`** — el JSON del observador ni siquiera contiene los campos que
no le corresponden.

## GET /api/projects/:projectId/frc

Estado del FRC del proyecto, filtrado por rol. Permiso de puerta: `project.view` (cualquier
participante). El **contenido** se decide en el servidor por el rol (§9.5):

- **PROMOTER / PROJECT_MANAGER** → `frc.global.view` → cuadro completo.
- **DESIGNER / CONSTRUCTOR** con `sharePercent > 0` → `frc.own.view` efectivo → su fila +
  desviación total + estado.
- **DESIGNER / CONSTRUCTOR** con `sharePercent = 0` y **OBSERVER** → solo estado agregado.

### 200 OK — `visibility: "global"` (promotor / PM)

```jsonc
{
  "visibility": "global",
  "budgetStatus": "APPROVED",
  "fundStatus": "malus",            // bonus | neutral | malus
  "deviationCents": -1000000,       // vigente − previsión (− = sobrecoste)
  "agents": [
    {
      "agentId": "ckag...", "displayName": "Constructora Vivare S.A.",
      "role": "CONSTRUCTOR",
      "bonusMalusCents": -600000, "guaranteedFeeCents": 4000000, "totalCents": 3400000
    },
    {
      "agentId": "ckag...", "displayName": "Estudio Arqui",
      "role": "DESIGNER",
      "bonusMalusCents": -400000, "guaranteedFeeCents": 2000000, "totalCents": 1600000
    }
    // ... resto de partes del fondo
  ]
}
```
- `Σ agents[].bonusMalusCents == deviationCents` (al céntimo) en un caso conocido (SC-002).

### 200 OK — `visibility: "own"` (constructor / proyectista)

```jsonc
{
  "visibility": "own",
  "budgetStatus": "APPROVED",
  "fundStatus": "malus",
  "deviationCents": -1000000,
  "own": {
    "agentId": "ckag...", "displayName": "Constructora Vivare S.A.",
    "role": "CONSTRUCTOR",
    "bonusMalusCents": -600000, "guaranteedFeeCents": 4000000, "totalCents": 3400000
  }
}
```
- **Nunca** incluye `agents[]` ni la fila de otro agente (SC-003).
- Esta forma solo se usa cuando el solicitante participa en el fondo (`sharePercent > 0`). Si no
  participa, recibe `visibility: "aggregate"` (FR-011).

### 200 OK — `visibility: "aggregate"` (observador o agente 0 %)

```jsonc
{
  "visibility": "aggregate",
  "budgetStatus": "APPROVED",
  "fundStatus": "malus"
}
```
- **No** contiene `deviationCents`, `agents` ni `own` (FR-009 / SC-004).

### Sin presupuesto aprobado

Para cualquier `visibility`, si el `Budget` no está `APPROVED` (o no existe): `fundStatus: "neutral"`,
`budgetStatus` refleja el estado real (`"DRAFT"` / `null`), y no hay filas
(`agents: []` / `own: null` solo si la visibilidad por rol era `global`/`own`; en `aggregate`
solo el estado). El FRC necesita base aprobada y
previsión (edge case de la spec).

### Errores

- `404 NOT_FOUND` si el solicitante **no es agente activo** del proyecto (vía
  `requireProjectPermission` → `resolveProjectAgent`) — cubre FR-004 / SC-005.
- `401 UNAUTHENTICATED` sin sesión.

## Notas

- Todo lo que devuelve este endpoint es **derivado**, calculado al consultar; no se persiste
  (Principio IV). No registra `AuditEvent` (lectura, como `GET /budget/economics`).
- El vigente y la previsión totales se toman de los derivados de S15 para que la desviación del
  FRC cuadre con la tabla económica.
- `role` en las filas es el rol expuesto por la API (`ProjectRoleCode`), no el `AgentRole` de
  dominio del cálculo puro.
