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
        "title" TEXT NOT NULL DEFAULT '',
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

  const cols = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("WorkExample")`,
  )) as Array<{ name?: string }>;
  const colNames = new Set((Array.isArray(cols) ? cols : []).map((c) => String(c.name || "")));
  if (colNames.size > 0 && !colNames.has("title")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "WorkExample" ADD COLUMN "title" TEXT NOT NULL DEFAULT ''`,
    );
  }

  checked.set(prisma, true);
}

/** Postgres без migrate: колонка названия примера. */
export async function ensureWorkExampleTitleColumn(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$queryRawUnsafe("SELECT sqlite_version()");
    return;
  } catch {
    /* postgres */
  }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "WorkExample" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT ''`,
    );
  } catch {
    /* таблицы ещё нет */
  }
}
