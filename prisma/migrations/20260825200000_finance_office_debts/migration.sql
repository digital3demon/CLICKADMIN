-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "financeOfficeDebtWorkingDays" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "financeOfficeDebtEmailTemplate" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "financeOfficeDebtEmailAccountId" TEXT;

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "useEmailForInvoices" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "invoiceEmail" TEXT;

CREATE INDEX IF NOT EXISTS "Tenant_financeOfficeDebtEmailAccountId_idx"
  ON "Tenant"("financeOfficeDebtEmailAccountId");
