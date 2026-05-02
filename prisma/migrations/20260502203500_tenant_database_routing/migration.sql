ALTER TABLE "Tenant"
ADD COLUMN "tenantDatabaseUrl" TEXT;

ALTER TABLE "Tenant"
ADD COLUMN "tenantDatabaseEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Tenant"
ADD COLUMN "tenantDatabaseReadyAt" TIMESTAMP(3);
