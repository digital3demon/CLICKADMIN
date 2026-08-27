import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  CRM_UPLOAD_MAX_BYTES,
  CRM_UPLOAD_TOO_LARGE_MESSAGE,
} from "@/lib/crm-upload-limits";
import { extractInvoiceNumberFromPdfBuffer } from "@/lib/extract-invoice-number-from-pdf";
import { buildInvoiceCaptionRuFromFileName } from "@/lib/format-invoice-number-ru";

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
  const kind = String(form.get("kind") ?? "invoice");
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "Пустой файл" }, { status: 400 });
  }
  if (file.size > CRM_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: CRM_UPLOAD_TOO_LARGE_MESSAGE }, { status: 413 });
  }
  const prisma = await getPrisma();
  const row = await prisma.legalEntityReconciliation.findFirst({
    where: { id: id.trim(), tenantId },
    select: { id: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  const name = file.name.trim() || (kind === "upd" ? "upd.pdf" : "invoice.pdf");
  if (kind === "upd") {
    await prisma.legalEntityReconciliation.update({
      where: { id: row.id },
      data: {
        updFileName: name,
        updMimeType: mime,
        updBytes: new Uint8Array(buf),
        updUploadedAt: new Date(),
      },
    });
  } else {
    let invoiceNumber = buildInvoiceCaptionRuFromFileName(name);
    if (!invoiceNumber) {
      try {
        invoiceNumber = await extractInvoiceNumberFromPdfBuffer(buf, mime, name);
      } catch {
        invoiceNumber = null;
      }
    }
    await prisma.legalEntityReconciliation.update({
      where: { id: row.id },
      data: {
        invoiceFileName: name,
        invoiceMimeType: mime,
        invoiceBytes: new Uint8Array(buf),
        invoiceNumber,
        invoiceUploadedAt: new Date(),
      },
    });
  }
  return NextResponse.json({ ok: true });
}
