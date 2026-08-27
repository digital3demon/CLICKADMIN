import "server-only";

import type { PrismaClient } from "@prisma/client";

const checked = new WeakMap<PrismaClient, true>();

export async function ensureLegalEntityReconciliationTable(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;

  const url = String(process.env.DATABASE_URL ?? "");
  const sqlite = url.startsWith("file:");

  if (sqlite) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LegalEntityReconciliation" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "groupKey" TEXT NOT NULL,
        "slot" TEXT NOT NULL,
        "periodFromStr" TEXT NOT NULL,
        "periodToStr" TEXT NOT NULL,
        "periodLabelRu" TEXT NOT NULL,
        "legalEntityLabel" TEXT NOT NULL,
        "periodLocked" INTEGER NOT NULL DEFAULT 0,
        "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
        "paidAt" DATETIME,
        "downloadedAt" DATETIME,
        "invoiceFileName" TEXT,
        "invoiceMimeType" TEXT,
        "invoiceNumber" TEXT,
        "invoiceBytes" BLOB,
        "invoiceUploadedAt" DATETIME,
        "updFileName" TEXT,
        "updMimeType" TEXT,
        "updBytes" BLOB,
        "updUploadedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LegalEntityReconciliation_tenantId_fkey"
          FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "LegalEntityReconciliation_tenantId_groupKey_slot_periodFromStr_periodToStr_key"
      ON "LegalEntityReconciliation"("tenantId", "groupKey", "slot", "periodFromStr", "periodToStr")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "LegalEntityReconciliation_tenantId_paymentStatus_idx"
      ON "LegalEntityReconciliation"("tenantId", "paymentStatus")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "LegalEntityReconciliation_tenantId_groupKey_idx"
      ON "LegalEntityReconciliation"("tenantId", "groupKey")
    `);
  }

  checked.set(prisma, true);
}
