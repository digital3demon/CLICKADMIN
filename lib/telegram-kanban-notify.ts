import type { PrismaClient, UserRole } from "@prisma/client";
import {
  isKanbanTelegramPrefEnabled,
  mergeKanbanTelegramPrefs,
  type KanbanTelegramPrefKey,
} from "@/lib/kanban-telegram-prefs";
import { telegramSendMessage } from "@/lib/telegram-send-message";

/** Две ссылки (канбан + наряд): администратор, старший администратор, руководитель. */
function linesHtmlForKanbanTelegramRecipient(
  role: UserRole,
  lines: string[],
  linesAdmin?: string[],
): string[] {
  const adminHtml = (linesAdmin ?? []).filter(Boolean).join("\n").trim();
  if (
    adminHtml &&
    (role === "ADMINISTRATOR" ||
      role === "SENIOR_ADMINISTRATOR" ||
      role === "MANAGER")
  ) {
    return (linesAdmin ?? []).filter(Boolean);
  }
  return lines.filter(Boolean);
}

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
    /** Гиперссылки и разметка — только с экранированием через escapeTelegramHtml. */
    parseMode?: "HTML";
    /** Для ADMINISTRATOR / SENIOR_ADMINISTRATOR / MANAGER: две ссылки «карточке» + «заказе» (при наряде). */
    linesAdmin?: string[];
  },
): Promise<void> {
  if (opts.skip) return;
  const token = botToken();
  if (!token) return;

  const hasAny =
    opts.lines.some(Boolean) || (opts.linesAdmin?.some(Boolean) ?? false);
  if (!hasAny) return;

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
      role: true,
      telegramId: true,
      telegramKanbanNotifyPrefs: true,
    },
  });

  for (const u of users) {
    if (!u.telegramId?.trim()) continue;
    const merged = mergeKanbanTelegramPrefs(u.telegramKanbanNotifyPrefs);
    if (!isKanbanTelegramPrefEnabled(merged, opts.event)) continue;
    const mergedLines = linesHtmlForKanbanTelegramRecipient(
      u.role,
      opts.lines,
      opts.linesAdmin,
    );
    const text = mergedLines.join("\n").trim();
    if (!text) continue;
    const r = await telegramSendMessage(token, u.telegramId.trim(), text, {
      parseMode: opts.parseMode,
    });
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

function hasAnyKanbanPrefEnabled(
  merged: ReturnType<typeof mergeKanbanTelegramPrefs>,
  keys: readonly KanbanTelegramPrefKey[],
): boolean {
  return keys.some((k) => isKanbanTelegramPrefEnabled(merged, k));
}

/**
 * Уведомления только указанным user id (каждый независимо проверяет prefs и Telegram).
 * Автор действия не получает сообщение.
 *
 * `alternatePrefKeys` — достаточно включить любой из ключей (например упоминание ИЛИ «комментарий»).
 */
export async function notifyKanbanTelegramTargetUsers(
  prisma: PrismaClient,
  opts: {
    event: KanbanTelegramPrefKey;
    /** Допустимы альтернативные типы уведомлений (OR по prefs). */
    alternatePrefKeys?: KanbanTelegramPrefKey[];
    actorUserId: string | null;
    targetUserIds: string[];
    lines: string[];
    skip?: boolean;
    parseMode?: "HTML";
    linesAdmin?: string[];
  },
): Promise<void> {
  if (opts.skip) return;
  const token = botToken();
  if (!token) return;

  const hasAny =
    opts.lines.some(Boolean) || (opts.linesAdmin?.some(Boolean) ?? false);
  if (!hasAny) return;

  const want = new Set(opts.targetUserIds.filter(Boolean));
  if (opts.actorUserId) want.delete(opts.actorUserId);
  const ids = [...want];
  if (!ids.length) return;

  const prefKeys: KanbanTelegramPrefKey[] = [
    opts.event,
    ...(opts.alternatePrefKeys ?? []),
  ];

  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
      isActive: true,
      telegramId: { not: null },
    },
    select: {
      id: true,
      role: true,
      telegramId: true,
      telegramKanbanNotifyPrefs: true,
    },
  });

  for (const u of users) {
    if (!u.telegramId?.trim()) continue;
    const merged = mergeKanbanTelegramPrefs(u.telegramKanbanNotifyPrefs);
    if (!hasAnyKanbanPrefEnabled(merged, prefKeys)) continue;
    const mergedLines = linesHtmlForKanbanTelegramRecipient(
      u.role,
      opts.lines,
      opts.linesAdmin,
    );
    const text = mergedLines.join("\n").trim();
    if (!text) continue;
    const r = await telegramSendMessage(token, u.telegramId.trim(), text, {
      parseMode: opts.parseMode,
    });
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
