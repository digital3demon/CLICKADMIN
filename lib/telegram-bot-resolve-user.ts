import "server-only";

import type { PrismaClient } from "@prisma/client";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getTenantDbRouting,
  resolveTenantPrismaClient,
} from "@/lib/tenant-prisma-resolver";

export type TelegramLinkedUserPick = {
  tenantId: string;
  role: UserRole;
};

async function pickUserByTelegramId(
  db: PrismaClient,
  telegramUserIdStr: string,
  tid: string,
): Promise<TelegramLinkedUserPick | null> {
  return db.user.findFirst({
    where: {
      OR: [{ telegramId: tid }, { telegramId: telegramUserIdStr }],
    },
    select: { tenantId: true, role: true },
  });
}

/**
 * Пользователь с привязкой Telegram: общая БД, затем изолированные БД тенантов.
 * Иначе команды бота не находят пользователя, который есть только в tenant DB (как в UI CRM).
 */
export async function findCrmUserByTelegramIdForBot(
  telegramUserIdStr: string,
): Promise<TelegramLinkedUserPick | null> {
  const tid = telegramUserIdStr.trim();
  if (!tid) return null;

  const onControl = await pickUserByTelegramId(prisma, telegramUserIdStr, tid);
  if (onControl) return onControl;

  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  for (const { id: tenantId } of tenants) {
    const routing = await getTenantDbRouting(tenantId);
    if (!routing?.enabled || !routing.dbUrl?.trim()) continue;
    const tc = await resolveTenantPrismaClient(tenantId);
    if (tc === prisma) continue;
    const hit = await pickUserByTelegramId(tc, telegramUserIdStr, tid);
    if (hit) return hit;
  }

  return null;
}

/** Общий админский Telegram организации (Tenant.adminSharedTelegramChatId). */
export async function findTenantAdminSharedTelegramForBot(
  telegramUserIdStr: string,
): Promise<{ tenantId: string } | null> {
  const tid = telegramUserIdStr.trim();
  if (!tid) return null;

  const row = await prisma.tenant.findFirst({
    where: { adminSharedTelegramChatId: tid },
    select: { id: true },
  });
  return row ? { tenantId: row.id } : null;
}
