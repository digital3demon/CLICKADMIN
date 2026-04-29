import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { requireCostingOwner } from "@/lib/auth/costing-guard";
import { syncMonthlyFixedCostsFromItems } from "@/lib/costing-fixed-costs-sync.server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ itemId: string }> };

type PatchBody = {
  label?: string;
  amountRub?: number;
  sortOrder?: number;
};

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { itemId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const prisma = await getPrisma();

  const existing = await prisma.costingFixedCostItem.findUnique({
    where: { id: itemId },
    select: { id: true, versionId: true },
  });
  if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const data: { label?: string; amountRub?: number; sortOrder?: number } = {};
  if (typeof body.label === "string") {
    data.label = body.label.trim() || "Статья";
  }
  if (typeof body.amountRub === "number" && Number.isFinite(body.amountRub)) {
    data.amountRub = Math.max(0, body.amountRub);
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.trunc(body.sortOrder);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  const row = await prisma.costingFixedCostItem.update({
    where: { id: itemId },
    data,
  });
  await syncMonthlyFixedCostsFromItems(prisma, existing.versionId);
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { itemId } = await ctx.params;
  const prisma = await getPrisma();

  const existing = await prisma.costingFixedCostItem.findUnique({
    where: { id: itemId },
    select: { id: true, versionId: true },
  });
  if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  await prisma.costingFixedCostItem.delete({ where: { id: itemId } });
  await syncMonthlyFixedCostsFromItems(prisma, existing.versionId);
  return NextResponse.json({ ok: true });
}
