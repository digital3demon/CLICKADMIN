import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { requireCostingOwner } from "@/lib/auth/costing-guard";
import { getOrderWorkloadLast12Months } from "@/lib/costing-order-workload.server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { id } = await ctx.params;
  const prisma = await getPrisma();

  const version = await prisma.costingVersion.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      effectiveFrom: true,
      archived: true,
      monthlyFixedCostsRub: true,
      fixedCostsPeriodNote: true,
      expectedWorksPerMonth: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!version) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const [columns, lines, profiles, sharedPools, fixedCostItems, workload] = await Promise.all([
    prisma.costingColumn.findMany({
      where: { versionId: id },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.costingLine.findMany({
      where: { versionId: id },
      orderBy: { createdAt: "asc" },
      include: {
        priceListItem: {
          select: { id: true, code: true, name: true, priceRub: true },
        },
        poolShares: true,
      },
    }),
    prisma.costingClientProfile.findMany({
      where: { versionId: id },
      orderBy: { name: "asc" },
      include: { clinic: { select: { id: true, name: true } } },
    }),
    prisma.costingSharedPool.findMany({
      where: { versionId: id },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.costingFixedCostItem.findMany({
      where: { versionId: id },
      orderBy: { sortOrder: "asc" },
    }),
    getOrderWorkloadLast12Months(prisma),
  ]);

  return NextResponse.json({ version, columns, lines, profiles, sharedPools, fixedCostItems, workload });
}
