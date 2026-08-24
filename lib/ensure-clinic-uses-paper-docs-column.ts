import "server-only";

import type { PrismaClient } from "@prisma/client";

const checked = new WeakMap<PrismaClient, true>();

/**
 * Добавляет Clinic.usesPaperDocs, если колонки нет (локальный SQLite без migrate).
 * Клиники без ЭДО помечаем бумажным документооборотом.
 */
export async function ensureClinicUsesPaperDocsColumn(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;

  const cols = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("Clinic")`,
  )) as Array<{ name?: string }>;
  const hasCol =
    Array.isArray(cols) && cols.some((c) => c?.name === "usesPaperDocs");

  if (!hasCol) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Clinic" ADD COLUMN "usesPaperDocs" INTEGER NOT NULL DEFAULT 0`,
      );
      await prisma.$executeRawUnsafe(
        `UPDATE "Clinic" SET "usesPaperDocs" = 1 WHERE "worksWithEdo" = 0`,
      );
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (!msg.includes("duplicate column")) throw e;
    }
  }

  checked.set(prisma, true);
}
