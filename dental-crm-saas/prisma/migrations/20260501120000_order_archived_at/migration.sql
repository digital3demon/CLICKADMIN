-- AlterTable
ALTER TABLE "Order" ADD COLUMN "archivedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Order_archivedAt_createdAt_idx" ON "Order"("archivedAt", "createdAt");
