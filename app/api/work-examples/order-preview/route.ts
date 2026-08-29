import { NextResponse } from "next/server";
import { loadOrderLabSnapshot, requireWorkExamplesCtx } from "@/lib/work-examples/access.server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const orderId = new URL(req.url).searchParams.get("orderId")?.trim() ?? "";
  if (!orderId) return NextResponse.json({ error: "Нет заказа" }, { status: 400 });
  const snap = await loadOrderLabSnapshot(ctx.prisma, ctx.tenantId, orderId);
  if (!snap) return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  return NextResponse.json(snap);
}
