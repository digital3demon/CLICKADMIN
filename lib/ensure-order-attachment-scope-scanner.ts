import "server-only";

import type { PrismaClient } from "@prisma/client";

const checked = new WeakMap<PrismaClient, true>();

function isPostgresUrl(url: string | undefined): boolean {
  const u = String(url || "").trim().toLowerCase();
  return u.startsWith("postgres://") || u.startsWith("postgresql://");
}

/**
 * Идемпотентно добавляет значение enum SCANNER для OrderAttachmentScope (Postgres).
 * Только для ручного/деплойного repair — НЕ вызывать на горячем пути upload
 * (параллельный ALTER TYPE даёт 500/HTML от Next).
 * Обычный путь: `npm run db:migrate:deploy` (миграция 20260809120000_...).
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
