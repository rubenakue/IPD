import { AgentRole, AgentStatus, BudgetStatus } from '../../generated/prisma/client.ts';
import { calculateFRC } from '../../lib/calculations/frc.ts';
import { projectFrcForRole, type FrcBoard } from '../../lib/frc/visibility.ts';
import type { DbClient } from '../../lib/db/client.ts';
import type { AgentRole as DomainAgentRole, AgentFrcTerms } from '../../types/domain.ts';
import type { FrcAgentRow, ProjectFrcResponse, ProjectRoleCode } from '../../types/api.ts';
import { withRlsContext } from '../db/rls.ts';
import { hasPermission } from '../permissions/matrix.ts';
import type { ProjectAgentContext } from '../permissions/project-agent.ts';
import { getProjectEconomics } from './economics.ts';

/** Roles que son parte del fondo: solo estos entran en el reparto del FRC (§9.5). */
const FUND_ROLES = [AgentRole.PROMOTER, AgentRole.CONSTRUCTOR, AgentRole.DESIGNER];

/** DB AgentRole (parte del fondo) → rol de dominio que entiende calculateFRC. */
const DB_TO_DOMAIN_ROLE: Partial<Record<AgentRole, DomainAgentRole>> = {
  [AgentRole.PROMOTER]: 'promoter',
  [AgentRole.CONSTRUCTOR]: 'constructor',
  [AgentRole.DESIGNER]: 'designer',
};

/** DB AgentRole → rol expuesto por la API (mismo conjunto de literales). */
const DB_TO_PROJECT_ROLE: Record<AgentRole, ProjectRoleCode> = {
  [AgentRole.PROMOTER]: 'PROMOTER',
  [AgentRole.DESIGNER]: 'DESIGNER',
  [AgentRole.CONSTRUCTOR]: 'CONSTRUCTOR',
  [AgentRole.PROJECT_MANAGER]: 'PROJECT_MANAGER',
  [AgentRole.OBSERVER]: 'OBSERVER',
};

interface FundAgentRow {
  id: string;
  role: AgentRole;
  sharePercent: number;
  guaranteedFee: bigint;
  feeAtRisk: bigint;
  user: { displayName: string };
}

/**
 * Estado del FRC del proyecto, filtrado por rol del solicitante (§9.5, Principio V).
 *
 * Arma el cuadro completo (derivado, no persistido) a partir del presupuesto vigente y la
 * previsión a cierre de S15 y de las condiciones de los agentes, lo pasa por `calculateFRC()`,
 * y delega el recorte por rol en `projectFrcForRole()`. Solo hay reparto sobre un presupuesto
 * APROBADO; en otro caso el fondo va "sin datos" (estado neutro, sin filas).
 */
export async function getProjectFrc(
  prisma: DbClient,
  userId: string,
  projectId: string,
  requester: ProjectAgentContext,
): Promise<ProjectFrcResponse> {
  // Vigente y previsión totales: mismos números que la tabla económica (coherencia con S15).
  const economics = await getProjectEconomics(prisma, userId, projectId);

  // Agentes que participan en el fondo (partes con reparto > 0), con su nombre.
  const fundAgents = (await withRlsContext(prisma, { userId, projectId }, (tx) =>
    tx.agent.findMany({
      where: {
        projectId,
        status: AgentStatus.ACTIVE,
        role: { in: FUND_ROLES },
        sharePercent: { gt: 0 },
      },
      select: {
        id: true,
        role: true,
        sharePercent: true,
        guaranteedFee: true,
        feeAtRisk: true,
        user: { select: { displayName: true } },
      },
    }),
  )) as FundAgentRow[];

  const canViewGlobal = hasPermission(requester.role, 'frc.global.view');
  const canViewOwn = hasPermission(requester.role, 'frc.own.view');
  const participates = fundAgents.some((agent) => agent.id === requester.agentId);
  const projectionRequester = {
    agentId: requester.agentId,
    canViewGlobal,
    canViewOwn,
    participates,
  };

  // Sin presupuesto aprobado: el fondo no tiene datos (edge case de la spec).
  if (economics.budgetStatus !== BudgetStatus.APPROVED) {
    const board: FrcBoard = { budgetStatus: economics.budgetStatus, deviationCents: 0, rows: [] };
    return projectFrcForRole(board, projectionRequester);
  }

  const terms: AgentFrcTerms[] = fundAgents.map((agent) => ({
    agentId: agent.id,
    role: DB_TO_DOMAIN_ROLE[agent.role] as DomainAgentRole, // garantizado por el filtro FUND_ROLES
    sharePercent: agent.sharePercent,
    guaranteedFee: Number(agent.guaranteedFee),
    feeAtRisk: Number(agent.feeAtRisk),
  }));

  const result = calculateFRC({
    currentBudget: economics.totals.currentBudgetCents,
    forecastAtCompletion: economics.totals.forecastCents,
    agents: terms,
  });

  const byId = new Map(fundAgents.map((agent) => [agent.id, agent]));
  const rows: FrcAgentRow[] = result.agents.map((agentResult) => {
    const meta = byId.get(agentResult.agentId);
    return {
      agentId: agentResult.agentId,
      displayName: meta?.user.displayName ?? '',
      role: meta ? DB_TO_PROJECT_ROLE[meta.role] : 'OBSERVER',
      bonusMalusCents: agentResult.bonusMalus,
      guaranteedFeeCents: meta ? Number(meta.guaranteedFee) : 0,
      totalCents: agentResult.total,
    };
  });

  const board: FrcBoard = {
    budgetStatus: economics.budgetStatus,
    deviationCents: result.deviation,
    rows,
  };
  return projectFrcForRole(board, projectionRequester);
}
