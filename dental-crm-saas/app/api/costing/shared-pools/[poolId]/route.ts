import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { requireCostingOwner } from "@/lib/auth/costing-guard";

export const dynamic = "force-dynamic";

const KEY_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

type Ctx = { params: Promise<{ poolId: string }> };

type PatchBody = {
  key?: string;
  label?: string;
  totalRub?: number;
  sortOrder?: number;
};

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { poolId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const prisma = await getPrisma();

  const data: { key?: string; label?: string; totalRub?: number; sortOrder?: number } = {};
  if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim();
  if (typeof body.totalRub === "number" && Number.isFinite(body.totalRub)) {
    data.totalRub = body.totalRub;
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.trunc(body.sortOrder);
  }
  if (typeof body.key === "string" && body.key.trim()) {
    const k = body.key.trim();
    if (!KEY_RE.test(k)) {
      return NextResponse.json({ error: "Некорректный ключ" }, { status: 400 });
    }
    data.key = k;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет полей" }, { status: 400 });
  }

  try {
    const row = await prisma.costingSharedPool.update({
      where: { id: poolId },
      data,
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Не обновлено" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { poolId } = await ctx.params;
  const prisma = await getPrisma();
  try {
    await prisma.costingSharedPool.delete({ where: { id: poolId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалено" }, { status: 404 });
  }
}
