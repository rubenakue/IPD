import { Prisma } from '../../generated/prisma/client.ts';
import type { DbClient } from '../../lib/db/client.ts';

export type RlsTransaction = Prisma.TransactionClient;

export interface RlsContext {
  userId: string;
  projectId: string;
}

export async function withRlsContext<T>(
  prisma: DbClient,
  context: RlsContext,
  work: (tx: RlsTransaction) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE ipd_app');
    await tx.$executeRaw`SELECT set_config('ipd.current_user_id', ${context.userId}, true)`;
    await tx.$executeRaw`SELECT set_config('ipd.current_project_id', ${context.projectId}, true)`;

    return work(tx);
  });
}

/**
 * Variante de contexto RLS para el BOOTSTRAP de creación de proyecto: fija solo el
 * usuario (aún no existe `projectId`). Las políticas de INSERT de creación dependen de
 * `ipd.current_user_id` (ver migración `project_creation_rls`). El resto de operaciones
 * con un proyecto ya existente usan `withRlsContext`.
 */
export async function withUserRlsContext<T>(
  prisma: DbClient,
  userId: string,
  work: (tx: RlsTransaction) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE ipd_app');
    await tx.$executeRaw`SELECT set_config('ipd.current_user_id', ${userId}, true)`;

    return work(tx);
  });
}
