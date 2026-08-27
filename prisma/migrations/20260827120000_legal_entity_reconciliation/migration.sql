-- CreateTable
CREATE TABLE IF NOT EXISTS "LegalEntityReconciliation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "slot" "ReconciliationSnapshotSlot" NOT NULL,
    "periodFromStr" TEXT NOT NULL,
    "periodToStr" TEXT NOT NULL,
    "periodLabelRu" TEXT NOT NULL,
    "legalEntityLabel" TEXT NOT NULL,
    "periodLocked" BOOLEAN NOT NULL DEFAULT false,
    "paymentStatus" "ReconciliationSnapshotPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "invoiceFileName" TEXT,
    "invoiceMimeType" TEXT,
    "invoiceNumber" TEXT,
    "invoiceBytes" BYTEA,
    "invoiceUploadedAt" TIMESTAMP(3),
    "updFileName" TEXT,
    "updMimeType" TEXT,
    "updBytes" BYTEA,
    "updUploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalEntityReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LegalEntityReconciliation_tenantId_groupKey_slot_periodFromStr_periodToStr_key"
  ON "LegalEntityReconciliation"("tenantId", "groupKey", "slot", "periodFromStr", "periodToStr");

CREATE INDEX IF NOT EXISTS "LegalEntityReconciliation_tenantId_paymentStatus_idx"
  ON "LegalEntityReconciliation"("tenantId", "paymentStatus");

CREATE INDEX IF NOT EXISTS "LegalEntityReconciliation_tenantId_groupKey_idx"
  ON "LegalEntityReconciliation"("tenantId", "groupKey");

DO $$ BEGIN
  ALTER TABLE "LegalEntityReconciliation" ADD CONSTRAINT "LegalEntityReconciliation_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
