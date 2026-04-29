-- AlterTable
ALTER TABLE "Order" ADD COLUMN "excludeFromReconciliation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "excludeFromReconciliationUntil" DATETIME;
