CREATE TABLE IF NOT EXISTS "EmailRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "conditions" JSONB NOT NULL,
  "actions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailRule_tenantId_accountId_isActive_sortOrder_idx"
  ON "EmailRule"("tenantId", "accountId", "isActive", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "EmailRule" ADD CONSTRAINT "EmailRule_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
