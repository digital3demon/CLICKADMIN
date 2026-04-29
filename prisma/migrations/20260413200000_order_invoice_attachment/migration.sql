-- AlterTable
ALTER TABLE "Order" ADD COLUMN "invoiceAttachmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceAttachmentId_key" ON "Order"("invoiceAttachmentId");
