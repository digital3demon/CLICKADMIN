import { NextResponse } from "next/server";
import { requireWorkExamplesCtx } from "@/lib/work-examples/access.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const rows = await ctx.prisma.kaitenCardType.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  return NextResponse.json({ items: rows });
}
