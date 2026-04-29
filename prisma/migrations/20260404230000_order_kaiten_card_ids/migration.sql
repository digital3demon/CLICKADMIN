-- AlterTable
ALTER TABLE "Order" ADD COLUMN "kaitenCardId" INTEGER;
ALTER TABLE "Order" ADD COLUMN "kaitenSyncError" TEXT;
ALTER TABLE "Order" ADD COLUMN "kaitenSyncedAt" DATETIME;
