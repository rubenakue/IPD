import type { ProjectAgentContext } from '../permissions/project-agent.ts';

declare global {
  namespace Express {
    interface Request {
      projectAgent?: ProjectAgentContext;
    }
  }
}

