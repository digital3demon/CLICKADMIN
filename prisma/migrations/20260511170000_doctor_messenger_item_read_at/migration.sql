-- AlterTable
ALTER TABLE "DoctorMessengerItem" ADD COLUMN "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "DoctorMessengerItem_tenantId_status_readAt_idx" ON "DoctorMessengerItem"("tenantId", "status", "readAt");
