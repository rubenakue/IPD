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
  canManageBudget: boolean;
}

export interface BudgetLineInput {
  chapterCode: string;
  chapterName: string;
  code: string;
  name: string;
  baseAmountCents: number;
}

export type UpdateBudgetLineRequest = Partial<BudgetLineInput>;
