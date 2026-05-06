-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "kaitenLabMentionSignalAt" TIMESTAMP(3),
ADD COLUMN "kaitenLabMentionWaterlineCommentId" INTEGER;

-- CreateTable
CREATE TABLE "OrderKaitenLabMentionAck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ackAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderKaitenLabMentionAck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderKaitenLabMentionAck_userId_orderId_key" ON "OrderKaitenLabMentionAck"("userId", "orderId");

-- CreateIndex
CREATE INDEX "OrderKaitenLabMentionAck_tenantId_userId_idx" ON "OrderKaitenLabMentionAck"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "OrderKaitenLabMentionAck_orderId_idx" ON "OrderKaitenLabMentionAck"("orderId");

-- AddForeignKey
ALTER TABLE "OrderKaitenLabMentionAck" ADD CONSTRAINT "OrderKaitenLabMentionAck_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderKaitenLabMentionAck" ADD CONSTRAINT "OrderKaitenLabMentionAck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderKaitenLabMentionAck" ADD CONSTRAINT "OrderKaitenLabMentionAck_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
