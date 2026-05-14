-- Старый почтовый клиент удаляется без миграции данных: заменяем Mail* на Email*.
DROP TABLE IF EXISTS "MailRule" CASCADE;
DROP TABLE IF EXISTS "MailMessageLink" CASCADE;
DROP TABLE IF EXISTS "MailAttachment" CASCADE;
DROP TABLE IF EXISTS "MailMessage" CASCADE;
DROP TABLE IF EXISTS "MailMailbox" CASCADE;

DROP TYPE IF EXISTS "MailLinkedEntityType";
DROP TYPE IF EXISTS "MailMessageReadState";
DROP TYPE IF EXISTS "MailMessageDirection";

DO $$ BEGIN
  CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'DRAFT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailFolderType" AS ENUM ('INBOX', 'SENT', 'DRAFTS', 'SPAM', 'TRASH', 'ARCHIVE', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "EmailAccount" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT,
  "encryptedAppPassword" TEXT,
  "passwordUpdatedAt" TIMESTAMP(3),
  "imapHost" TEXT NOT NULL DEFAULT 'imap.yandex.ru',
  "imapPort" INTEGER NOT NULL DEFAULT 993,
  "imapSecure" BOOLEAN NOT NULL DEFAULT true,
  "smtpHost" TEXT NOT NULL DEFAULT 'smtp.yandex.ru',
  "smtpPort" INTEGER NOT NULL DEFAULT 465,
  "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncAt" TIMESTAMP(3),
  "lastSyncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailFolder" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "imapName" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "type" "EmailFolderType" NOT NULL DEFAULT 'CUSTOM',
  "delimiter" TEXT,
  "parentId" TEXT,
  "unreadCount" INTEGER NOT NULL DEFAULT 0,
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "lastSyncedUid" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Email" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "folderId" TEXT,
  "uid" INTEGER,
  "messageId" TEXT,
  "threadId" TEXT,
  "direction" "EmailDirection" NOT NULL DEFAULT 'INBOUND',
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "isFlagged" BOOLEAN NOT NULL DEFAULT false,
  "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
  "fromName" TEXT,
  "fromAddress" TEXT,
  "to" JSONB,
  "cc" JSONB,
  "bcc" JSONB,
  "subject" TEXT,
  "preview" TEXT,
  "textBody" TEXT,
  "htmlBody" TEXT,
  "rawHeaders" JSONB,
  "receivedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "internalDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailLabel" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "unreadCount" INTEGER NOT NULL DEFAULT 0,
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailLabel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailLabelAssignment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "emailId" TEXT NOT NULL,
  "labelId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailLabelAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailAttachment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "emailId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "contentId" TEXT,
  "isInline" BOOLEAN NOT NULL DEFAULT false,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailAccount_tenantId_email_key" ON "EmailAccount"("tenantId", "email");
CREATE INDEX IF NOT EXISTS "EmailAccount_tenantId_isActive_idx" ON "EmailAccount"("tenantId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "EmailFolder_accountId_imapName_key" ON "EmailFolder"("accountId", "imapName");
CREATE INDEX IF NOT EXISTS "EmailFolder_tenantId_accountId_type_idx" ON "EmailFolder"("tenantId", "accountId", "type");
CREATE INDEX IF NOT EXISTS "EmailFolder_tenantId_accountId_sortOrder_idx" ON "EmailFolder"("tenantId", "accountId", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "Email_accountId_folderId_uid_key" ON "Email"("accountId", "folderId", "uid");
CREATE UNIQUE INDEX IF NOT EXISTS "Email_accountId_messageId_key" ON "Email"("accountId", "messageId");
CREATE INDEX IF NOT EXISTS "Email_tenantId_accountId_folderId_receivedAt_idx" ON "Email"("tenantId", "accountId", "folderId", "receivedAt");
CREATE INDEX IF NOT EXISTS "Email_tenantId_accountId_isRead_receivedAt_idx" ON "Email"("tenantId", "accountId", "isRead", "receivedAt");
CREATE INDEX IF NOT EXISTS "Email_tenantId_accountId_isFlagged_receivedAt_idx" ON "Email"("tenantId", "accountId", "isFlagged", "receivedAt");
CREATE INDEX IF NOT EXISTS "Email_tenantId_direction_idx" ON "Email"("tenantId", "direction");

CREATE UNIQUE INDEX IF NOT EXISTS "EmailLabel_accountId_name_key" ON "EmailLabel"("accountId", "name");
CREATE INDEX IF NOT EXISTS "EmailLabel_tenantId_accountId_sortOrder_idx" ON "EmailLabel"("tenantId", "accountId", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "EmailLabelAssignment_emailId_labelId_key" ON "EmailLabelAssignment"("emailId", "labelId");
CREATE INDEX IF NOT EXISTS "EmailLabelAssignment_tenantId_labelId_idx" ON "EmailLabelAssignment"("tenantId", "labelId");

CREATE INDEX IF NOT EXISTS "EmailAttachment_tenantId_emailId_idx" ON "EmailAttachment"("tenantId", "emailId");

DO $$ BEGIN
  ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailFolder" ADD CONSTRAINT "EmailFolder_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Email" ADD CONSTRAINT "Email_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Email" ADD CONSTRAINT "Email_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "EmailFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailLabel" ADD CONSTRAINT "EmailLabel_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailLabelAssignment" ADD CONSTRAINT "EmailLabelAssignment_emailId_fkey"
    FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailLabelAssignment" ADD CONSTRAINT "EmailLabelAssignment_labelId_fkey"
    FOREIGN KEY ("labelId") REFERENCES "EmailLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_emailId_fkey"
    FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
