import "server-only";

import type { PrismaClient } from "@prisma/client";

const checked = new WeakMap<PrismaClient, true>();

/**
 * Колонки долгов ФинОтдела, если локальный SQLite ещё без migrate.
 */
export async function ensureFinanceOfficeDebtColumns(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;

  const clinicCols = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("Clinic")`,
  )) as Array<{ name?: string }>;
  const clinicNames = new Set(
    (Array.isArray(clinicCols) ? clinicCols : []).map((c) => c?.name),
  );
  if (!clinicNames.has("useEmailForInvoices")) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Clinic" ADD COLUMN "useEmailForInvoices" INTEGER NOT NULL DEFAULT 0`,
      );
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (!msg.includes("duplicate column")) throw e;
    }
  }
  if (!clinicNames.has("invoiceEmail")) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Clinic" ADD COLUMN "invoiceEmail" TEXT`,
      );
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (!msg.includes("duplicate column")) throw e;
    }
  }

  const tenantCols = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("Tenant")`,
  )) as Array<{ name?: string }>;
  const tenantNames = new Set(
    (Array.isArray(tenantCols) ? tenantCols : []).map((c) => c?.name),
  );
  if (!tenantNames.has("financeOfficeDebtWorkingDays")) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Tenant" ADD COLUMN "financeOfficeDebtWorkingDays" INTEGER NOT NULL DEFAULT 10`,
      );
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (!msg.includes("duplicate column")) throw e;
    }
  }
  if (!tenantNames.has("financeOfficeDebtEmailTemplate")) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Tenant" ADD COLUMN "financeOfficeDebtEmailTemplate" TEXT`,
      );
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (!msg.includes("duplicate column")) throw e;
    }
  }
  if (!tenantNames.has("financeOfficeDebtEmailAccountId")) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Tenant" ADD COLUMN "financeOfficeDebtEmailAccountId" TEXT`,
      );
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (!msg.includes("duplicate column")) throw e;
    }
  }

  checked.set(prisma, true);
}
