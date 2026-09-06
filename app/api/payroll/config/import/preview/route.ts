import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { canConfigurePayroll } from "@/lib/payroll";
import { extractFreeformPayrollCandidates } from "@/lib/payroll-xlsx-freeform";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canConfigurePayroll(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  await requireSessionTenantId(session);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ожидается файл file" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  // exceljs typings expect ArrayBuffer-like
  await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);

  const sheets: { name: string; rows: unknown[][] }[] = [];
  for (const ws of wb.worksheets) {
    const rows: unknown[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const vals: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        vals[col - 1] = cell.value;
      });
      while (rows.length < rowNumber) rows.push([]);
      rows[rowNumber - 1] = vals;
    });
    sheets.push({ name: ws.name, rows });
  }

  const candidates = extractFreeformPayrollCandidates(sheets);
  return NextResponse.json(
    { candidates },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
