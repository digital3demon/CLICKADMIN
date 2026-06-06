import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { canConfigurePayroll } from "@/lib/payroll";
import { getActivePriceListId } from "@/lib/price-list-workspace";
import {
  buildPayrollImportPreview,
  parsePayrollConfigXlsxBuffer,
} from "@/lib/payroll-xlsx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canConfigurePayroll(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getPrisma();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ожидается multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Выберите файл .xlsx" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Файл слишком большой (макс. 8 МБ)" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = await parsePayrollConfigXlsxBuffer(buf);

  const activePriceListId = await getActivePriceListId(prisma);
  const [priceItems, existingConfigs] = await Promise.all([
    prisma.priceListItem.findMany({
      where: { priceListId: activePriceListId, isActive: true },
      select: { id: true, code: true, name: true },
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

  const rows = buildPayrollImportPreview({
    priceItems,
    existingConfigs,
    main: parsed.main,
    uncategorized: parsed.uncategorized,
  });

  const actionable = rows.filter((r) => r.action !== "unchanged");
  const withIssues = rows.filter((r) => r.issues.length > 0);

  return NextResponse.json({
    parseIssues: parsed.parseIssues,
    rows,
    summary: {
      total: rows.length,
      toCreate: actionable.filter((r) => r.action === "create").length,
      toUpdate: actionable.filter((r) => r.action === "update").length,
      unchanged: rows.filter((r) => r.action === "unchanged").length,
      withIssues: withIssues.length,
    },
  });
}
