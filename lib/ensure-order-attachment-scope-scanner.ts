import "server-only";

import type { PrismaClient } from "@prisma/client";

const checked = new WeakMap<PrismaClient, true>();

function isPostgresUrl(url: string | undefined): boolean {
  const u = String(url || "").trim().toLowerCase();
  return u.startsWith("postgres://") || u.startsWith("postgresql://");
}

/**
 * Идемпотентно добавляет значение enum SCANNER для OrderAttachmentScope (Postgres).
 * Нужно, если код уже задеплоен, а `migrate deploy` на сервере ещё не прогоняли.
 */
export async function ensureOrderAttachmentScopeScanner(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;
  if (!isPostgresUrl(process.env.DATABASE_URL)) {
    checked.set(prisma, true);
    return;
  }

  try {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "OrderAttachmentScope" ADD VALUE IF NOT EXISTS 'SCANNER'`,
    );
  } catch (e) {
    const msg = String(e).toLowerCase();
    // Уже есть / параллельный ensure / не Postgres enum.
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate") ||
      msg.includes("does not exist") ||
      msg.includes("type \"orderattachmentscope\" does not exist")
    ) {
      /* ignore */
    } else {
      console.error("[ensureOrderAttachmentScopeScanner]", e);
    }
  }

  checked.set(prisma, true);
}
