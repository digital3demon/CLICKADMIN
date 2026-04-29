import type { PrismaClient } from "@prisma/client";

/** Сумма строк постоянных расходов → поле версии для отчётов и карточки «чистая прибыль». */
export async function syncMonthlyFixedCostsFromItems(
  prisma: PrismaClient,
  versionId: string,
): Promise<number> {
  const agg = await prisma.costingFixedCostItem.aggregate({
    where: { versionId },
    _sum: { amountRub: true },
  });
  const total = agg._sum.amountRub ?? 0;
  await prisma.costingVersion.update({
    where: { id: versionId },
    data: { monthlyFixedCostsRub: total },
  });
  return total;
}
