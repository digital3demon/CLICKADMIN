import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import {
  CRM_UPLOAD_MAX_BYTES,
  CRM_UPLOAD_TOO_LARGE_MESSAGE,
} from "@/lib/crm-upload-limits";
import { buildInvoiceCaptionRuFromFileName } from "@/lib/format-invoice-number-ru";
import { extractInvoiceNumberFromPdfBuffer } from "@/lib/extract-invoice-number-from-pdf";
import { recordContractorRevision } from "@/lib/record-contractor-revision";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const prisma = await getPrisma();
    const { id } = await ctx.params;
    const snapshot = await prisma.clinicReconciliationSnapshot.findUnique({
      where: { id: id.trim() },
      select: {
        invoiceFileName: true,
        invoiceMimeType: true,
        invoiceBytes: true,
      },
    });
    if (!snapshot || !snapshot.invoiceBytes || !snapshot.invoiceFileName) {
      return NextResponse.json({ error: "Счёт не загружен" }, { status: 404 });
    }
    const asciiName = snapshot.invoiceFileName.replace(/[^\w.\-]/g, "_") || "invoice";
    const bytes =
      snapshot.invoiceBytes instanceof Uint8Array
        ? snapshot.invoiceBytes
        : new Uint8Array(snapshot.invoiceBytes);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": snapshot.invoiceMimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${asciiName}"`,
      },
    });
  } catch (e) {
    console.error("[GET reconciliation snapshot invoice]", e);
    return NextResponse.json({ error: "Не удалось скачать счёт" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const prisma = await getPrisma();
    const { id } = await ctx.params;
    const snapshotId = id.trim();
    if (!snapshotId) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }
    const snapshot = await prisma.clinicReconciliationSnapshot.findUnique({
      where: { id: snapshotId },
      select: { id: true, clinicId: true, periodLabelRu: true },
    });
    if (!snapshot) {
      return NextResponse.json({ error: "Снимок не найден" }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }
    if (!file.name.trim()) {
      return NextResponse.json({ error: "Укажите имя файла" }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "Пустой файл" }, { status: 400 });
    }
    if (file.size > CRM_UPLOAD_MAX_BYTES) {
      return NextResponse.json({ error: CRM_UPLOAD_TOO_LARGE_MESSAGE }, { status: 400 });
    }

    const arrayBuf = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const name = file.name.trim();
    const mime = file.type?.trim() || "application/octet-stream";
    let invoiceNumber = buildInvoiceCaptionRuFromFileName(name);
    if (!invoiceNumber) {
      invoiceNumber = await extractInvoiceNumberFromPdfBuffer(buf, mime, name);
    }

    const row = await prisma.clinicReconciliationSnapshot.update({
      where: { id: snapshotId },
      data: {
        invoiceFileName: name,
        invoiceMimeType: mime,
        invoiceBytes: buf,
        invoiceUploadedAt: new Date(),
        invoiceNumber: invoiceNumber || null,
      },
      select: {
        id: true,
        invoiceFileName: true,
        invoiceNumber: true,
        invoiceUploadedAt: true,
      },
    });
    try {
      await recordContractorRevision(prisma, {
        kind: "UPDATE",
        clinicId: snapshot.clinicId,
        summary: `Сверка: загружен счёт «${name}» (${snapshot.periodLabelRu})`,
      });
    } catch (e) {
      console.error("[reconciliation-snapshot-invoice] revision log", e);
    }
    return NextResponse.json({ snapshot: row });
  } catch (e) {
    console.error("[POST reconciliation snapshot invoice]", e);
    return NextResponse.json({ error: "Не удалось загрузить счёт" }, { status: 500 });
  }
}
