DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ReconciliationSnapshotPaymentStatus'
  ) THEN
    CREATE TYPE "ReconciliationSnapshotPaymentStatus" AS ENUM ('UNPAID', 'PAID');
  END IF;
END
$$;

ALTER TABLE "ClinicReconciliationSnapshot"
ADD COLUMN IF NOT EXISTS "orderIdsJson" JSONB,
ADD COLUMN IF NOT EXISTS "paymentStatus" "ReconciliationSnapshotPaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "downloadedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "invoiceFileName" TEXT,
ADD COLUMN IF NOT EXISTS "invoiceMimeType" TEXT,
ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT,
ADD COLUMN IF NOT EXISTS "invoiceBytes" BYTEA,
ADD COLUMN IF NOT EXISTS "invoiceUploadedAt" TIMESTAMP(3);

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "paymentPartialRub" INTEGER;
