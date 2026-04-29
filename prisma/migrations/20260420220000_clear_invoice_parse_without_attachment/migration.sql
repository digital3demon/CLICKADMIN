-- Разбор счёта без файла: «осиротевшие» поля после снятия вложения или сбоев.
UPDATE "Order"
SET
  "invoiceParsedTotalRub" = NULL,
  "invoiceParsedSummaryText" = NULL,
  "invoiceParsedLines" = NULL
WHERE "invoiceAttachmentId" IS NULL
  AND (
    "invoiceParsedTotalRub" IS NOT NULL
    OR "invoiceParsedSummaryText" IS NOT NULL
    OR "invoiceParsedLines" IS NOT NULL
  );
