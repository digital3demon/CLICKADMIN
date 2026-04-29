-- AlterTable
ALTER TABLE "Order" ADD COLUMN "continuesFromOrderId" TEXT;

-- CreateIndex
CREATE INDEX "Order_continuesFromOrderId_idx" ON "Order"("continuesFromOrderId");
