import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { requireCostingOwner } from "@/lib/auth/costing-guard";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ profileId: string }> };

type PatchBody = {
  name?: string;
  listDiscountPercent?: number;
  clinicId?: string | null;
  note?: string | null;
};

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { profileId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const prisma = await getPrisma();

  const data: {
    name?: string;
    listDiscountPercent?: number;
    clinicId?: string | null;
    note?: string | null;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.listDiscountPercent === "number" && Number.isFinite(body.listDiscountPercent)) {
    data.listDiscountPercent = Math.max(0, Math.min(100, body.listDiscountPercent));
  }
  if (body.note !== undefined) {
    if (typeof body.note === "string") data.note = body.note.trim() || null;
    else if (body.note === null) data.note = null;
  }
  if (body.clinicId === null) {
    data.clinicId = null;
  } else if (typeof body.clinicId === "string" && body.clinicId.trim()) {
    const c = await prisma.clinic.findFirst({
      where: { id: body.clinicId.trim(), deletedAt: null },
      select: { id: true },
    });
    if (!c) {
      return NextResponse.json({ error: "Клиника не найдена" }, { status: 400 });
    }
    data.clinicId = c.id;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет полей" }, { status: 400 });
  }

  try {
    const row = await prisma.costingClientProfile.update({
      where: { id: profileId },
      data,
      include: { clinic: { select: { id: true, name: true } } },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { profileId } = await ctx.params;
  const prisma = await getPrisma();
  try {
    await prisma.costingClientProfile.delete({ where: { id: profileId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалено" }, { status: 404 });
  }
}
