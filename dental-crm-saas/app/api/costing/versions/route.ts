import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { requireCostingOwner } from "@/lib/auth/costing-guard";
import { createCostingVersionFromDefaults } from "@/lib/costing-bootstrap.server";
import { syncMonthlyFixedCostsFromItems } from "@/lib/costing-fixed-costs-sync.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;

  const prisma = await getPrisma();
  const rows = await prisma.costingVersion.findMany({
    orderBy: [{ archived: "asc" }, { effectiveFrom: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      effectiveFrom: true,
      archived: true,
      createdAt: true,
      _count: {
        select: { columns: true, lines: true, profiles: true, sharedPools: true, fixedCostItems: true },
      },
    },
  });
  return NextResponse.json(rows);
}

type PostBody = {
  title?: string;
  fromDefaults?: boolean;
  duplicateFromId?: string;
  effectiveFrom?: string | null;
};

export async function POST(req: Request) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;

  const body = (await req.json().catch(() => ({}))) as PostBody;
  const prisma = await getPrisma();

  if (body.fromDefaults) {
    const v = await createCostingVersionFromDefaults(prisma);
    return NextResponse.json({ id: v.id });
  }

  if (body.duplicateFromId?.trim()) {
    const src = await prisma.costingVersion.findUnique({
      where: { id: body.duplicateFromId.trim() },
      include: {
        columns: true,
        lines: { include: { poolShares: true } },
        profiles: true,
        sharedPools: true,
        fixedCostItems: true,
      },
    });
    if (!src) {
      return NextResponse.json({ error: "Версия не найдена" }, { status: 404 });
    }
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : `${src.title} (копия)`;
    const effectiveFrom =
      body.effectiveFrom === undefined
        ? src.effectiveFrom
        : body.effectiveFrom === null || body.effectiveFrom === ""
          ? null
          : new Date(body.effectiveFrom);

    const nv = await prisma.costingVersion.create({
      data: {
        title,
        effectiveFrom:
          effectiveFrom instanceof Date && !Number.isNaN(effectiveFrom.getTime())
            ? effectiveFrom
            : null,
        archived: false,
        monthlyFixedCostsRub: 0,
        fixedCostsPeriodNote: src.fixedCostsPeriodNote ?? null,
        expectedWorksPerMonth: src.expectedWorksPerMonth ?? null,
      },
    });
    await prisma.costingColumn.createMany({
      data: src.columns.map((c) => ({
        versionId: nv.id,
        key: c.key,
        label: c.label,
        kind: c.kind,
        formula: c.formula,
        sortOrder: c.sortOrder,
        hint: c.hint,
      })),
    });

    const poolIdMap = new Map<string, string>();
    for (const p of [...src.sharedPools].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const created = await prisma.costingSharedPool.create({
        data: {
          versionId: nv.id,
          key: p.key,
          label: p.label,
          totalRub: p.totalRub,
          sortOrder: p.sortOrder,
        },
        select: { id: true },
      });
      poolIdMap.set(p.id, created.id);
    }

    const lineIdMap = new Map<string, string>();
    for (const ln of src.lines) {
      const created = await prisma.costingLine.create({
        data: {
          versionId: nv.id,
          priceListItemId: ln.priceListItemId,
          inputsJson: ln.inputsJson === null ? {} : (ln.inputsJson as object),
          note: ln.note,
        },
        select: { id: true },
      });
      lineIdMap.set(ln.id, created.id);
    }

    for (const ln of src.lines) {
      const newLineId = lineIdMap.get(ln.id);
      if (!newLineId) continue;
      for (const sh of ln.poolShares) {
        const newPoolId = poolIdMap.get(sh.poolId);
        if (!newPoolId) continue;
        await prisma.costingLinePoolShare.create({
          data: {
            lineId: newLineId,
            poolId: newPoolId,
            shareRub: sh.shareRub,
          },
        });
      }
    }
    for (const pr of src.profiles) {
      await prisma.costingClientProfile.create({
        data: {
          versionId: nv.id,
          clinicId: null,
          name: pr.name,
          listDiscountPercent: pr.listDiscountPercent,
          note: pr.note,
        },
      });
    }
    for (const it of [...src.fixedCostItems].sort((a, b) => a.sortOrder - b.sortOrder)) {
      await prisma.costingFixedCostItem.create({
        data: {
          versionId: nv.id,
          label: it.label,
          amountRub: it.amountRub,
          sortOrder: it.sortOrder,
        },
      });
    }
    await syncMonthlyFixedCostsFromItems(prisma, nv.id);
    return NextResponse.json({ id: nv.id });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json(
      { error: "Укажите название или fromDefaults / duplicateFromId" },
      { status: 400 },
    );
  }
  const effectiveFrom =
    body.effectiveFrom === undefined || body.effectiveFrom === null || body.effectiveFrom === ""
      ? null
      : new Date(body.effectiveFrom);
  const v = await prisma.costingVersion.create({
    data: {
      title,
      effectiveFrom:
        effectiveFrom instanceof Date && !Number.isNaN(effectiveFrom.getTime())
          ? effectiveFrom
          : null,
    },
  });
  return NextResponse.json({ id: v.id });
}
