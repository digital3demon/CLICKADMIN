-- EmailReplyTemplate (один шаблон автоответа на ящик)
CREATE TABLE IF NOT EXISTS "EmailReplyTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "subjectTemplate" TEXT NOT NULL DEFAULT '',
    "htmlTemplate" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailReplyTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailReplyTemplate_accountId_key" ON "EmailReplyTemplate"("accountId");
CREATE INDEX IF NOT EXISTS "EmailReplyTemplate_tenantId_accountId_idx" ON "EmailReplyTemplate"("tenantId", "accountId");

DO $$ BEGIN
  ALTER TABLE "EmailReplyTemplate" ADD CONSTRAINT "EmailReplyTemplate_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Поля автоответа в связи письмо ↔ наряд
ALTER TABLE "EmailSourceOrder" ADD COLUMN IF NOT EXISTS "isReplyTarget" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EmailSourceOrder" ADD COLUMN IF NOT EXISTS "autoReplySentAt" TIMESTAMP(3);
ALTER TABLE "EmailSourceOrder" ADD COLUMN IF NOT EXISTS "autoReplyEmailId" TEXT;

DO $$ BEGIN
  ALTER TABLE "EmailSourceOrder" ADD CONSTRAINT "EmailSourceOrder_autoReplyEmailId_fkey"
    FOREIGN KEY ("autoReplyEmailId") REFERENCES "Email"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
