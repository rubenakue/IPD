import type { ProjectRoleCode } from '../types/api.ts';

// Etiqueta de UI en español para cada rol de proyecto (presentación, no se persiste).
const ROLE_LABELS: Record<ProjectRoleCode, string> = {
  PROMOTER: 'Promotor',
  PROJECT_MANAGER: 'PM',
  CONSTRUCTOR: 'Constructor',
  DESIGNER: 'Proyectista',
  OBSERVER: 'Observador',
};

export function roleLabel(role: ProjectRoleCode): string {
  return ROLE_LABELS[role];
}
