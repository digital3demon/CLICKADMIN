-- AlterTable
ALTER TABLE "OrderChatCorrection" ADD COLUMN "kaitenCommentId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "OrderChatCorrection_orderId_kaitenCommentId_key" ON "OrderChatCorrection"("orderId", "kaitenCommentId");
