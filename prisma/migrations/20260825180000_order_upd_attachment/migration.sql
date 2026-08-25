-- AlterEnum
ALTER TYPE "OrderAttachmentScope" ADD VALUE IF NOT EXISTS 'UPD';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "updNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "updPrinted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "updAttachmentId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_updAttachmentId_key" ON "Order"("updAttachmentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_updAttachmentId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_updAttachmentId_fkey"
      FOREIGN KEY ("updAttachmentId") REFERENCES "OrderAttachment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
