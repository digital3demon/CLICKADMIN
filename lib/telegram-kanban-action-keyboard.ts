/**
 * Inline-кнопки под TG-уведомлениями канбана с живым инициатором:
 * «Написать в чат» → карточка/наряд; «Ответить» → ЛС инициатору.
 * Автоматика (без initiatorUserId) — без кнопок.
 */
import type { PrismaClient } from "@prisma/client";
import {
  telegramMiniAppCardWebAppUrl,
  telegramMiniAppOrderWebAppUrl,
} from "@/lib/telegram-mini-app-links";

export type KanbanTelegramActionKeyboardOpts = {
  chatUrl: string;
  orderId?: string | null;
  cardId?: string | null;
  actorTelegramUsername?: string | null;
  actorTelegramId?: string | null;
};

/** Контекст для кнопок: только когда действие сделал человек. */
export type KanbanTelegramActionContext = {
  initiatorUserId: string;
  chatUrl: string;
  orderId?: string | null;
  cardId?: string | null;
};

function normalizeTelegramUsername(raw: string | null | undefined): string | null {
  const u = String(raw || "")
    .trim()
    .replace(/^@+/, "");
  if (!u || !/^[A-Za-z0-9_]{5,32}$/.test(u)) return null;
  return u;
}

function normalizeTelegramNumericId(raw: string | null | undefined): string | null {
  const id = String(raw || "").trim();
  if (!/^\d{5,20}$/.test(id)) return null;
  return id;
}

/** InlineKeyboardMarkup или null, если нечего показать. */
export function buildKanbanTelegramActionInlineKeyboard(
  opts: KanbanTelegramActionKeyboardOpts,
): { inline_keyboard: Array<Array<Record<string, unknown>>> } | null {
  const row: Array<Record<string, unknown>> = [];

  const orderId = String(opts.orderId || "").trim();
  const cardId = String(opts.cardId || "").trim();
  const chatUrl = String(opts.chatUrl || "").trim();

  const webApp =
    (orderId ? telegramMiniAppOrderWebAppUrl(orderId) : null) ||
    (cardId ? telegramMiniAppCardWebAppUrl(cardId) : null);

  if (webApp) {
    row.push({ text: "Написать в чат", web_app: { url: webApp } });
  } else if (/^https?:\/\//i.test(chatUrl)) {
    row.push({ text: "Написать в чат", url: chatUrl });
  }

  const username = normalizeTelegramUsername(opts.actorTelegramUsername);
  const tgId = normalizeTelegramNumericId(opts.actorTelegramId);
  if (username) {
    row.push({ text: "Ответить", url: `https://t.me/${username}` });
  } else if (tgId) {
    row.push({ text: "Ответить", url: `tg://user?id=${tgId}` });
  }

  if (row.length === 0) return null;
  return { inline_keyboard: [row] };
}

/** Загружает TG инициатора и собирает клавиатуру; без человека — null. */
export async function loadKanbanTelegramActionReplyMarkup(
  prisma: PrismaClient,
  ctx: KanbanTelegramActionContext | null | undefined,
): Promise<Record<string, unknown> | null> {
  const initiatorId = String(ctx?.initiatorUserId || "").trim();
  if (!initiatorId || !ctx) return null;

  const actor = await prisma.user.findUnique({
    where: { id: initiatorId },
    select: { telegramId: true, telegramUsername: true },
  });

  return buildKanbanTelegramActionInlineKeyboard({
    chatUrl: ctx.chatUrl,
    orderId: ctx.orderId,
    cardId: ctx.cardId,
    actorTelegramId: actor?.telegramId,
    actorTelegramUsername: actor?.telegramUsername,
  });
}
