-- AlterTable
ALTER TABLE "User" ADD COLUMN "kaitenUserId" INTEGER;

-- CreateIndex
CREATE INDEX "User_tenantId_kaitenUserId_idx" ON "User"("tenantId", "kaitenUserId");
