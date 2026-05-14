ALTER TABLE "EmailAccount" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;

DROP INDEX IF EXISTS "EmailAccount_tenantId_email_key";

CREATE UNIQUE INDEX IF NOT EXISTS "EmailAccount_tenantId_createdByUserId_email_key"
  ON "EmailAccount"("tenantId", "createdByUserId", "email");

CREATE INDEX IF NOT EXISTS "EmailAccount_tenantId_createdByUserId_isActive_idx"
  ON "EmailAccount"("tenantId", "createdByUserId", "isActive");
