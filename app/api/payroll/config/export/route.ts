import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { canConfigurePayroll } from "@/lib/payroll";
import { getActivePriceListId } from "@/lib/price-list-workspace";
import { buildPayrollConfigXlsxBuffer } from "@/lib/payroll-xlsx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canConfigurePayroll(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getPrisma();
  const activePriceListId = await getActivePriceListId(prisma);

  const [priceItems, configs] = await Promise.all([
    prisma.priceListItem.findMany({
      where: { priceListId: activePriceListId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        sectionTitle: true,
        subsectionTitle: true,
      },
    }),
    prisma.payrollPriceItemConfig.findMany({
      where: { tenantId },
      select: {
        id: true,
        priceListItemId: true,
        kind: true,
        amountRub: true,
        description: true,
      },
    }),
  ]);

  const buffer = await buildPayrollConfigXlsxBuffer({
    priceItems,
    configs,
  });

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `fot-shablon-${date}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
