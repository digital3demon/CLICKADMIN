CREATE TYPE "EmailSyncMode" AS ENUM ('RECENT', 'BACKFILL');
CREATE TYPE "EmailSyncJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "EmailFolder"
  ADD COLUMN IF NOT EXISTS "lastBackfillUid" INTEGER,
  ADD COLUMN IF NOT EXISTS "syncLockedAt" TIMESTAMP(3);

ALTER TABLE "EmailAttachment"
  ADD COLUMN IF NOT EXISTS "diskRelPath" TEXT,
  ADD COLUMN IF NOT EXISTS "checksumSha256" TEXT,
  ALTER COLUMN "data" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "EmailSyncJob" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "jobKey" TEXT NOT NULL,
  "mode" "EmailSyncMode" NOT NULL DEFAULT 'RECENT',
  "status" "EmailSyncJobStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "imported" INTEGER NOT NULL DEFAULT 0,
  "skipped" INTEGER NOT NULL DEFAULT 0,
  "folders" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "stats" JSONB,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailSyncJob_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmailSyncJob_accountId_fkey'
  ) THEN
    ALTER TABLE "EmailSyncJob"
      ADD CONSTRAINT "EmailSyncJob_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "EmailSyncJob_jobKey_key"
  ON "EmailSyncJob"("jobKey");

CREATE INDEX IF NOT EXISTS "EmailSyncJob_tenantId_accountId_status_queuedAt_idx"
  ON "EmailSyncJob"("tenantId", "accountId", "status", "queuedAt");

CREATE INDEX IF NOT EXISTS "EmailSyncJob_tenantId_createdByUserId_status_queuedAt_idx"
  ON "EmailSyncJob"("tenantId", "createdByUserId", "status", "queuedAt");

DROP INDEX IF EXISTS "Email_tenantId_accountId_folderId_receivedAt_idx";
DROP INDEX IF EXISTS "Email_tenantId_accountId_isRead_receivedAt_idx";
DROP INDEX IF EXISTS "Email_tenantId_accountId_isFlagged_receivedAt_idx";

CREATE INDEX IF NOT EXISTS "Email_tenantId_accountId_folderId_receivedAt_id_idx"
  ON "Email"("tenantId", "accountId", "folderId", "receivedAt", "id");

CREATE INDEX IF NOT EXISTS "Email_tenantId_accountId_isRead_receivedAt_id_idx"
  ON "Email"("tenantId", "accountId", "isRead", "receivedAt", "id");

CREATE INDEX IF NOT EXISTS "Email_tenantId_accountId_isFlagged_receivedAt_id_idx"
  ON "Email"("tenantId", "accountId", "isFlagged", "receivedAt", "id");

CREATE INDEX IF NOT EXISTS "Email_tenantId_accountId_hasAttachments_receivedAt_id_idx"
  ON "Email"("tenantId", "accountId", "hasAttachments", "receivedAt", "id");
