/**
 * POST /api/finance-office/invoice-import/preview
 *
 * Multipart: несколько PDF и/или ZIP. SQLITE_BUSY не пишем (только чтение нарядов).
 * Лимит файла 20 МБ, после распаковки не больше 30 PDF. Таймаут текста PDF — 14 с/файл.
 */
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  classifyFinanceOfficeDropFiles,
} from "@/lib/finance-office-invoice-import";
import {
  FINANCE_INVOICE_IMPORT_MAX_FILE_BYTES,
  buildFinanceInvoiceImportPreview,
  expandFinanceInvoiceUploadFiles,
} from "@/lib/finance-office-invoice-import-server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const form = await req.formData();
  const raw = form.getAll("files").concat(form.getAll("file"));
  const files = raw.filter((x): x is File => x instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Загрузите PDF или архив ZIP/RAR/7z со счетами" }, { status: 400 });
  }

  const kind = classifyFinanceOfficeDropFiles(
    files.map((f) => ({ name: f.name, type: f.type })),
  );
  if (kind.kind === "mixed") {
    return NextResponse.json(
      { error: "Оплаты (Excel) и счета (PDF/архив) загружайте отдельно" },
      { status: 400 },
    );
  }
  if (kind.kind !== "invoices") {
    return NextResponse.json(
      { error: "Для счетов нужны PDF или архив ZIP / RAR / 7z" },
      { status: 400 },
    );
  }

  const buffers: Array<{ name: string; mime: string; buf: Buffer }> = [];
  for (const file of files) {
    if (file.size > FINANCE_INVOICE_IMPORT_MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Файл слишком большой: ${file.name} (макс. 20 МБ)` },
        { status: 413 },
      );
    }
    buffers.push({
      name: file.name,
      mime: file.type,
      buf: Buffer.from(await file.arrayBuffer()),
    });
  }

  const expanded = await expandFinanceInvoiceUploadFiles(buffers);
  if (expanded.error) {
    return NextResponse.json({ error: expanded.error }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const rows = await buildFinanceInvoiceImportPreview(
    prisma,
    tenantId,
    expanded.pdfs,
  );

  return NextResponse.json(
    { rows },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
