import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { requireCostingOwner } from "@/lib/auth/costing-guard";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type PostBody = {
  note?: string | null;
  priceListItemId?: string | null;
  inputsJson?: Record<string, unknown>;
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

  let priceListItemId: string | null = null;
  if (typeof body.priceListItemId === "string" && body.priceListItemId.trim()) {
    const pli = await prisma.priceListItem.findUnique({
      where: { id: body.priceListItemId.trim() },
      select: { id: true },
    });
    if (!pli) {
      return NextResponse.json({ error: "Позиция прайса не найдена" }, { status: 400 });
    }
    priceListItemId = pli.id;
  }

  const inputsJson =
    body.inputsJson != null &&
    typeof body.inputsJson === "object" &&
    !Array.isArray(body.inputsJson)
      ? (body.inputsJson as object)
      : {};

  const row = await prisma.costingLine.create({
    data: {
      versionId,
      priceListItemId,
      note: typeof body.note === "string" ? body.note.trim() || null : null,
      inputsJson,
    },
    include: {
      priceListItem: { select: { id: true, code: true, name: true, priceRub: true } },
    },
  });
  return NextResponse.json(row);
}
