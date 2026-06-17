// Tipos de dominio del briefing: Project, Phase, Budget, BudgetLine, RealCost,
// Risk, Change, Incident, Decision, Agent, FRC.
// Se definen vía SDD: cada entidad llega aquí desde su spec aprobada.
//
// Esta primera tanda cubre las ENTRADAS y SALIDAS de los tres cálculos críticos
// (calculateFRC, calculateEVM, applyChange), spec 001-critical-calculations.
//
// CONVENCIÓN MONETARIA: todo importe es un entero de CÉNTIMOS (number). No se usan
// euros con decimales en el dominio. 1.000.000 € = 100_000_000 céntimos. El rango de
// un proyecto real (cientos de millones de €) queda muy por debajo de
// Number.MAX_SAFE_INTEGER, así que `number` entero es seguro para representar y sumar.

// ─────────────────────────────────────────────────────────────────────────────
// FRC — Fondo de Riesgo Compartido (calculateFRC)
// ─────────────────────────────────────────────────────────────────────────────

/** Roles relevantes para el reparto del FRC. El promotor absorbe el exceso sin tope;
 *  constructor y proyectista topan su pérdida en sus honorarios en riesgo. */
export type AgentRole = 'promoter' | 'constructor' | 'designer';

/** Condiciones económicas de un agente para el reparto del FRC (entrada). */
export interface AgentFrcTerms {
  readonly agentId: string;
  readonly role: AgentRole;
  /** Porcentaje de reparto del ahorro/sobrecoste. 58 = 58 %. Los de todos los agentes suman 100. */
  readonly sharePercent: number;
  /** Honorarios garantizados (céntimos): se cobran pase lo que pase. */
  readonly guaranteedFee: number;
  /** Honorarios en riesgo (céntimos): tope máximo de pérdida salvo para el promotor. */
  readonly feeAtRisk: number;
}

/** Entrada de calculateFRC. La desviación se mide contra la previsión a cierre (§9.4/§9.5). */
export interface FrcInput {
  /** Presupuesto vigente total (céntimos). */
  readonly currentBudget: number;
  /** Previsión a cierre total (céntimos). Por defecto, por partida, max(coste real, vigente). */
  readonly forecastAtCompletion: number;
  readonly agents: readonly AgentFrcTerms[];
}

/** Resultado del FRC para un agente (derivado: no se persiste, se calcula al vuelo). */
export interface AgentFrcResult {
  readonly agentId: string;
  readonly role: AgentRole;
  /** Reparto aplicado: positivo = bonus (ahorro), negativo = malus (sobrecoste). */
  readonly bonusMalus: number;
  /** Resultado total proyectado del agente = guaranteedFee + bonusMalus. */
  readonly total: number;
}

/** Salida de calculateFRC. */
export interface FrcResult {
  /** currentBudget − forecastAtCompletion. Positivo = ahorro; negativo = sobrecoste. */
  readonly deviation: number;
  readonly agents: readonly AgentFrcResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// EVM — Earned Value Management (calculateEVM)
// ─────────────────────────────────────────────────────────────────────────────

/** Avance físico de una partida. El EV nace de aquí, nunca del gasto ni de la planificación (§8.7). */
export interface BudgetLineProgress {
  readonly lineId: string;
  /** Presupuesto vigente de la partida (céntimos). El BAC total es la suma de estos. */
  readonly currentBudget: number;
  /** % de avance físico (0–100). `null` = sin avance registrado (≠ 0 %). */
  readonly progressPercent: number | null;
}

/** Un asiento de coste real. Los contra-asientos (anulaciones) son negativos (§8.8). */
export interface ActualCostEntry {
  readonly amount: number;
}

/** Entrada de calculateEVM. */
export interface EvmInput {
  /** BAC = Σ currentBudget; EV = Σ (currentBudget × progressPercent). */
  readonly lines: readonly BudgetLineProgress[];
  /** AC = Σ amount (neto de contra-asientos). */
  readonly actualCostEntries: readonly ActualCostEntry[];
  /** Valor planificado (céntimos). `null` = sin planificación valorada → PV/SV/SPI sin datos. */
  readonly plannedValue: number | null;
}

/** Salida de calculateEVM. Una métrica `null` significa "sin datos", NUNCA un 0 engañoso (§9.6). */
export interface EvmResult {
  /** Budget At Completion: presupuesto vigente total. Siempre calculable. */
  readonly bac: number;
  /** Earned Value: valor ganado por avance físico. `null` si no hay avance. */
  readonly ev: number | null;
  /** Actual Cost: coste real acumulado. Siempre calculable (0 si no hay asientos). */
  readonly ac: number;
  /** Planned Value. `null` si no hay planificación. */
  readonly pv: number | null;
  /** Cost Variance = EV − AC. */
  readonly cv: number | null;
  /** Schedule Variance = EV − PV. */
  readonly sv: number | null;
  /** Cost Performance Index = EV / AC (ratio, sin redondear). `null` si AC = 0. */
  readonly cpi: number | null;
  /** Schedule Performance Index = EV / PV (ratio). `null` si PV = 0 o sin planificación. */
  readonly spi: number | null;
  /** Estimate At Completion = round(BAC × AC / EV). `null` si CPI no está definido. */
  readonly eac: number | null;
  /** Estimate To Complete = EAC − AC. */
  readonly etc: number | null;
  /** Variance At Completion = BAC − EAC. */
  readonly vac: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Motor de cambios (applyChange)
// ─────────────────────────────────────────────────────────────────────────────

/** Tipos de cambio del briefing (§9.10): 1 incidental, 2 impacto en coste, 3 alcance. */
export type ChangeType = 'incidental' | 'costImpact' | 'scope';

/** Para un cambio tipo 2: a dónde aplica su importe (lo decide quien aprueba). */
export type CostImpactTarget = 'contingency' | 'budget';

/** Delta de honorarios de un agente (céntimos, con signo). */
export interface FeeAdjustment {
  readonly agentId: string;
  readonly deltaFee: number;
}

/** Porcentaje de reparto de un agente tras una reponderación (suman 100). */
export interface AgentShare {
  readonly agentId: string;
  readonly sharePercent: number;
}

/** Ajuste de presupuesto sobre una partida concreta (céntimos, con signo). */
export interface BudgetAdjustment {
  readonly lineId: string;
  readonly delta: number;
}

/** Entrada de applyChange: un cambio ya aprobado. */
export interface ApprovedChange {
  readonly changeId: string;
  readonly type: ChangeType;
  /** Impacto económico (céntimos, con signo). Tipos 2 y 3. Tipo 1 no lo usa. */
  readonly costImpact?: number;
  /** Solo tipo 2: consumir contingencia o ajustar presupuesto objetivo. */
  readonly target?: CostImpactTarget;
  /** Partidas sobre las que se reparte el ajuste de presupuesto (tipo 2 "budget" y tipo 3). */
  readonly affectedLineIds?: readonly string[];
  /** Solo tipo 3: cambios de honorarios negociados. */
  readonly feeAdjustments?: readonly FeeAdjustment[];
  /** Solo tipo 3 (opcional): nuevos porcentajes de reparto (deben sumar 100). */
  readonly newShares?: readonly AgentShare[];
}

/** Salida de applyChange: los efectos a aplicar. NO se ejecuta ninguna escritura aquí;
 *  la capa de datos (API, S20) los persiste en una transacción. */
export interface ChangeEffects {
  /** Ajustes de presupuesto por partida (vacío si el cambio no toca presupuesto). */
  readonly budgetAdjustments: readonly BudgetAdjustment[];
  /** Movimiento de la bolsa de contingencia: negativo consume, positivo repone, 0 no la toca. */
  readonly contingencyDelta: number;
  /** Cambios de honorarios (vacío si no los hay). */
  readonly feeAdjustments: readonly FeeAdjustment[];
  /** Nuevos porcentajes de reparto, o `null` si el cambio no incluye reponderación. */
  readonly newShares: readonly AgentShare[] | null;
}
