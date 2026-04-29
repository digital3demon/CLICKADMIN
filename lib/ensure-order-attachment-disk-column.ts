import "server-only";

import type { PrismaClient } from "@prisma/client";

const checked = new WeakMap<PrismaClient, true>();

/**
 * Добавляет колонку `diskRelPath`, если в SQLite её ещё нет (миграция не прогнана при занятой БД).
 * Идемпотентно на экземпляр `PrismaClient` (основная и демо-БД — раздельно).
 */
export async function ensureOrderAttachmentDiskRelPathColumn(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;

  const rows = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("OrderAttachment")`,
  )) as Array<{ name?: string }>;

  const has = Array.isArray(rows) && rows.some((r) => r?.name === "diskRelPath");
  if (has) {
    checked.set(prisma, true);
    return;
  }

  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "OrderAttachment" ADD COLUMN "diskRelPath" TEXT`,
    );
  } catch (e) {
    const msg = String(e).toLowerCase();
    if (
      msg.includes("duplicate column") ||
      msg.includes("already exists")
    ) {
      /* параллельный запрос успел раньше */
    } else {
      throw e;
    }
  }

  checked.set(prisma, true);
}
