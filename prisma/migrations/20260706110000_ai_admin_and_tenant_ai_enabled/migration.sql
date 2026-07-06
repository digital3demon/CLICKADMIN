-- AlterEnum
ALTER TYPE "AppModule" ADD VALUE 'AI_ADMIN';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "openRouterApiKey" TEXT;

-- CreateTable
CREATE TABLE "AiOrderPrediction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "predictionJson" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiOrderPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiOrderPrediction_tenantId_createdAt_idx" ON "AiOrderPrediction"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiOrderPrediction_orderId_emailId_key" ON "AiOrderPrediction"("orderId", "emailId");

-- AddForeignKey
ALTER TABLE "AiOrderPrediction" ADD CONSTRAINT "AiOrderPrediction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiOrderPrediction" ADD CONSTRAINT "AiOrderPrediction_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;
