import { Badge } from '@mantine/core';
import { roleLabel } from '../../lib/roles.ts';
import type { ProjectRoleCode } from '../../types/api.ts';

export function RoleBadge({ role }: { role: ProjectRoleCode }) {
  return <Badge variant="light">{roleLabel(role)}</Badge>;
}
