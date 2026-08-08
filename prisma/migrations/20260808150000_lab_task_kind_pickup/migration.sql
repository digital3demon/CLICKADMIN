-- CreateEnum
CREATE TYPE "LabTaskKind" AS ENUM ('TASK', 'PICKUP_FROM');

-- AlterTable
ALTER TABLE "LabTask" ADD COLUMN "kind" "LabTaskKind" NOT NULL DEFAULT 'TASK';

-- CreateIndex
CREATE INDEX "LabTask_tenantId_kind_resolvedAt_createdAt_idx" ON "LabTask"("tenantId", "kind", "resolvedAt", "createdAt");

-- CreateIndex
CREATE INDEX "LabTask_tenantId_kind_createdAt_idx" ON "LabTask"("tenantId", "kind", "createdAt");
