import { NextResponse } from "next/server";
import { textMatchesOrderSearch } from "@/lib/order-search-query";
import { requireWorkExamplesCtx } from "@/lib/work-examples/access.server";

export const dynamic = "force-dynamic";

/** GET ?q= — номер / пациент / врач. Границы не \\b (кириллица). */
export async function GET(req: Request) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ items: [] });

  const rows = await ctx.prisma.order.findMany({
    where: { tenantId: ctx.tenantId, archivedAt: null },
    select: {
      id: true,
      orderNumber: true,
      patientName: true,
      doctorId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const doctorIds = [...new Set(rows.map((r) => r.doctorId).filter(Boolean))];
  const doctors = doctorIds.length
    ? await ctx.prisma.doctor.findMany({
        where: { id: { in: doctorIds }, tenantId: ctx.tenantId },
        select: { id: true, fullName: true },
      })
    : [];
  const doctorName = new Map(doctors.map((d) => [d.id, d.fullName]));
  const items = rows
    .filter((r) =>
      textMatchesOrderSearch(
        [r.orderNumber, r.patientName, doctorName.get(r.doctorId) ?? ""].join(" "),
        q,
      ),
    )
    .slice(0, 20)
    .map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      patientName: r.patientName,
      doctorName: doctorName.get(r.doctorId) ?? "",
    }));
  return NextResponse.json({ items });
}
