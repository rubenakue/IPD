// Contrato HTTP de la API IPD, COMPARTIDO entre el servidor (src/server) y el
// futuro frontend. No es dominio (eso vive en domain.ts): es transporte.
// La forma del error la fija docs/concepto-global.md §14.3.

/** Códigos de error de la API. Lista cerrada (§14.3). */
export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'DOMAIN_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

/** Cuerpo de TODA respuesta de error de la API (§14.3). */
export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details: Record<string, unknown>;
  };
}

/** Roles de proyecto expuestos por la API. No reutiliza AgentRole de FRC. */
export type ProjectRoleCode =
  | 'PROMOTER'
  | 'DESIGNER'
  | 'CONSTRUCTOR'
  | 'PROJECT_MANAGER'
  | 'OBSERVER';

export interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  projects: {
    id: string;
    code: string;
    name: string;
    agentId: string;
    role: ProjectRoleCode;
  }[];
}

export interface LogoutResponse {
  ok: true;
}

export interface PromoterPrivateCostsResponse {
  costs: {
    id: string;
    projectId: string;
    label: string;
    amountCents: number;
    incurredAt: string | null;
    createdAt: string;
  }[];
}

// ── S12: setup de proyecto (crear proyecto y configurar agentes) ──
// Honorarios en CÉNTIMOS enteros (la conversión a/desde euros ocurre en la UI).

export interface CreateProjectRequest {
  name: string;
  code: string;
  clientName: string;
  description?: string;
}

/** Proyecto recién creado; misma forma que `CurrentUserResponse.projects[]`. */
export interface CreateProjectResponse {
  id: string;
  code: string;
  name: string;
  agentId: string;
  role: ProjectRoleCode;
}

export interface AgentView {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: ProjectRoleCode;
  sharePercent: number;
  guaranteedFeeCents: number;
  feeAtRiskCents: number;
}

export interface AddAgentRequest {
  email: string;
  role: ProjectRoleCode;
  sharePercent: number;
  guaranteedFeeCents: number;
  feeAtRiskCents: number;
}

export type UpdateAgentRequest = Partial<Omit<AddAgentRequest, 'email'>>;

export interface ProjectAgentsResponse {
  agents: AgentView[];
  /** Suma de los porcentajes de reparto (derivado, no persistido). */
  shareSum: number;
  /** `true` cuando `shareSum === 100` (gate de configuración completa). */
  isComplete: boolean;
}

// -- S13: presupuesto objetivo (flujo B) --
// Importes en CENTIMOS enteros. La UI convierte desde/hacia euros.

export type BudgetStatusCode = 'DRAFT' | 'APPROVED';

export interface BudgetLineView {
  id: string;
  chapterCode: string;
  chapterName: string;
  code: string;
  name: string;
  baseAmountCents: number;
}

export interface BudgetChapterView {
  chapterCode: string;
  chapterName: string;
  subtotalBaseAmountCents: number;
  lines: BudgetLineView[];
}

export interface BudgetView {
  id: string;
  projectId: string;
  status: BudgetStatusCode;
  approvedAt: string | null;
  createdAt: string;
  totalBaseAmountCents: number;
  chapters: BudgetChapterView[];
}

export interface ProjectBudgetResponse {
  budget: BudgetView | null;
  /** `budget.upload` (PM): cargar/editar/aprobar el presupuesto y anular costes. */
  canManageBudget: boolean;
  /** `realCost.create`/`progress.update` (constructor + PM): imputar costes y avance. */
  canRecordRealCost: boolean;
}

export interface BudgetLineInput {
  chapterCode: string;
  chapterName: string;
  code: string;
  name: string;
  baseAmountCents: number;
}

export type UpdateBudgetLineRequest = Partial<BudgetLineInput>;

// -- S14: costes reales, contra-asientos y avance fisico (flujo C) --
// Importes en CENTIMOS con signo (un REVERSAL es negativo). La UI convierte a/desde euros.

export type RealCostTypeCode = 'NORMAL' | 'REVERSAL';

export interface RealCostView {
  id: string;
  amountCents: number;
  type: RealCostTypeCode;
  /** Descripcion del asiento. En un contra-asiento, refleja el motivo de la anulacion. */
  description: string;
  /** Motivo de la anulacion: solo en contra-asientos (REVERSAL); null en los normales. */
  reason: string | null;
  /** Fecha del coste (ISO YYYY-MM-DD). */
  incurredOn: string;
  recordedByName: string;
  createdAt: string;
  /** Derivado: un asiento NORMAL que tiene un contra-asiento vinculado. */
  voided: boolean;
  /** Id del asiento original que este contra-asiento anula (null en los normales). */
  reversalOfId: string | null;
}

export interface BudgetLineDetailView {
  id: string;
  chapterCode: string;
  chapterName: string;
  code: string;
  name: string;
  baseAmountCents: number;
  /** 0-100, o null si nadie ha registrado avance todavia (!= 0%). */
  progressPercent: number | null;
  progressUpdatedAt: string | null;
  /** Derivado: suma de todos los asientos (los contra-asientos restan). */
  accumulatedCostCents: number;
  costs: RealCostView[];
}

export interface AddRealCostRequest {
  amountCents: number;
  incurredOn: string;
  description: string;
}

export interface ReverseRealCostRequest {
  reason: string;
}

export interface UpdateProgressRequest {
  progressPercent: number;
}

// -- S15: derivados economicos y alertas de desviacion --
// Todo en CENTIMOS. Salvo manualForecastCents (almacenado), TODO es derivado (no se persiste).

export type AlertLevel = 'normal' | 'warning' | 'alert';

/** Magnitudes agregables de una fila/grupo económico (todas derivadas). */
export interface EconomicsAmounts {
  currentBudgetCents: number;
  accumulatedCostCents: number;
  forecastCents: number;
  varianceCents: number;
  /** Desviación % sobre el vigente; null si el vigente es 0. */
  variancePercent: number | null;
  alertLevel: AlertLevel;
}

export interface EconomicsLineView extends EconomicsAmounts {
  id: string;
  code: string;
  name: string;
  baseAmountCents: number;
  adjustmentsCents: number;
  progressPercent: number | null;
  /** Previsión manual almacenada (céntimos) o null si rige la regla por defecto. */
  manualForecastCents: number | null;
}

export interface EconomicsChapterView extends EconomicsAmounts {
  chapterCode: string;
  chapterName: string;
  lines: EconomicsLineView[];
}

export interface ProjectEconomicsResponse {
  budgetStatus: BudgetStatusCode | null;
  /** `forecast.update` (constructor + PM): fijar/eliminar la previsión manual. */
  canUpdateForecast: boolean;
  chapters: EconomicsChapterView[];
  totals: EconomicsAmounts;
}

export interface SetForecastRequest {
  /** Céntimos > 0 para fijar la previsión manual, o null para volver al default. */
  manualForecastCents: number | null;
}

// -- S16: FRC servido por rol (flujo G parcial) --
// El resultado del FRC es DERIVADO (no se persiste) y se calcula al consultar. La respuesta es
// una UNIÓN DISCRIMINADA por `visibility`: el servidor solo serializa lo que el rol puede ver
// (§9.5). Importes en CÉNTIMOS enteros.

/** Estado agregado del fondo, derivado de la desviación total. */
export type FrcFundStatus = 'bonus' | 'neutral' | 'malus';

/** Qué porción del FRC ve el solicitante (discriminante de la respuesta). */
export type FrcVisibility = 'global' | 'own' | 'aggregate';

/** Resultado de un agente en el reparto (solo presente en `global`/`own`). */
export interface FrcAgentRow {
  agentId: string;
  /** Nombre del usuario, para presentación. */
  displayName: string;
  /** Rol expuesto por la API (no el AgentRole de dominio del cálculo puro). */
  role: ProjectRoleCode;
  /** Reparto aplicado: + bonus (ahorro) / − malus (sobrecoste). */
  bonusMalusCents: number;
  guaranteedFeeCents: number;
  /** guaranteedFee + bonusMalus. */
  totalCents: number;
}

/** Común a las tres variantes de la respuesta del FRC. */
interface FrcResponseBase {
  /** null o no-APPROVED → sin datos de reparto (el FRC necesita base aprobada). */
  budgetStatus: BudgetStatusCode | null;
  fundStatus: FrcFundStatus;
}

/** Promotor / PM: cuadro completo del reparto. */
export interface FrcGlobalResponse extends FrcResponseBase {
  visibility: 'global';
  deviationCents: number;
  agents: FrcAgentRow[];
}

/** Constructor / proyectista que participa en el fondo: su fila + desviación total + estado. */
export interface FrcOwnResponse extends FrcResponseBase {
  visibility: 'own';
  deviationCents: number;
  /** `null` solo cuando no hay datos de reparto (presupuesto sin aprobar). */
  own: FrcAgentRow | null;
}

/** Observador o agente al 0 %: solo el estado agregado, sin importes (FR-009/FR-011). */
export interface FrcAggregateResponse extends FrcResponseBase {
  visibility: 'aggregate';
  // sin deviationCents, sin agents, sin own
}

export type ProjectFrcResponse = FrcGlobalResponse | FrcOwnResponse | FrcAggregateResponse;
