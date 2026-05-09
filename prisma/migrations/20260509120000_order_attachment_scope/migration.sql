-- CreateEnum
CREATE TYPE "OrderAttachmentScope" AS ENUM ('GENERAL', 'PAYMENT_SLIP');

-- AlterTable
ALTER TABLE "OrderAttachment"
ADD COLUMN "scope" "OrderAttachmentScope" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "OrderAttachment_orderId_scope_idx" ON "OrderAttachment" ("orderId", "scope");
