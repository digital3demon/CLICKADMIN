import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { requireCostingOwner } from "@/lib/auth/costing-guard";
import { syncMonthlyFixedCostsFromItems } from "@/lib/costing-fixed-costs-sync.server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type PostBody = {
  label?: string;
  amountRub?: number;
};

export async function POST(req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { id: versionId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PostBody;

  const prisma = await getPrisma();
  const v = await prisma.costingVersion.findUnique({
    where: { id: versionId },
    select: { id: true },
  });
  if (!v) return NextResponse.json({ error: "Версия не найдена" }, { status: 404 });

  const label =
    typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Статья";
  const amountRub =
    typeof body.amountRub === "number" && Number.isFinite(body.amountRub)
      ? Math.max(0, body.amountRub)
      : 0;

  const agg = await prisma.costingFixedCostItem.aggregate({
    where: { versionId },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;

  const row = await prisma.costingFixedCostItem.create({
    data: { versionId, label, amountRub, sortOrder },
  });
  await syncMonthlyFixedCostsFromItems(prisma, versionId);
  return NextResponse.json(row);
}
