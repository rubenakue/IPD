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
