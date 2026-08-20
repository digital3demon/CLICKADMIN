/**
 * Пакет счетов фин. отдела: PDF/ZIP → наряд по «Основание».
 * Timezone подписи счёта — как в format-invoice-number-ru (Москва).
 */

import "server-only";

import { OrderAttachmentScope, Prisma, type PrismaClient } from "@prisma/client";
import { applyInvoiceParseToOrder } from "@/lib/apply-invoice-parse-to-order";
import {
  financeOfficeInvoiceRowKey,
  type FinanceInvoiceImportApplyResult,
  type FinanceInvoiceImportApplyRow,
  type FinanceInvoiceImportPreviewRow,
} from "@/lib/finance-office-invoice-import";
import type { ExpandedInvoicePdf } from "@/lib/finance-office-invoice-zip";
import {
  buildInvoiceCaptionRuFromDocumentText,
  buildInvoiceCaptionRuFromFileName,
} from "@/lib/format-invoice-number-ru";
import {
  extractInvoiceNumberFromDocumentText,
  extractInvoiceNumberFromFileName,
} from "@/lib/invoice-number-extract";
import { extractInvoicePdfText } from "@/lib/parse-invoice-pdf-lines";
import {
  extractOrderNumberFromInvoiceBasisText,
  invoiceFileNameForNumberExtract,
  sliceInvoiceBasisRegion,
} from "@/lib/parse-invoice-basis-order-number";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import {
  deleteOrderAttachmentFile,
  isOrderAttachmentS3Enabled,
  newOrderAttachmentId,
  writeOrderAttachmentToDisk,
  writeOrderAttachmentToS3,
} from "@/lib/order-attachment-storage";
import { ORDER_NUMBER_PATTERN } from "@/lib/order-number";

export {
  FINANCE_INVOICE_IMPORT_MAX_FILE_BYTES,
  FINANCE_INVOICE_IMPORT_MAX_PDFS,
  expandFinanceInvoiceUploadFiles,
} from "@/lib/finance-office-invoice-zip";
export type { ExpandedInvoicePdf } from "@/lib/finance-office-invoice-zip";

function invoiceCaptionFromPdf(fileName: string, pdfText: string): string {
  const prettyName = invoiceFileNameForNumberExtract(fileName);
  return (
    buildInvoiceCaptionRuFromFileName(prettyName) ??
    buildInvoiceCaptionRuFromDocumentText(pdfText) ??
    extractInvoiceNumberFromFileName(prettyName) ??
    extractInvoiceNumberFromDocumentText(pdfText) ??
    ""
  );
}

function snippetBasis(text: string): string {
  const slice = sliceInvoiceBasisRegion(text).replace(/\s+/g, " ").trim();
  if (!slice) return "";
  return slice.length > 180 ? `${slice.slice(0, 179)}…` : slice;
}

export async function buildFinanceInvoiceImportPreview(
  prisma: PrismaClient,
  tenantId: string,
  pdfs: ExpandedInvoicePdf[],
): Promise<FinanceInvoiceImportPreviewRow[]> {
  const parsed: Array<{
    pdf: ExpandedInvoicePdf;
    orderNumber: string;
    invoiceNumberRaw: string;
    basisSnippet: string;
    errors: string[];
  }> = [];

  for (const pdf of pdfs) {
    const extracted = await extractInvoicePdfText(pdf.buf);
    const errors: string[] = [];
    if (extracted.error) errors.push(extracted.error);
    else if (!extracted.text.trim()) {
      errors.push("В PDF не найден текст (возможно, скан без OCR)");
    }
    const orderNumber = extractOrderNumberFromInvoiceBasisText(extracted.text) ?? "";
    if (!orderNumber && errors.length === 0) {
      errors.push("Не найден номер наряда в «Основание»");
    }
    parsed.push({
      pdf,
      orderNumber,
      invoiceNumberRaw: invoiceCaptionFromPdf(pdf.fileName, extracted.text),
      basisSnippet: snippetBasis(extracted.text),
      errors,
    });
  }

  const numbers = Array.from(
    new Set(parsed.map((p) => p.orderNumber).filter((n) => ORDER_NUMBER_PATTERN.test(n))),
  );
  const orders = numbers.length
    ? await prisma.order.findMany({
        where: { tenantId, archivedAt: null, orderNumber: { in: numbers } },
        select: {
          id: true,
          orderNumber: true,
          patientName: true,
          invoiceAttachmentId: true,
          invoiceIssued: true,
          invoiceNumber: true,
          doctor: { select: { fullName: true } },
          clinic: { select: { name: true } },
        },
      })
    : [];
  const byNumber = new Map(orders.map((o) => [o.orderNumber, o]));

  return parsed.map((p) => {
    const key = financeOfficeInvoiceRowKey(p.pdf.fileName, p.pdf.sourceArchive);
    const errors = [...p.errors];
    const order = p.orderNumber ? byNumber.get(p.orderNumber) : undefined;
    if (p.orderNumber && !order) {
      errors.push("Наряд с таким номером не найден");
    }
    const alreadyHasInvoice = Boolean(
      order &&
        (order.invoiceAttachmentId ||
          order.invoiceIssued ||
          String(order.invoiceNumber || "").trim()),
    );
    const patient = personNameSurnameInitials(order?.patientName);
    const doctor = personNameSurnameInitials(order?.doctor.fullName ?? "");
    const clinic = order?.clinic?.name?.trim() || "";
    const orderLabel = order
      ? [order.orderNumber, patient || "без пациента", doctor, clinic]
          .filter(Boolean)
          .join(" · ")
      : null;
    return {
      key,
      fileName: p.pdf.fileName,
      sourceArchive: p.pdf.sourceArchive,
      invoiceNumberRaw: p.invoiceNumberRaw,
      orderNumber: p.orderNumber,
      orderId: order?.id ?? null,
      orderLabel,
      alreadyHasInvoice,
      apply: errors.length === 0 && Boolean(order),
      errors,
      basisSnippet: p.basisSnippet,
    };
  });
}

async function storeInvoiceBytes(
  orderId: string,
  attachmentId: string,
  fileBuf: Buffer,
  mimeType: string,
): Promise<{ diskRelPath: string; dataForDb: Buffer }> {
  if (isOrderAttachmentS3Enabled()) {
    try {
      const diskRelPath = await writeOrderAttachmentToS3(
        orderId,
        attachmentId,
        fileBuf,
        mimeType,
      );
      return { diskRelPath, dataForDb: Buffer.alloc(0) };
    } catch (e) {
      console.error("[invoice-import] S3 write failed, disk", e);
    }
  }
  const diskRelPath = await writeOrderAttachmentToDisk(
    orderId,
    attachmentId,
    fileBuf,
  );
  return { diskRelPath, dataForDb: Buffer.alloc(0) };
}

export async function attachInvoicePdfToOrder(opts: {
  prisma: PrismaClient;
  tenantId: string;
  orderId: string;
  fileName: string;
  buf: Buffer;
  invoiceNumberRaw: string;
}): Promise<void> {
  const order = await opts.prisma.order.findFirst({
    where: { id: opts.orderId, tenantId: opts.tenantId, archivedAt: null },
    select: { id: true, invoiceAttachmentId: true },
  });
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }
  const prevId = order.invoiceAttachmentId;
  const attachmentId = newOrderAttachmentId();
  const mimeType = "application/pdf";
  const stored = await storeInvoiceBytes(
    order.id,
    attachmentId,
    opts.buf,
    mimeType,
  );
  const prettyName = invoiceFileNameForNumberExtract(opts.fileName);
  const caption =
    String(opts.invoiceNumberRaw || "").trim() ||
    buildInvoiceCaptionRuFromFileName(prettyName) ||
    null;

  const row = await opts.prisma.orderAttachment.create({
    data: {
      id: attachmentId,
      orderId: order.id,
      scope: OrderAttachmentScope.GENERAL,
      fileName: opts.fileName,
      mimeType,
      size: opts.buf.byteLength,
      data: new Uint8Array(stored.dataForDb),
      diskRelPath: stored.diskRelPath,
    },
    select: { id: true },
  });

  await opts.prisma.order.update({
    where: { id: order.id },
    data: {
      invoiceAttachmentId: row.id,
      invoiceIssued: true,
      invoiceParsedLines: Prisma.DbNull,
      invoiceParsedTotalRub: null,
      invoiceParsedSummaryText: null,
      ...(caption ? { invoiceNumber: caption } : {}),
    },
  });

  if (prevId && prevId !== row.id) {
    try {
      const doomed = await opts.prisma.orderAttachment.findUnique({
        where: { id: prevId },
        select: { diskRelPath: true },
      });
      await opts.prisma.orderAttachment.deleteMany({ where: { id: prevId } });
      await deleteOrderAttachmentFile(doomed?.diskRelPath ?? null);
    } catch (e) {
      console.error("[invoice-import] replace old invoice", order.id, e);
    }
  }
}

export async function applyFinanceInvoiceImport(opts: {
  prisma: PrismaClient;
  tenantId: string;
  rows: FinanceInvoiceImportApplyRow[];
  pdfs: ExpandedInvoicePdf[];
}): Promise<{
  results: FinanceInvoiceImportApplyResult[];
  parseOrderIds: string[];
}> {
  const byKey = new Map(
    opts.pdfs.map((p) => [
      financeOfficeInvoiceRowKey(p.fileName, p.sourceArchive),
      p,
    ]),
  );
  const results: FinanceInvoiceImportApplyResult[] = [];
  const parseOrderIds: string[] = [];

  for (const row of opts.rows) {
    if (!row.apply) {
      results.push({
        key: row.key,
        orderNumber: row.orderNumber,
        ok: false,
        message: "Строка пропущена",
      });
      continue;
    }
    const orderNumber = String(row.orderNumber || "").trim();
    if (!ORDER_NUMBER_PATTERN.test(orderNumber)) {
      results.push({
        key: row.key,
        orderNumber,
        ok: false,
        message: "Некорректный номер наряда",
      });
      continue;
    }
    const pdf = byKey.get(row.key);
    if (!pdf) {
      results.push({
        key: row.key,
        orderNumber,
        ok: false,
        message: "Файл счёта не найден в пакете",
      });
      continue;
    }
    const order = await opts.prisma.order.findFirst({
      where: {
        tenantId: opts.tenantId,
        archivedAt: null,
        orderNumber,
      },
      select: { id: true },
    });
    if (!order) {
      results.push({
        key: row.key,
        orderNumber,
        ok: false,
        message: "Наряд не найден",
      });
      continue;
    }
    try {
      await attachInvoicePdfToOrder({
        prisma: opts.prisma,
        tenantId: opts.tenantId,
        orderId: order.id,
        fileName: pdf.fileName,
        buf: pdf.buf,
        invoiceNumberRaw: row.invoiceNumberRaw,
      });
      parseOrderIds.push(order.id);
      results.push({
        key: row.key,
        orderNumber,
        ok: true,
        message: "Счёт прикреплён",
      });
    } catch (e) {
      console.error("[invoice-import] apply", orderNumber, e);
      results.push({
        key: row.key,
        orderNumber,
        ok: false,
        message: "Не удалось сохранить файл счёта",
      });
    }
  }

  return { results, parseOrderIds };
}

export async function parseAttachedInvoicesInBackground(
  prisma: PrismaClient,
  orderIds: string[],
): Promise<void> {
  for (const orderId of orderIds) {
    try {
      await applyInvoiceParseToOrder(prisma, orderId);
    } catch (e) {
      console.error("[invoice-import] parse after attach", orderId, e);
    }
  }
}
