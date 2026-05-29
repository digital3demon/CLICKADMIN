-- Allow owners to disable hover previews in the mail list per mailbox.
ALTER TABLE "EmailAccount"
ADD COLUMN IF NOT EXISTS "hoverPreviewEnabled" BOOLEAN NOT NULL DEFAULT true;
