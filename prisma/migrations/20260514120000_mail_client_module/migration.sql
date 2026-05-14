ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'MAIL';

DO $$ BEGIN
  CREATE TYPE "MailMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MailMessageReadState" AS ENUM ('UNREAD', 'READ');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MailLinkedEntityType" AS ENUM ('ORDER', 'CLINIC', 'DOCTOR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MailMailbox" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT,
  "imapHost" TEXT NOT NULL DEFAULT 'imap.yandex.ru',
  "imapPort" INTEGER NOT NULL DEFAULT 993,
  "imapSecure" BOOLEAN NOT NULL DEFAULT true,
  "smtpHost" TEXT NOT NULL DEFAULT 'smtp.yandex.ru',
  "smtpPort" INTEGER NOT NULL DEFAULT 465,
  "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
  "encryptedPassword" TEXT,
  "passwordUpdatedAt" TIMESTAMP(3),
  "accessRoles" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncAt" TIMESTAMP(3),
  "lastSyncUid" INTEGER,
  "lastSyncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MailMailbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MailMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "folder" TEXT NOT NULL DEFAULT 'INBOX',
  "uid" INTEGER,
  "messageId" TEXT,
  "direction" "MailMessageDirection" NOT NULL,
  "readState" "MailMessageReadState" NOT NULL DEFAULT 'UNREAD',
  "fromText" TEXT NOT NULL,
  "toText" TEXT,
  "ccText" TEXT,
  "bccText" TEXT,
  "subject" TEXT,
  "textBody" TEXT,
  "htmlBody" TEXT,
  "preview" TEXT,
  "labels" JSONB,
  "assignedUserId" TEXT,
  "isImportant" BOOLEAN NOT NULL DEFAULT false,
  "crmFolder" TEXT,
  "autoReplySentAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "rawHeaders" JSONB,
  "ruleLog" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MailMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MailAttachment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "contentId" TEXT,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MailAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MailMessageLink" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "entityType" "MailLinkedEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MailMessageLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MailRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "conditions" JSONB NOT NULL,
  "actions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MailRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MailMailbox_tenantId_email_key" ON "MailMailbox"("tenantId", "email");
CREATE INDEX IF NOT EXISTS "MailMailbox_tenantId_isActive_idx" ON "MailMailbox"("tenantId", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "MailMessage_mailboxId_folder_uid_key" ON "MailMessage"("mailboxId", "folder", "uid");
CREATE UNIQUE INDEX IF NOT EXISTS "MailMessage_mailboxId_messageId_key" ON "MailMessage"("mailboxId", "messageId");
CREATE INDEX IF NOT EXISTS "MailMessage_tenantId_mailboxId_receivedAt_idx" ON "MailMessage"("tenantId", "mailboxId", "receivedAt");
CREATE INDEX IF NOT EXISTS "MailMessage_tenantId_mailboxId_sentAt_idx" ON "MailMessage"("tenantId", "mailboxId", "sentAt");
CREATE INDEX IF NOT EXISTS "MailMessage_tenantId_direction_idx" ON "MailMessage"("tenantId", "direction");
CREATE INDEX IF NOT EXISTS "MailAttachment_tenantId_messageId_idx" ON "MailAttachment"("tenantId", "messageId");
CREATE UNIQUE INDEX IF NOT EXISTS "MailMessageLink_messageId_entityType_entityId_key" ON "MailMessageLink"("messageId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "MailMessageLink_tenantId_entityType_entityId_idx" ON "MailMessageLink"("tenantId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "MailRule_tenantId_mailboxId_isActive_sortOrder_idx" ON "MailRule"("tenantId", "mailboxId", "isActive", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "MailMailbox" ADD CONSTRAINT "MailMailbox_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_mailboxId_fkey"
    FOREIGN KEY ("mailboxId") REFERENCES "MailMailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MailAttachment" ADD CONSTRAINT "MailAttachment_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "MailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MailMessageLink" ADD CONSTRAINT "MailMessageLink_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "MailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MailRule" ADD CONSTRAINT "MailRule_mailboxId_fkey"
    FOREIGN KEY ("mailboxId") REFERENCES "MailMailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
