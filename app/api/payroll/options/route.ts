import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { isPayrollUserRole, PAYROLL_WORK_KIND_LABELS } from "@/lib/payroll";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!isPayrollUserRole(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getPrisma();
  const rows = await prisma.payrollPriceItemConfig.findMany({
    where: {
      tenantId,
      OR: [
        { cadRub: { gt: 0 } },
        { cadSurgeryRub: { gt: 0 } },
        { manualRub: { gt: 0 } },
        { processingRub: { gt: 0 } },
      ],
      priceListItem: { isActive: true },
    },
    orderBy: [
      { priceListItem: { sortOrder: "asc" } },
      { priceListItem: { code: "asc" } },
    ],
    select: {
      priceListItemId: true,
      cadRub: true,
      cadSurgeryRub: true,
      manualRub: true,
      processingRub: true,
      priceListItem: {
        select: {
          code: true,
          name: true,
          sectionTitle: true,
          subsectionTitle: true,
        },
      },
    },
  });
  return NextResponse.json(
    {
      items: rows.map((r) => ({
        priceListItemId: r.priceListItemId,
        code: r.priceListItem.code,
        name: r.priceListItem.name,
        sectionTitle: r.priceListItem.sectionTitle,
        subsectionTitle: r.priceListItem.subsectionTitle,
        kinds: [
          r.cadRub && r.cadRub > 0
            ? { kind: "CAD", label: PAYROLL_WORK_KIND_LABELS.CAD, amountRub: r.cadRub }
            : null,
          r.cadSurgeryRub && r.cadSurgeryRub > 0
            ? {
                kind: "CAD_SURGERY",
                label: PAYROLL_WORK_KIND_LABELS.CAD_SURGERY,
                amountRub: r.cadSurgeryRub,
              }
            : null,
          r.manualRub && r.manualRub > 0
            ? { kind: "MANUAL", label: PAYROLL_WORK_KIND_LABELS.MANUAL, amountRub: r.manualRub }
            : null,
          r.processingRub && r.processingRub > 0
            ? {
                kind: "PROCESSING",
                label: PAYROLL_WORK_KIND_LABELS.PROCESSING,
                amountRub: r.processingRub,
              }
            : null,
        ].filter(Boolean),
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
