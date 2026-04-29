/**
 * Разбор счёта (сумма, строки, текст) имеет смысл только при наличии строки вложения в БД.
 * Если передан `invoiceAttachment` из Prisma-include: при «висячем» invoiceAttachmentId
 * (ссылка без файла после SetNull/сбоя) не подставляем устаревший разбор.
 * Если `invoiceAttachment` не передан — ориентируемся только на invoiceAttachmentId.
 */
export function invoiceParsedSnapshotForOrderEdit(order: {
  invoiceAttachmentId: string | null;
  invoiceAttachment?: { createdAt?: unknown } | null;
  invoiceParsedLines: unknown;
  invoiceParsedTotalRub: number | null;
  invoiceParsedSummaryText: string | null;
}): {
  invoiceParsedLines: unknown;
  invoiceParsedTotalRub: number | null;
  invoiceParsedSummaryText: string | null;
} {
  const hasInvoiceFile =
    order.invoiceAttachment !== undefined
      ? order.invoiceAttachment != null
      : Boolean(order.invoiceAttachmentId);
  if (hasInvoiceFile) {
    return {
      invoiceParsedLines: order.invoiceParsedLines,
      invoiceParsedTotalRub: order.invoiceParsedTotalRub,
      invoiceParsedSummaryText: order.invoiceParsedSummaryText,
    };
  }
  return {
    invoiceParsedLines: null,
    invoiceParsedTotalRub: null,
    invoiceParsedSummaryText: null,
  };
}
