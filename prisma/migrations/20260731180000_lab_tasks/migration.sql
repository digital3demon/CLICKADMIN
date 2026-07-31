-- CreateTable
CREATE TABLE "LabTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "authorUserId" TEXT,
    "authorLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,

    CONSTRAINT "LabTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTaskAttachment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabTaskAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabTask_tenantId_resolvedAt_createdAt_idx" ON "LabTask"("tenantId", "resolvedAt", "createdAt");

-- CreateIndex
CREATE INDEX "LabTask_tenantId_createdAt_idx" ON "LabTask"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "LabTaskAttachment_taskId_idx" ON "LabTaskAttachment"("taskId");

-- AddForeignKey
ALTER TABLE "LabTask" ADD CONSTRAINT "LabTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTask" ADD CONSTRAINT "LabTask_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTask" ADD CONSTRAINT "LabTask_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTaskAttachment" ADD CONSTRAINT "LabTaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LabTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
