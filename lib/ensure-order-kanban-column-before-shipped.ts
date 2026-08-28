import "server-only";

import type { PrismaClient } from "@prisma/client";

const checked = new WeakMap<PrismaClient, true>();

/**
 * Order.kanbanColumnBeforeShipped — локальный SQLite без migrate.
 */
export async function ensureOrderKanbanColumnBeforeShipped(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;

  const cols = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("Order")`,
  )) as Array<{ name?: string }>;
  const hasCol =
    Array.isArray(cols) && cols.some((c) => c?.name === "kanbanColumnBeforeShipped");

  if (!hasCol) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Order" ADD COLUMN "kanbanColumnBeforeShipped" TEXT`,
      );
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (!msg.includes("duplicate column")) throw e;
    }
  }

  checked.set(prisma, true);
}
