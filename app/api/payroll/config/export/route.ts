import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { canConfigurePayroll } from "@/lib/payroll";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Выгрузка нормализованных ФОТ (имя, сумма, роли, коды прайса). */
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

  const configs = await prisma.payrollPriceItemConfig.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      name: true,
      amountRub: true,
      staffRoles: { select: { staffRole: { select: { name: true } } } },
      priceItems: { select: { priceListItem: { select: { code: true } } } },
    },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("ФОТ");
  ws.addRow(["Название", "Сумма", "Роли", "Коды прайса"]);
  for (const c of configs) {
    ws.addRow([
      c.name,
      c.amountRub,
      c.staffRoles.map((s) => s.staffRole.name).join(", ") || "Общий",
      c.priceItems.map((p) => p.priceListItem.code).join(", "),
    ]);
  }
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `fot-export-${date}.xlsx`;

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
