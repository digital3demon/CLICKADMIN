import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { requireCostingOwner } from "@/lib/auth/costing-guard";

export const dynamic = "force-dynamic";

const KEY_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

type Ctx = { params: Promise<{ id: string }> };

type PostBody = {
  key?: string;
  label?: string;
  totalRub?: number;
  sortOrder?: number;
};

export async function POST(req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { id: versionId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PostBody;

  const key = typeof body.key === "string" ? body.key.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!key || !KEY_RE.test(key)) {
    return NextResponse.json(
      { error: "Ключ: латиница, цифры, подчёркивание; сначала буква или _" },
      { status: 400 },
    );
  }
  if (!label) {
    return NextResponse.json({ error: "Укажите подпись пула" }, { status: 400 });
  }

  const totalRub =
    typeof body.totalRub === "number" && Number.isFinite(body.totalRub) ? body.totalRub : 0;
  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.trunc(body.sortOrder)
      : 0;

  const prisma = await getPrisma();
  const v = await prisma.costingVersion.findUnique({
    where: { id: versionId },
    select: { id: true },
  });
  if (!v) return NextResponse.json({ error: "Версия не найдена" }, { status: 404 });

  try {
    const row = await prisma.costingSharedPool.create({
      data: { versionId, key, label, totalRub, sortOrder },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json(
      { error: "Пул с таким ключом уже есть в этой версии" },
      { status: 400 },
    );
  }
}
