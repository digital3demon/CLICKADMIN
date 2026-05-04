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
          select: {
            id: true,
            code: true,
            name: true,
            priceRub: true,
            sectionTitle: true,
            subsectionTitle: true,
            sortOrder: true,
          },
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

  const sortedLines = [...lines].sort((a, b) => {
    const aHas = a.priceListItem != null;
    const bHas = b.priceListItem != null;
    if (aHas !== bHas) return aHas ? -1 : 1;
    const aSection = a.priceListItem?.sectionTitle ?? "";
    const bSection = b.priceListItem?.sectionTitle ?? "";
    const secCmp = aSection.localeCompare(bSection, "ru", { sensitivity: "base" });
    if (secCmp !== 0) return secCmp;
    const aSub = a.priceListItem?.subsectionTitle ?? "";
    const bSub = b.priceListItem?.subsectionTitle ?? "";
    const subCmp = aSub.localeCompare(bSub, "ru", { sensitivity: "base" });
    if (subCmp !== 0) return subCmp;
    const aSort = a.priceListItem?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bSort = b.priceListItem?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (aSort !== bSort) return aSort - bSort;
    const aCode = a.priceListItem?.code ?? "";
    const bCode = b.priceListItem?.code ?? "";
    const codeCmp = aCode.localeCompare(bCode, "ru", { sensitivity: "base" });
    if (codeCmp !== 0) return codeCmp;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return NextResponse.json({
    version,
    columns,
    lines: sortedLines,
    profiles,
    sharedPools,
    fixedCostItems,
    workload,
  });
}
