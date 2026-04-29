-- AlterTable
ALTER TABLE "OrderChatCorrection" ADD COLUMN "rejectedAt" DATETIME;
ALTER TABLE "OrderChatCorrection" ADD COLUMN "rejectedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "OrderChatCorrection_orderId_rejectedAt_idx" ON "OrderChatCorrection"("orderId", "rejectedAt");

-- CreateForeignKey
CREATE INDEX "OrderChatCorrection_rejectedByUserId_idx" ON "OrderChatCorrection"("rejectedByUserId");
