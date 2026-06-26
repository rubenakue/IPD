import { Group, Text } from '@mantine/core';
import { useActiveProject } from '../../context/ProjectContext.tsx';
import { RoleBadge } from './RoleBadge.tsx';

/**
 * Contexto siempre visible en la cabecera: proyecto, fase y rol (FR-010). La fase aún
 * no la expone el contrato (research D3): se muestra en estado neutro hasta un hito posterior.
 */
export function ProjectContextHeader() {
  const project = useActiveProject();
  return (
    <Group gap="md" wrap="nowrap">
      <Text fw={600} truncate>
        {project.name}
      </Text>
      <Text c="dimmed" size="sm">
        Fase: —
      </Text>
      <RoleBadge role={project.role} />
    </Group>
  );
}
