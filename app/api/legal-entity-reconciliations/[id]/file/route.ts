/**
 * Файл сверки: GET скачивает слот, POST кладёт PDF в счёт или УПД.
 * Вид документа — имя файла + текст PDF (не поле kind).
 * Multipart: CRM_UPLOAD_MAX_BYTES на файл, до 8 файлов; SQLITE_BUSY — как у Prisma.
 */
import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  CRM_UPLOAD_MAX_BYTES,
  CRM_UPLOAD_TOO_LARGE_MESSAGE,
} from "@/lib/crm-upload-limits";
import { extractPdfPlainText } from "@/lib/extract-pdf-plain-text";
import { extractInvoiceNumberFromPdfBuffer } from "@/lib/extract-invoice-number-from-pdf";
import {
  buildInvoiceCaptionRuFromDocumentText,
  buildInvoiceCaptionRuFromFileName,
} from "@/lib/format-invoice-number-ru";
import { isProbablyPdf } from "@/lib/invoice-number-extract";
import {
  classifyFinanceOfficePdfKind,
  resolveFinanceOfficePdfKind,
} from "@/lib/finance-office-pdf-kind";

const MAX_FILES_PER_POST = 8;

async function detectReconciliationFileKind(
  fileName: string,
  buf: Buffer,
  mime: string,
): Promise<{ kind: "invoice" | "upd"; pdfText: string }> {
  const byName = classifyFinanceOfficePdfKind(fileName);
  if (byName !== "unknown") {
    return { kind: byName, pdfText: "" };
  }
  if (!isProbablyPdf(mime, fileName)) {
    return { kind: resolveFinanceOfficePdfKind(fileName), pdfText: "" };
  }
  const extracted = await extractPdfPlainText(buf);
  const pdfText = extracted.text ?? "";
  return {
    kind: resolveFinanceOfficePdfKind(fileName, pdfText),
    pdfText,
  };
}

async function saveReconciliationSlot(
  prisma: PrismaClient,
  rowId: string,
  kind: "invoice" | "upd",
  name: string,
  mime: string,
  buf: Buffer,
  pdfText: string,
): Promise<void> {
  if (kind === "upd") {
    await prisma.legalEntityReconciliation.update({
      where: { id: rowId },
      data: {
        updFileName: name,
        updMimeType: mime,
        updBytes: new Uint8Array(buf),
        updUploadedAt: new Date(),
      },
    });
    return;
  }
  let invoiceNumber =
    buildInvoiceCaptionRuFromFileName(name) ||
    (pdfText.trim() ? buildInvoiceCaptionRuFromDocumentText(pdfText) : null);
  if (!invoiceNumber) {
    try {
      invoiceNumber = await extractInvoiceNumberFromPdfBuffer(buf, mime, name);
    } catch {
      invoiceNumber = null;
    }
  }
  await prisma.legalEntityReconciliation.update({
    where: { id: rowId },
    data: {
      invoiceFileName: name,
      invoiceMimeType: mime,
      invoiceBytes: new Uint8Array(buf),
      invoiceNumber,
      invoiceUploadedAt: new Date(),
    },
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function canMutate(
  session: { role?: string | null },
  access: { FINANCE_OFFICE?: boolean; CLIENTS_EDIT?: boolean } | null,
) {
  return (
    access?.FINANCE_OFFICE === true ||
    session.role === "OWNER" ||
    access?.CLIENTS_EDIT === true
  );
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (!canMutate(session, access)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 403 });
  }
  const kind = new URL(req.url).searchParams.get("kind");
  const { id } = await ctx.params;
  const prisma = await getPrisma();
  const row = await prisma.legalEntityReconciliation.findFirst({
    where: { id: id.trim(), tenantId },
    select: {
      invoiceFileName: true,
      invoiceMimeType: true,
      invoiceBytes: true,
      updFileName: true,
      updMimeType: true,
      updBytes: true,
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
  const file =
    kind === "upd"
      ? {
          name: row.updFileName,
          mime: row.updMimeType,
          bytes: row.updBytes,
        }
      : {
          name: row.invoiceFileName,
          mime: row.invoiceMimeType,
          bytes: row.invoiceBytes,
        };
  if (!file.name || !file.bytes) {
    return NextResponse.json({ error: "Файл не загружен" }, { status: 404 });
  }
  const bytes =
    file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
  const ascii = file.name.replace(/[^\w.\-]/g, "_") || "file";
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": file.mime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${ascii}"`,
    },
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (!canMutate(session, access)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const form = await req.formData();
  const files = form
    .getAll("file")
    .filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }
  if (files.length > MAX_FILES_PER_POST) {
    return NextResponse.json(
      { error: `За один раз не больше ${MAX_FILES_PER_POST} файлов` },
      { status: 400 },
    );
  }
  for (const file of files) {
    if (file.size > CRM_UPLOAD_MAX_BYTES) {
      return NextResponse.json({ error: CRM_UPLOAD_TOO_LARGE_MESSAGE }, { status: 413 });
    }
  }
  const prisma = await getPrisma();
  const row = await prisma.legalEntityReconciliation.findFirst({
    where: { id: id.trim(), tenantId },
    select: { id: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const uploaded: Array<{ fileName: string; kind: "invoice" | "upd" }> = [];
  for (const file of files) {
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "application/octet-stream";
    const name = file.name.trim() || "document.pdf";
    const { kind, pdfText } = await detectReconciliationFileKind(name, buf, mime);
    const storedName = name === "document.pdf" ? (kind === "upd" ? "upd.pdf" : "invoice.pdf") : name;
    await saveReconciliationSlot(prisma, row.id, kind, storedName, mime, buf, pdfText);
    uploaded.push({ fileName: storedName, kind });
  }
  return NextResponse.json({ ok: true, uploaded });
}
