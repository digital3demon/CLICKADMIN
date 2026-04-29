import "server-only";

import type { PrismaClient } from "@prisma/client";
import { normalizeInvoiceNumberFieldRu } from "@/lib/format-invoice-number-ru";
import { readOrderAttachmentBytes } from "@/lib/order-attachment-storage";
import type { InvoiceParsedLineV1 } from "@/lib/invoice-parsed-types";
import { parseInvoicePdfBuffer } from "@/lib/parse-invoice-pdf-lines";

export type ApplyInvoiceParseToOrderResult =
  | {
      ok: true;
      lines: InvoiceParsedLineV1[];
      linesJson: string | null;
      totalRub: number | null;
      summaryText: string;
      warnings: string[];
      suggestedInvoiceNumber: string | null;
      invoiceNumberApplied: boolean;
    }
  | { ok: false; error: "no_order" | "no_attachment" | "parse_failed" };

/**
 * Разбор прикреплённого счёта и запись позиций / суммы / текста «ВЫСТАВЛЕНО» в наряд.
 * Опционально подставляет номер счёта из PDF, если в наряде поле пустое.
 */
export async function applyInvoiceParseToOrder(
  prisma: PrismaClient,
  orderId: string,
): Promise<ApplyInvoiceParseToOrderResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceAttachmentId: true,
      invoiceAttachment: {
        select: {
          mimeType: true,
          fileName: true,
          data: true,
          diskRelPath: true,
        },
      },
    },
  });
  if (!order) {
    return { ok: false, error: "no_order" };
  }
  if (!order.invoiceAttachmentId || !order.invoiceAttachment) {
    return { ok: false, error: "no_attachment" };
  }

  try {
    const att = order.invoiceAttachment;
    const buf = await readOrderAttachmentBytes(att);

    const parsed = await parseInvoicePdfBuffer(
      buf,
      att.mimeType || "application/pdf",
      att.fileName || "invoice.pdf",
    );

    const suggestedNorm = parsed.suggestedInvoiceNumber
      ? normalizeInvoiceNumberFieldRu(parsed.suggestedInvoiceNumber)
      : null;
    const fillNumber =
      suggestedNorm &&
      !(order.invoiceNumber && String(order.invoiceNumber).trim());

    const linesJson =
      parsed.lines.length > 0 ? JSON.stringify(parsed.lines) : null;
    const totalRub = parsed.totalRub;
    const summaryText = parsed.summaryText?.trim()
      ? parsed.summaryText.trim()
      : null;

    if (fillNumber && suggestedNorm) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Order" SET "invoiceNumber" = ?, "invoiceParsedLines" = ?, "invoiceParsedTotalRub" = ?, "invoiceParsedSummaryText" = ? WHERE "id" = ?`,
        suggestedNorm,
        linesJson,
        totalRub,
        summaryText,
        orderId,
      );
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE "Order" SET "invoiceParsedLines" = ?, "invoiceParsedTotalRub" = ?, "invoiceParsedSummaryText" = ? WHERE "id" = ?`,
        linesJson,
        totalRub,
        summaryText,
        orderId,
      );
    }

    return {
      ok: true,
      lines: parsed.lines,
      linesJson,
      totalRub,
      summaryText: parsed.summaryText,
      warnings: parsed.warnings,
      suggestedInvoiceNumber: parsed.suggestedInvoiceNumber,
      invoiceNumberApplied: Boolean(fillNumber),
    };
  } catch {
    return { ok: false, error: "parse_failed" };
  }
}
