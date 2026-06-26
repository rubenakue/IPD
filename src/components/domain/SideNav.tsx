import { Badge, NavLink } from '@mantine/core';
import { NavLink as RouterNavLink } from 'react-router';
import { useActiveProject } from '../../context/ProjectContext.tsx';
import { PROJECT_SECTIONS } from '../../lib/sections.ts';

/**
 * Menú lateral con la estructura completa de módulos (§6.1). Las secciones aún no
 * implementadas en S11 se marcan como "Próximamente" pero siguen siendo navegables
 * (muestran un marcador de posición), sin enlaces rotos (FR-011, FR-011a).
 */
export function SideNav() {
  const project = useActiveProject();
  return (
    <>
      {PROJECT_SECTIONS.map((section) => (
        <NavLink
          key={section.key}
          component={RouterNavLink}
          to={`/projects/${project.id}/${section.key}`}
          label={section.label}
          rightSection={
            section.ready ? undefined : (
              <Badge size="xs" variant="light" color="gray">
                Próximamente
              </Badge>
            )
          }
        />
      ))}
    </>
  );
}
