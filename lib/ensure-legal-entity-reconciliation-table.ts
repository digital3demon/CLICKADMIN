import "server-only";

import type { PrismaClient } from "@prisma/client";
import { DEMO_PG_SCHEMA } from "@/lib/prisma-demo";

const checked = new WeakMap<PrismaClient, true>();

async function isSqlite(prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe("SELECT sqlite_version()");
    return true;
  } catch {
    return false;
  }
}

async function postgresTableExists(prisma: PrismaClient): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ ok: number }>>`
    SELECT 1 AS ok
    FROM information_schema.tables
    WHERE table_name = 'LegalEntityReconciliation'
      AND table_schema IN (current_schema(), ${DEMO_PG_SCHEMA})
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Таблица LegalEntityReconciliation:
 * — SQLite без migrate;
 * — демо-Postgres после старого db push (схема «готова» по User, новой таблицы ещё нет).
 */
export async function ensureLegalEntityReconciliationTable(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;

  const sqlite = await isSqlite(prisma);

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
  } else if (!(await postgresTableExists(prisma))) {
    await prisma.$executeRawUnsafe(`
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
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "LegalEntityReconciliation" ADD CONSTRAINT "LegalEntityReconciliation_tenantId_fkey"
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `);
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (
        !msg.includes("already exists") &&
        !msg.includes("duplicate")
      ) {
        throw e;
      }
    }
  }

  checked.set(prisma, true);
}
