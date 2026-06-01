import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
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

    const totalRub = parsed.totalRub;
    const summaryText = parsed.summaryText?.trim()
      ? parsed.summaryText.trim()
      : null;

    const data: Prisma.OrderUpdateInput = {
      invoiceParsedLines:
        parsed.lines.length > 0
          ? (parsed.lines as Prisma.InputJsonValue)
          : Prisma.DbNull,
      invoiceParsedTotalRub: totalRub,
      invoiceParsedSummaryText: summaryText,
    };
    if (fillNumber && suggestedNorm) {
      data.invoiceNumber = suggestedNorm;
    }

    await prisma.order.update({
      where: { id: orderId },
      data,
    });

    const linesJson =
      parsed.lines.length > 0 ? JSON.stringify(parsed.lines) : null;

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
  } catch (e) {
    console.error("[applyInvoiceParseToOrder]", orderId, e);
    return { ok: false, error: "parse_failed" };
  }
}
