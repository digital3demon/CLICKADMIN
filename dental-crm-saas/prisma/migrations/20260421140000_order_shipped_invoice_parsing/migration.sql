-- AlterTable
ALTER TABLE "Order" ADD COLUMN "shippedDescription" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoiceParsedLines" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoiceParsedTotalRub" INTEGER;
ALTER TABLE "Order" ADD COLUMN "invoiceParsedSummaryText" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoicePaymentNotes" TEXT;
ALTER TABLE "Order" ADD COLUMN "orderPriceListKind" TEXT;
ALTER TABLE "Order" ADD COLUMN "orderPriceListNote" TEXT;
