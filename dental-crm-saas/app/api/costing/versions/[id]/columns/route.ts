import { NextResponse } from "next/server";
import { CostingColumnKind } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import { requireCostingOwner } from "@/lib/auth/costing-guard";

export const dynamic = "force-dynamic";

const KEY_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

type ColBody = {
  key: string;
  label: string;
  kind: string;
  formula?: string | null;
  sortOrder?: number;
  hint?: string | null;
};

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { id: versionId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { columns?: ColBody[] };
  const cols = body.columns;
  if (!Array.isArray(cols) || cols.length === 0) {
    return NextResponse.json({ error: "Передайте columns: [...]" }, { status: 400 });
  }

  for (const c of cols) {
    if (!c.key?.trim() || !KEY_RE.test(c.key.trim())) {
      return NextResponse.json(
        { error: `Некорректный ключ колонки: ${c.key}` },
        { status: 400 },
      );
    }
    if (!c.label?.trim()) {
      return NextResponse.json({ error: "У каждой колонки нужен label" }, { status: 400 });
    }
    const kind = c.kind === "COMPUTED" ? "COMPUTED" : "INPUT";
    if (kind === "COMPUTED" && !(c.formula?.trim())) {
      return NextResponse.json(
        { error: `Нужна формула для вычисляемой колонки «${c.key}»` },
        { status: 400 },
      );
    }
  }

  const keys = cols.map((c) => c.key.trim());
  if (new Set(keys).size !== keys.length) {
    return NextResponse.json({ error: "Ключи колонок должны быть уникальны" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const v = await prisma.costingVersion.findUnique({
    where: { id: versionId },
    select: { id: true },
  });
  if (!v) return NextResponse.json({ error: "Версия не найдена" }, { status: 404 });

  await prisma.$transaction([
    prisma.costingColumn.deleteMany({ where: { versionId } }),
    prisma.costingColumn.createMany({
      data: cols.map((c, i) => ({
        versionId,
        key: c.key.trim(),
        label: c.label.trim(),
        kind: (c.kind === "COMPUTED" ? "COMPUTED" : "INPUT") as CostingColumnKind,
        formula:
          c.kind === "COMPUTED" && c.formula?.trim() ? c.formula.trim() : null,
        sortOrder:
          typeof c.sortOrder === "number" && Number.isFinite(c.sortOrder)
            ? Math.trunc(c.sortOrder)
            : i * 10,
        hint: typeof c.hint === "string" ? c.hint.trim() || null : null,
      })),
    }),
  ]);

  const saved = await prisma.costingColumn.findMany({
    where: { versionId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(saved);
}
