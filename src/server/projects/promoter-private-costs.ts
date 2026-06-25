import type { PromoterPrivateCostsResponse } from '../../types/api.ts';
import type { RlsTransaction } from '../db/rls.ts';

export async function getPromoterPrivateCosts(
  tx: RlsTransaction,
  projectId: string,
): Promise<PromoterPrivateCostsResponse> {
  const costs = await tx.promoterPrivateCost.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });

  return {
    costs: costs.map((cost) => ({
      id: cost.id,
      projectId: cost.projectId,
      label: cost.label,
      amountCents: Number(cost.amount),
      incurredAt: cost.incurredAt?.toISOString() ?? null,
      createdAt: cost.createdAt.toISOString(),
    })),
  };
}
