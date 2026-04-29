import type { PrismaClient } from "@prisma/client";

const PERIOD_MS = 365 * 24 * 60 * 60 * 1000;

export type CostingOrderWorkload = {
  ordersInPeriod: number;
  avgWorksPerMonth: number;
  periodLabel: string;
};

export async function getOrderWorkloadLast12Months(
  prisma: PrismaClient,
): Promise<CostingOrderWorkload> {
  const since = new Date(Date.now() - PERIOD_MS);
  const ordersInPeriod = await prisma.order.count({
    where: { createdAt: { gte: since } },
  });
  return {
    ordersInPeriod,
    avgWorksPerMonth: ordersInPeriod / 12,
    periodLabel: "за последние 365 дней (норяды в CRM)",
  };
}
