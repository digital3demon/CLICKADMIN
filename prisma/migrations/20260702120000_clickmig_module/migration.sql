-- ClickMig module: enums, tables, AppModule values

-- AlterEnum AppModule
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'CLICKMIG';
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'CLICKMIG_REVIEW';
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'CLICKMIG_KANBAN';
ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'CONFIG_CLICKMIG';

-- CreateEnum
CREATE TYPE "ClickMigApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE "ClickMigOrderStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ClickMigMaterial" AS ENUM ('ZIRCONIA', 'EMAX', 'PMMA', 'COMPOSITE');
CREATE TYPE "ClickMigFileKind" AS ENUM ('PHOTO', 'SCAN', 'VIDEO', 'OTHER');

-- CreateTable ClickMigClient
CREATE TABLE "ClickMigClient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClickMigClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClickMigClientClinic" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickMigClientClinic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClickMigApplication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "publicNumber" TEXT NOT NULL,
    "status" "ClickMigApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "guestEmail" TEXT,
    "guestDoctorName" TEXT,
    "guestClinic" TEXT,
    "guestAddress" TEXT,
    "patientName" TEXT NOT NULL,
    "constructionTypeKey" TEXT NOT NULL,
    "material" "ClickMigMaterial" NOT NULL,
    "teethFdi" JSONB NOT NULL,
    "screwRetained" BOOLEAN NOT NULL DEFAULT false,
    "scanbodyManufacturer" TEXT,
    "shadeGroup" TEXT,
    "shadeCode" TEXT,
    "shadeDetail" TEXT,
    "clientNotes" TEXT,
    "photoLinks" JSONB,
    "scanLinks" JSONB,
    "rejectedReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,

    CONSTRAINT "ClickMigApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClickMigOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "publicNumber" TEXT NOT NULL,
    "status" "ClickMigOrderStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "kanbanColumnId" TEXT NOT NULL DEFAULT 'col_queue',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "assigneeUserId" TEXT,
    "participantUserId" TEXT,
    "stageKey" TEXT NOT NULL DEFAULT 'data_check',
    "timerStartedAt" TIMESTAMP(3),
    "timerDurationMs" INTEGER,
    "timerFrozenAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),
    "blockedReason" TEXT,
    "blockedFields" JSONB,
    "blockVideoFileId" TEXT,
    "resubmitToken" TEXT,
    "resubmitTokenExpiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ClickMigOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClickMigFile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT,
    "orderId" TEXT,
    "kind" "ClickMigFileKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "diskRelPath" TEXT,
    "data" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickMigFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClickMigConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "publicApiKeyHash" TEXT,
    "allowedOrigins" JSONB NOT NULL DEFAULT '[]',
    "constructionTypes" JSONB NOT NULL,
    "scanbodyManufacturers" JSONB NOT NULL,
    "shadeOptions" JSONB NOT NULL,
    "defaultAssigneeUserId" TEXT,
    "participantUserIds" JSONB NOT NULL DEFAULT '[]',
    "maxCardsPerParticipant" INTEGER NOT NULL DEFAULT 3,
    "columnTimers" JSONB NOT NULL,
    "stageTimers" JSONB NOT NULL,
    "timerBehaviors" JSONB NOT NULL,
    "validationHints" JSONB NOT NULL,
    "emailTemplates" JSONB NOT NULL,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFromEmail" TEXT,
    "smtpFromName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClickMigConfig_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "ClickMigClient_tenantId_email_key" ON "ClickMigClient"("tenantId", "email");
CREATE INDEX "ClickMigClient_tenantId_idx" ON "ClickMigClient"("tenantId");
CREATE INDEX "ClickMigClientClinic_clientId_idx" ON "ClickMigClientClinic"("clientId");
CREATE UNIQUE INDEX "ClickMigApplication_tenantId_publicNumber_key" ON "ClickMigApplication"("tenantId", "publicNumber");
CREATE INDEX "ClickMigApplication_tenantId_status_createdAt_idx" ON "ClickMigApplication"("tenantId", "status", "createdAt");
CREATE UNIQUE INDEX "ClickMigOrder_applicationId_key" ON "ClickMigOrder"("applicationId");
CREATE UNIQUE INDEX "ClickMigOrder_tenantId_publicNumber_key" ON "ClickMigOrder"("tenantId", "publicNumber");
CREATE UNIQUE INDEX "ClickMigOrder_resubmitToken_key" ON "ClickMigOrder"("resubmitToken");
CREATE INDEX "ClickMigOrder_tenantId_status_idx" ON "ClickMigOrder"("tenantId", "status");
CREATE INDEX "ClickMigOrder_tenantId_kanbanColumnId_sortOrder_idx" ON "ClickMigOrder"("tenantId", "kanbanColumnId", "sortOrder");
CREATE INDEX "ClickMigOrder_participantUserId_idx" ON "ClickMigOrder"("participantUserId");
CREATE INDEX "ClickMigFile_applicationId_idx" ON "ClickMigFile"("applicationId");
CREATE INDEX "ClickMigFile_orderId_idx" ON "ClickMigFile"("orderId");
CREATE UNIQUE INDEX "ClickMigConfig_tenantId_key" ON "ClickMigConfig"("tenantId");

-- ForeignKeys
ALTER TABLE "ClickMigClient" ADD CONSTRAINT "ClickMigClient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClickMigClientClinic" ADD CONSTRAINT "ClickMigClientClinic_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClickMigClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClickMigApplication" ADD CONSTRAINT "ClickMigApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClickMigApplication" ADD CONSTRAINT "ClickMigApplication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClickMigClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClickMigOrder" ADD CONSTRAINT "ClickMigOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClickMigOrder" ADD CONSTRAINT "ClickMigOrder_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ClickMigApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClickMigFile" ADD CONSTRAINT "ClickMigFile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClickMigFile" ADD CONSTRAINT "ClickMigFile_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ClickMigApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClickMigFile" ADD CONSTRAINT "ClickMigFile_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ClickMigOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClickMigConfig" ADD CONSTRAINT "ClickMigConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
