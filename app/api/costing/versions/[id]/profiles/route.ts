import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { requireCostingOwner } from "@/lib/auth/costing-guard";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type PostBody = {
  name?: string;
  listDiscountPercent?: number;
  clinicId?: string | null;
  note?: string | null;
};

export async function POST(req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { id: versionId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PostBody;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Укажите название профиля" }, { status: 400 });
  }

  const pct =
    typeof body.listDiscountPercent === "number" && Number.isFinite(body.listDiscountPercent)
      ? Math.max(0, Math.min(100, body.listDiscountPercent))
      : 0;

  let clinicId: string | null = null;
  const prisma = await getPrisma();
  if (typeof body.clinicId === "string" && body.clinicId.trim()) {
    const c = await prisma.clinic.findFirst({
      where: { id: body.clinicId.trim(), deletedAt: null },
      select: { id: true },
    });
    if (!c) {
      return NextResponse.json({ error: "Клиника не найдена" }, { status: 400 });
    }
    clinicId = c.id;
  }

  const v = await prisma.costingVersion.findUnique({
    where: { id: versionId },
    select: { id: true },
  });
  if (!v) return NextResponse.json({ error: "Версия не найдена" }, { status: 404 });

  const row = await prisma.costingClientProfile.create({
    data: {
      versionId,
      clinicId,
      name,
      listDiscountPercent: pct,
      note: typeof body.note === "string" ? body.note.trim() || null : null,
    },
    include: { clinic: { select: { id: true, name: true } } },
  });
  return NextResponse.json(row);
}
