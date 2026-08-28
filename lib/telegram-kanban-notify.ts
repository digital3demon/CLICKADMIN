import type { PrismaClient, UserRole } from "@prisma/client";
import {
  adminSharedMessengerAllowsEvent,
  mergeAdminSharedMessengerNotifyPrefs,
} from "@/lib/admin-shared-messenger-prefs";
import {
  isKanbanTelegramPrefEnabled,
  mergeKanbanTelegramPrefs,
  type KanbanTelegramPrefKey,
} from "@/lib/kanban-telegram-prefs";
import { telegramSendMessage } from "@/lib/telegram-send-message";
import {
  isCardMemberScopedTelegramEvent,
  uniqTelegramTargetUserIds,
} from "@/lib/telegram-kanban-card-scope";

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
    /** Если задано — только эти роли (например уведомления производства). */
    onlyRoles?: UserRole[];
    /**
     * Карточка/наряд: только эти user id (ответственные и участники).
     * Для card-scoped события без списка рассылка всем запрещена.
     */
    onlyUserIds?: string[];
  },
): Promise<void> {
  if (opts.skip) return;
  const token = botToken();
  if (!token) return;

  const hasAny =
    opts.lines.some(Boolean) || (opts.linesAdmin?.some(Boolean) ?? false);
  if (!hasAny) return;

  const memberIds = uniqTelegramTargetUserIds(opts.onlyUserIds);
  if (isCardMemberScopedTelegramEvent(opts.event) && memberIds.length === 0) {
    console.warn(
      "[telegram-kanban-notify] skip: card-scoped event without members",
      opts.event,
    );
    return;
  }

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
      ...(memberIds.length ? { id: { in: memberIds } } : {}),
      ...(opts.onlyRoles?.length ? { role: { in: opts.onlyRoles } } : {}),
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

/** Общий админский Telegram организации (настройки «Мессенджер для админов»). */
export async function notifyTenantAdminSharedTelegramChat(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    event: KanbanTelegramPrefKey;
    alternatePrefKeys?: KanbanTelegramPrefKey[];
    lines: string[];
    linesAdmin?: string[];
    parseMode?: "HTML";
    skip?: boolean;
  },
): Promise<void> {
  if (opts.skip) return;
  const token = botToken();
  if (!token) return;

  const useAdmin =
    (opts.linesAdmin ?? []).some(Boolean) && opts.linesAdmin
      ? opts.linesAdmin
      : opts.lines;
  const text = useAdmin.filter(Boolean).join("\n").trim();
  if (!text) return;

  const tenant = await prisma.tenant.findUnique({
    where: { id: opts.tenantId },
    select: {
      adminSharedTelegramChatId: true,
      adminSharedMessengerNotifyPrefs: true,
    },
  });
  if (!tenant) return;
  const chatId = tenant.adminSharedTelegramChatId?.trim();
  if (!chatId) return;

  const merged = mergeAdminSharedMessengerNotifyPrefs(
    tenant.adminSharedMessengerNotifyPrefs,
  );
  const prefKeys: KanbanTelegramPrefKey[] = [
    opts.event,
    ...(opts.alternatePrefKeys ?? []),
  ];
  if (!adminSharedMessengerAllowsEvent(merged, prefKeys)) return;

  const r = await telegramSendMessage(token, chatId, text, {
    parseMode: opts.parseMode,
  });
  if (!r.ok) {
    console.warn(
      "[telegram-kanban-notify] tenant shared chat send failed",
      opts.tenantId,
      opts.event,
      r.error,
    );
  }
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
    /** Автору, если он в targets (своя карточка): «Вы перенесли…». */
    linesSelf?: string[];
    linesSelfAdmin?: string[];
    /** Дублирование на общий админский Telegram тенанта (если привязан и включены prefs). */
    tenantId?: string | null;
    /** Не слать в общий админ-чат (личные @упоминания — только в ЛС, иначе дубль «упомянул вас»). */
    skipTenantSharedChat?: boolean;
  },
): Promise<void> {
  if (opts.skip) return;
  const token = botToken();
  if (!token) {
    console.warn("[telegram-kanban-notify] skip: TELEGRAM_BOT_TOKEN empty", opts.event);
    return;
  }

  const hasAny =
    opts.lines.some(Boolean) || (opts.linesAdmin?.some(Boolean) ?? false);
  const hasSelf =
    (opts.linesSelf ?? []).some(Boolean) ||
    (opts.linesSelfAdmin ?? []).some(Boolean);
  if (!hasAny && !hasSelf) return;

  const actorId = String(opts.actorUserId || "").trim();
  const original = new Set(opts.targetUserIds.filter(Boolean));
  const others = [...original].filter((id) => id !== actorId);
  const sendSelf = Boolean(hasSelf && actorId && original.has(actorId));
  const ids = sendSelf && actorId ? [...others, actorId] : others;
  if (!ids.length) {
    console.warn("[telegram-kanban-notify] skip: no targets after excluding actor", {
      event: opts.event,
      actorUserId: opts.actorUserId,
    });
  }

  const prefKeys: KanbanTelegramPrefKey[] = [
    opts.event,
    ...(opts.alternatePrefKeys ?? []),
  ];

  const users = ids.length
    ? await prisma.user.findMany({
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
      })
    : [];

  if (ids.length && !users.length) {
    console.warn("[telegram-kanban-notify] skip: targets have no telegramId", {
      event: opts.event,
      targetUserIds: ids,
    });
  }

  for (const u of users) {
    if (!u.telegramId?.trim()) continue;
    const merged = mergeKanbanTelegramPrefs(u.telegramKanbanNotifyPrefs);
    if (!hasAnyKanbanPrefEnabled(merged, prefKeys)) {
      console.warn("[telegram-kanban-notify] skip: prefs off", u.id, prefKeys);
      continue;
    }
    const isSelf = sendSelf && u.id === actorId;
    const mergedLines = linesHtmlForKanbanTelegramRecipient(
      u.role,
      isSelf ? (opts.linesSelf ?? opts.lines) : opts.lines,
      isSelf ? opts.linesSelfAdmin ?? opts.linesAdmin : opts.linesAdmin,
    );
    const text = mergedLines.join("\n").trim();
    if (!text) continue;
    let r = await telegramSendMessage(token, u.telegramId.trim(), text, {
      parseMode: opts.parseMode,
    });
    if (!r.ok && opts.parseMode === "HTML") {
      const err = r.error.toLowerCase();
      if (err.includes("parse") || err.includes("entity") || err.includes("html")) {
        const plain = text
          .replace(/<a href="[^"]*">([^<]*)<\/a>/gi, "$1")
          .replace(/<\/?b>/gi, "")
          .replace(/<[^>]+>/g, "");
        r = await telegramSendMessage(token, u.telegramId.trim(), plain);
      }
    }
    if (!r.ok) {
      console.warn(
        "[telegram-kanban-notify] target send failed",
        u.id,
        opts.event,
        r.error,
      );
    }
  }

  const tid = opts.tenantId?.trim();
  if (tid && !opts.skipTenantSharedChat) {
    await notifyTenantAdminSharedTelegramChat(prisma, {
      tenantId: tid,
      event: opts.event,
      alternatePrefKeys: opts.alternatePrefKeys,
      lines: opts.lines,
      linesAdmin: opts.linesAdmin,
      parseMode: opts.parseMode,
      skip: opts.skip,
    });
  }
}

/** Личные подписчики и общий чат «Мессенджер для админов» — один тип события и те же строки. */
export async function notifyKanbanTelegramSubscribersAndTenantSharedChat(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    event: KanbanTelegramPrefKey;
    actorUserId: string | null;
    lines: string[];
    linesAdmin?: string[];
    parseMode?: "HTML";
    skip?: boolean;
    onlyUserIds?: string[];
  },
): Promise<void> {
  await notifyKanbanTelegramSubscribers(prisma, {
    event: opts.event,
    actorUserId: opts.actorUserId,
    lines: opts.lines,
    linesAdmin: opts.linesAdmin,
    parseMode: opts.parseMode,
    skip: opts.skip,
    onlyUserIds: opts.onlyUserIds,
  });
  await notifyTenantAdminSharedTelegramChat(prisma, {
    tenantId: opts.tenantId,
    event: opts.event,
    lines: opts.lines,
    linesAdmin: opts.linesAdmin,
    parseMode: opts.parseMode,
    skip: opts.skip,
  });
}
