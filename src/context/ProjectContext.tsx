import { createContext, useContext, type ReactNode } from 'react';
import type { CurrentUserResponse } from '../types/api.ts';

/** El proyecto activo es uno de los proyectos que `GET /api/me` entrega para el usuario. */
export type ActiveProject = CurrentUserResponse['projects'][number];

const ProjectContext = createContext<ActiveProject | null>(null);

export function ProjectProvider({
  project,
  children,
}: {
  project: ActiveProject;
  children: ReactNode;
}) {
  return <ProjectContext.Provider value={project}>{children}</ProjectContext.Provider>;
}

export function useActiveProject(): ActiveProject {
  const project = useContext(ProjectContext);
  if (!project) {
    throw new Error('useActiveProject debe usarse dentro de <ProjectProvider>');
  }
  return project;
}
