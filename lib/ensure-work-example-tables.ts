import "server-only";

import type { PrismaClient } from "@prisma/client";

const checked = new WeakMap<PrismaClient, true>();

/** Локальный SQLite без migrate. */
export async function ensureWorkExampleTables(prisma: PrismaClient): Promise<void> {
  if (checked.has(prisma)) return;

  const tables = (await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('WorkExample','WorkExampleFile')`,
  )) as Array<{ name?: string }>;
  const have = new Set(tables.map((t) => String(t.name || "")));

  if (!have.has("WorkExample")) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WorkExample" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "orderId" TEXT,
        "cloudUrl" TEXT,
        "cloudUrlPrevious" TEXT,
        "cloudUrlDeletedAt" DATETIME,
        "cloudUrlDeletedByUserId" TEXT,
        "cloudUrlDeletedByLabel" TEXT,
        "technicianNotes" TEXT NOT NULL DEFAULT '',
        "doctorComments" TEXT NOT NULL DEFAULT '',
        "cardTypes" TEXT NOT NULL,
        "compositionSnapshot" TEXT NOT NULL,
        "shareToken" TEXT NOT NULL,
        "createdByUserId" TEXT,
        "deletedAt" DATETIME,
        "deletedByUserId" TEXT,
        "deletedByLabel" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "WorkExample_shareToken_key" ON "WorkExample"("shareToken")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "WorkExample_tenantId_deletedAt_createdAt_idx" ON "WorkExample"("tenantId", "deletedAt", "createdAt")`,
    );
  }
  if (!have.has("WorkExampleFile")) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WorkExampleFile" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "exampleId" TEXT NOT NULL,
        "kind" TEXT NOT NULL,
        "fileName" TEXT NOT NULL,
        "mime" TEXT NOT NULL,
        "sizeBytes" INTEGER NOT NULL,
        "diskRelPath" TEXT NOT NULL,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "deletedAt" DATETIME,
        "deletedByUserId" TEXT,
        "deletedByLabel" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "WorkExampleFile_exampleId_deletedAt_sortOrder_idx" ON "WorkExampleFile"("exampleId", "deletedAt", "sortOrder")`,
    );
  }

  checked.set(prisma, true);
}
