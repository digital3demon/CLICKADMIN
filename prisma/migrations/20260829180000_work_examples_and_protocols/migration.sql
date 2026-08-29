ALTER TYPE "AppModule" ADD VALUE 'WORK_EXAMPLES';
ALTER TYPE "AppModule" ADD VALUE 'PROTOCOLS_REFS';

CREATE TYPE "WorkExampleFileKind" AS ENUM ('PHOTO', 'CAD', 'FILE');

CREATE TABLE "WorkExample" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT,
    "cloudUrl" TEXT,
    "cloudUrlPrevious" TEXT,
    "cloudUrlDeletedAt" TIMESTAMP(3),
    "cloudUrlDeletedByUserId" TEXT,
    "cloudUrlDeletedByLabel" TEXT,
    "technicianNotes" TEXT NOT NULL DEFAULT '',
    "doctorComments" TEXT NOT NULL DEFAULT '',
    "cardTypes" JSONB NOT NULL,
    "compositionSnapshot" JSONB NOT NULL,
    "shareToken" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "deletedByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkExample_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkExampleFile" (
    "id" TEXT NOT NULL,
    "exampleId" TEXT NOT NULL,
    "kind" "WorkExampleFileKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "diskRelPath" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "deletedByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkExampleFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkExample_shareToken_key" ON "WorkExample"("shareToken");
CREATE INDEX "WorkExample_tenantId_deletedAt_createdAt_idx" ON "WorkExample"("tenantId", "deletedAt", "createdAt");
CREATE INDEX "WorkExample_tenantId_orderId_idx" ON "WorkExample"("tenantId", "orderId");
CREATE INDEX "WorkExampleFile_exampleId_deletedAt_sortOrder_idx" ON "WorkExampleFile"("exampleId", "deletedAt", "sortOrder");

ALTER TABLE "WorkExample" ADD CONSTRAINT "WorkExample_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkExample" ADD CONSTRAINT "WorkExample_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkExample" ADD CONSTRAINT "WorkExample_cloudUrlDeletedByUserId_fkey" FOREIGN KEY ("cloudUrlDeletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkExample" ADD CONSTRAINT "WorkExample_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkExample" ADD CONSTRAINT "WorkExample_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkExampleFile" ADD CONSTRAINT "WorkExampleFile_exampleId_fkey" FOREIGN KEY ("exampleId") REFERENCES "WorkExample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkExampleFile" ADD CONSTRAINT "WorkExampleFile_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
