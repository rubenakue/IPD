import { AgentRole } from '../../generated/prisma/client.ts';

export type PermissionAction =
  | 'project.view'
  | 'project.edit'
  | 'sharedCosts.view'
  | 'promoterPrivateCosts.view'
  | 'budget.upload'
  | 'realCost.create'
  | 'realCost.reverse'
  | 'progress.update'
  | 'forecast.update'
  | 'frc.own.view'
  | 'frc.global.view'
  | 'risk.create'
  | 'incident.create'
  | 'change.create'
  | 'change.evaluate'
  | 'decision.create'
  | 'decision.view'
  | 'agent.manage';

const yes = true;
const no = false;

export const PERMISSION_MATRIX: Record<PermissionAction, Readonly<Record<AgentRole, boolean>>> = {
  'project.view': {
    [AgentRole.PROMOTER]: yes,
    [AgentRole.DESIGNER]: yes,
    [AgentRole.CONSTRUCTOR]: yes,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: yes,
  },
  'project.edit': {
    [AgentRole.PROMOTER]: no,
    [AgentRole.DESIGNER]: no,
    [AgentRole.CONSTRUCTOR]: no,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'sharedCosts.view': {
    [AgentRole.PROMOTER]: yes,
    [AgentRole.DESIGNER]: yes,
    [AgentRole.CONSTRUCTOR]: yes,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: yes,
  },
  'promoterPrivateCosts.view': {
    [AgentRole.PROMOTER]: yes,
    [AgentRole.DESIGNER]: no,
    [AgentRole.CONSTRUCTOR]: no,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'budget.upload': {
    [AgentRole.PROMOTER]: no,
    [AgentRole.DESIGNER]: no,
    [AgentRole.CONSTRUCTOR]: no,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'realCost.create': {
    [AgentRole.PROMOTER]: no,
    [AgentRole.DESIGNER]: no,
    [AgentRole.CONSTRUCTOR]: yes,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'realCost.reverse': {
    [AgentRole.PROMOTER]: no,
    [AgentRole.DESIGNER]: no,
    [AgentRole.CONSTRUCTOR]: no,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'progress.update': {
    [AgentRole.PROMOTER]: no,
    [AgentRole.DESIGNER]: no,
    [AgentRole.CONSTRUCTOR]: yes,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'forecast.update': {
    [AgentRole.PROMOTER]: no,
    [AgentRole.DESIGNER]: no,
    [AgentRole.CONSTRUCTOR]: yes,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'frc.own.view': {
    [AgentRole.PROMOTER]: yes,
    [AgentRole.DESIGNER]: yes,
    [AgentRole.CONSTRUCTOR]: yes,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'frc.global.view': {
    [AgentRole.PROMOTER]: yes,
    [AgentRole.DESIGNER]: no,
    [AgentRole.CONSTRUCTOR]: no,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'risk.create': {
    [AgentRole.PROMOTER]: yes,
    [AgentRole.DESIGNER]: yes,
    [AgentRole.CONSTRUCTOR]: yes,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'incident.create': {
    [AgentRole.PROMOTER]: yes,
    [AgentRole.DESIGNER]: yes,
    [AgentRole.CONSTRUCTOR]: yes,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'change.create': {
    [AgentRole.PROMOTER]: yes,
    [AgentRole.DESIGNER]: yes,
    [AgentRole.CONSTRUCTOR]: yes,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'change.evaluate': {
    [AgentRole.PROMOTER]: no,
    [AgentRole.DESIGNER]: no,
    [AgentRole.CONSTRUCTOR]: no,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'decision.create': {
    [AgentRole.PROMOTER]: no,
    [AgentRole.DESIGNER]: no,
    [AgentRole.CONSTRUCTOR]: no,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
  'decision.view': {
    [AgentRole.PROMOTER]: yes,
    [AgentRole.DESIGNER]: yes,
    [AgentRole.CONSTRUCTOR]: yes,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: yes,
  },
  'agent.manage': {
    [AgentRole.PROMOTER]: no,
    [AgentRole.DESIGNER]: no,
    [AgentRole.CONSTRUCTOR]: no,
    [AgentRole.PROJECT_MANAGER]: yes,
    [AgentRole.OBSERVER]: no,
  },
};

export function hasPermission(role: AgentRole, action: PermissionAction): boolean {
  return PERMISSION_MATRIX[action][role];
}
