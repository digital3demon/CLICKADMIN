import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { requireCostingOwner } from "@/lib/auth/costing-guard";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { id } = await ctx.params;
  const prisma = await getPrisma();
  const v = await prisma.costingVersion.findUnique({
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
  if (!v) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json(v);
}

type PatchBody = {
  title?: string;
  effectiveFrom?: string | null;
  archived?: boolean;
  monthlyFixedCostsRub?: number;
  fixedCostsPeriodNote?: string | null;
  expectedWorksPerMonth?: number | null;
};

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const prisma = await getPrisma();

  const data: {
    title?: string;
    effectiveFrom?: Date | null;
    archived?: boolean;
    monthlyFixedCostsRub?: number;
    fixedCostsPeriodNote?: string | null;
    expectedWorksPerMonth?: number | null;
  } = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (body.effectiveFrom === null || body.effectiveFrom === "") {
    data.effectiveFrom = null;
  } else if (typeof body.effectiveFrom === "string" && body.effectiveFrom.trim()) {
    const d = new Date(body.effectiveFrom);
    if (!Number.isNaN(d.getTime())) data.effectiveFrom = d;
  }
  if (typeof body.archived === "boolean") data.archived = body.archived;
  if (typeof body.monthlyFixedCostsRub === "number" && Number.isFinite(body.monthlyFixedCostsRub)) {
    data.monthlyFixedCostsRub = Math.max(0, body.monthlyFixedCostsRub);
  }
  if (body.fixedCostsPeriodNote !== undefined) {
    data.fixedCostsPeriodNote =
      typeof body.fixedCostsPeriodNote === "string"
        ? body.fixedCostsPeriodNote.trim() || null
        : body.fixedCostsPeriodNote === null
          ? null
          : undefined;
  }
  if (body.expectedWorksPerMonth === null) {
    data.expectedWorksPerMonth = null;
  } else if (typeof body.expectedWorksPerMonth === "number" && Number.isFinite(body.expectedWorksPerMonth)) {
    data.expectedWorksPerMonth = Math.max(0, body.expectedWorksPerMonth);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  try {
    const v = await prisma.costingVersion.update({
      where: { id },
      data,
    });
    return NextResponse.json(v);
  } catch {
    return NextResponse.json({ error: "Не обновлено" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { id } = await ctx.params;
  const prisma = await getPrisma();
  try {
    await prisma.costingVersion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалено" }, { status: 404 });
  }
}
