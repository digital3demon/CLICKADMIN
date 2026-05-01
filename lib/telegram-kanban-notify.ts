import type { PrismaClient } from "@prisma/client";
import {
  isKanbanTelegramPrefEnabled,
  mergeKanbanTelegramPrefs,
  type KanbanTelegramPrefKey,
} from "@/lib/kanban-telegram-prefs";
import { telegramSendMessage } from "@/lib/telegram-send-message";

function botToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

/**
 * Рассылка в Telegram активным пользователям с привязкой, у кого включён тип события.
 * Исключает автора действия (если известен).
 */
export async function notifyKanbanTelegramSubscribers(
  prisma: PrismaClient,
  opts: {
    event: KanbanTelegramPrefKey;
    actorUserId: string | null;
    lines: string[];
    /** Не слать в демо-сессии и без токена бота */
    skip?: boolean;
    /** Дополнительно исключить (например уже получили уведомление об @упоминании). */
    alsoExcludeUserIds?: string[];
  },
): Promise<void> {
  if (opts.skip) return;
  const token = botToken();
  if (!token) return;

  const text = opts.lines.filter(Boolean).join("\n").trim();
  if (!text) return;

  const exclude = new Set<string>();
  if (opts.actorUserId) exclude.add(opts.actorUserId);
  for (const id of opts.alsoExcludeUserIds ?? []) {
    if (id) exclude.add(id);
  }
  const excludeIds = [...exclude];

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      telegramId: { not: null },
      ...(excludeIds.length ? { NOT: { id: { in: excludeIds } } } : {}),
    },
    select: {
      id: true,
      telegramId: true,
      telegramKanbanNotifyPrefs: true,
    },
  });

  for (const u of users) {
    if (!u.telegramId?.trim()) continue;
    const merged = mergeKanbanTelegramPrefs(u.telegramKanbanNotifyPrefs);
    if (!isKanbanTelegramPrefEnabled(merged, opts.event)) continue;
    const r = await telegramSendMessage(token, u.telegramId.trim(), text);
    if (!r.ok) {
      console.warn(
        "[telegram-kanban-notify] send failed",
        u.id,
        opts.event,
        r.error,
      );
    }
  }
}

/**
 * Уведомления только указанным user id (каждый независимо проверяет prefs и Telegram).
 * Автор действия не получает сообщение.
 */
export async function notifyKanbanTelegramTargetUsers(
  prisma: PrismaClient,
  opts: {
    event: KanbanTelegramPrefKey;
    actorUserId: string | null;
    targetUserIds: string[];
    lines: string[];
    skip?: boolean;
  },
): Promise<void> {
  if (opts.skip) return;
  const token = botToken();
  if (!token) return;

  const text = opts.lines.filter(Boolean).join("\n").trim();
  if (!text) return;

  const want = new Set(opts.targetUserIds.filter(Boolean));
  if (opts.actorUserId) want.delete(opts.actorUserId);
  const ids = [...want];
  if (!ids.length) return;

  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
      isActive: true,
      telegramId: { not: null },
    },
    select: {
      id: true,
      telegramId: true,
      telegramKanbanNotifyPrefs: true,
    },
  });

  for (const u of users) {
    if (!u.telegramId?.trim()) continue;
    const merged = mergeKanbanTelegramPrefs(u.telegramKanbanNotifyPrefs);
    if (!isKanbanTelegramPrefEnabled(merged, opts.event)) continue;
    const r = await telegramSendMessage(token, u.telegramId.trim(), text);
    if (!r.ok) {
      console.warn(
        "[telegram-kanban-notify] target send failed",
        u.id,
        opts.event,
        r.error,
      );
    }
  }
}
