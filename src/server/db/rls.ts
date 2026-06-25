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
