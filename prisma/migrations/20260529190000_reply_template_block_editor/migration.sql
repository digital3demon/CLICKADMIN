-- AlterTable
ALTER TABLE "EmailReplyTemplate" ADD COLUMN IF NOT EXISTS "layoutType" TEXT NOT NULL DEFAULT 'blocks';
ALTER TABLE "EmailReplyTemplate" ADD COLUMN IF NOT EXISTS "editorVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "EmailReplyTemplate" ADD COLUMN IF NOT EXISTS "editorDocument" JSONB;

-- Existing templates with HTML stay freeform
UPDATE "EmailReplyTemplate"
SET "layoutType" = 'freeform'
WHERE TRIM("htmlTemplate") <> '' AND "editorDocument" IS NULL;
