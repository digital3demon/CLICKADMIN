import "server-only";

import type { PrismaClient } from "@prisma/client";

const checked = new WeakMap<PrismaClient, true>();

const COLS = [
  "clarifyAskedAt",
  "clarifyAskedByUserId",
  "clarifyCommentId",
  "clarifyReplyAt",
  "clarifyReplyAckAt",
] as const;

async function addMissingTextCols(
  prisma: PrismaClient,
  table: string,
  names: Set<string>,
): Promise<void> {
  for (const col of COLS) {
    if (names.has(col)) continue;
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${table}" ADD COLUMN "${col}" TEXT`,
      );
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (!msg.includes("duplicate column")) throw e;
    }
  }
}

/**
 * Колонки «Уточнить» у корректировок, если локальный SQLite ещё без migrate.
 */
export async function ensureCorrectionClarifyColumns(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;

  const corr = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("OrderChatCorrection")`,
  )) as Array<{ name?: string }>;
  await addMissingTextCols(
    prisma,
    "OrderChatCorrection",
    new Set((Array.isArray(corr) ? corr : []).map((c) => c?.name).filter(Boolean) as string[]),
  );

  const inbox = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("OrderChatInboxItem")`,
  )) as Array<{ name?: string }>;
  await addMissingTextCols(
    prisma,
    "OrderChatInboxItem",
    new Set((Array.isArray(inbox) ? inbox : []).map((c) => c?.name).filter(Boolean) as string[]),
  );

  checked.set(prisma, true);
}
