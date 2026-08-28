import "server-only";

import type { PrismaClient } from "@prisma/client";

const checked = new WeakMap<PrismaClient, true>();

/**
 * Таблицы мини-чата задач — локальный SQLite без migrate.
 */
export async function ensureLabTaskChatTables(prisma: PrismaClient): Promise<void> {
  if (checked.has(prisma)) return;

  const tables = (await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('LabTaskComment','LabTaskCommentRead')`,
  )) as Array<{ name?: string }>;
  const have = new Set(tables.map((t) => String(t.name || "")));

  if (!have.has("LabTaskComment")) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LabTaskComment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "taskId" TEXT NOT NULL,
        "authorUserId" TEXT,
        "authorLabel" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "parentId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "editedAt" DATETIME,
        "deletedAt" DATETIME
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "LabTaskComment_taskId_createdAt_idx" ON "LabTaskComment"("taskId", "createdAt")`,
    );
  }
  if (!have.has("LabTaskCommentRead")) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LabTaskCommentRead" (
        "userId" TEXT NOT NULL,
        "taskId" TEXT NOT NULL,
        "seenAt" DATETIME NOT NULL,
        PRIMARY KEY ("userId", "taskId")
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "LabTaskCommentRead_taskId_idx" ON "LabTaskCommentRead"("taskId")`,
    );
  }

  checked.set(prisma, true);
}
