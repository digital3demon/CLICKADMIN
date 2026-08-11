-- CreateEnum
CREATE TYPE "DepositParty" AS ENUM ('CLINIC', 'DOCTOR');

-- CreateEnum
CREATE TYPE "DepositLedgerKind" AS ENUM ('TOPUP', 'APPLY_ORDER', 'WRITE_OFF', 'ADJUST');

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "depositBalanceRub" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "depositBalanceRub" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "depositAppliedRub" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "depositAppliedParty" "DepositParty";

-- CreateTable
CREATE TABLE IF NOT EXISTS "DepositLedgerEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "party" "DepositParty" NOT NULL,
    "clinicId" TEXT,
    "doctorId" TEXT,
    "amountRub" INTEGER NOT NULL,
    "kind" "DepositLedgerKind" NOT NULL,
    "orderId" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepositLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DepositLedgerEntry_tenantId_clinicId_createdAt_idx" ON "DepositLedgerEntry"("tenantId", "clinicId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DepositLedgerEntry_tenantId_doctorId_createdAt_idx" ON "DepositLedgerEntry"("tenantId", "doctorId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DepositLedgerEntry_orderId_idx" ON "DepositLedgerEntry"("orderId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DepositLedgerEntry" ADD CONSTRAINT "DepositLedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DepositLedgerEntry" ADD CONSTRAINT "DepositLedgerEntry_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DepositLedgerEntry" ADD CONSTRAINT "DepositLedgerEntry_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DepositLedgerEntry" ADD CONSTRAINT "DepositLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DepositLedgerEntry" ADD CONSTRAINT "DepositLedgerEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
