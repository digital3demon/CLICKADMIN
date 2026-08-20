/**
 * HTML для TG: кто упомянул + ссылки + текст комментария (и в первой строке, и отдельно).
 * commentText — как ввёл пользователь; в HTML только escapeTelegramHtml.
 */
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { escapeTelegramHtml, telegramHtmlLink } from "@/lib/telegram-html";

const TELEGRAM_MENTION_COMMENT_MAX = 800;

/** Контекст для сборки HTML одной строки уведомления об @упоминании в чате. */
export type KanbanMentionTelegramContext = {
  actorDisplayName: string;
  actorMentionHandle?: string | null;
  linkedOrderId?: string | null;
  /** Текст ссылки на наряд — номер наряда (как в списке заказов). */
  orderNumberLabel?: string | null;
  kaitenCardId?: number | null;
  /** Fallback и если веб-URL Kaiten не собрался из env. */
  kanbanCardAbsoluteUrl: string;
  /** Абсолютная ссылка на страницу наряда в CRM; нужна при наличии linkedOrderId. */
  orderPageAbsoluteUrl?: string | null;
  /** Текст комментария (с @тегами) — всегда в конец HTML, если не пустой. */
  commentText?: string | null;
};

/**
 * Текст комментария для TG: схлопывает пробелы, режет длину.
 * Не выкидываем @теги — иначе пуш без «слов кроме упоминания» уходил пустым.
 */
export function telegramMentionCommentQuote(
  text: string,
  max = TELEGRAM_MENTION_COMMENT_MAX,
): string | null {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, Math.max(1, max - 1))}…`;
}

function actorWhoLine(ctx: KanbanMentionTelegramContext): string {
  const name = escapeTelegramHtml(
    (ctx.actorDisplayName || "").trim() || "Пользователь",
  );
  const h = (ctx.actorMentionHandle || "").trim();
  if (!h) return name;
  return `${name} (${escapeTelegramHtml("@" + h)})`;
}

function mentionHeadHtml(ctx: KanbanMentionTelegramContext): string {
  const who = actorWhoLine(ctx);

  const kid = ctx.kaitenCardId;
  const kaitenHref =
    kid != null && Number.isFinite(Number(kid))
      ? getKaitenCardWebUrl(Number(kid))
      : null;
  const cardHref =
    kaitenHref && kaitenHref.trim().length > 0
      ? kaitenHref.trim()
      : ctx.kanbanCardAbsoluteUrl.trim();
  const cardLink = telegramHtmlLink(cardHref, "карточке");

  const oid = (ctx.linkedOrderId || "").trim();
  const orderUrl = (ctx.orderPageAbsoluteUrl || "").trim();
  if (oid && orderUrl) {
    const orderLink = telegramHtmlLink(
      orderUrl,
      (ctx.orderNumberLabel || "").trim() || oid.slice(0, 12),
    );
    return `${who} упомянул вас в заказе ${orderLink} и в ${cardLink}`;
  }
  return `${who} упомянул вас в ${cardLink}`;
}

/**
 * Строки Telegram HTML: заголовок со ссылками, затем текст комментария.
 * Текст — отдельным элементом массива, чтобы join не терял его.
 */
export function buildKanbanMentionInCommentTelegramHtmlLines(
  ctx: KanbanMentionTelegramContext,
): string[] {
  const head = mentionHeadHtml(ctx);
  const quote = telegramMentionCommentQuote(ctx.commentText ?? "");
  if (!quote) return [head];
  return [head, escapeTelegramHtml(quote)];
}

/**
 * Блок HTML: цитата сразу после ссылок (не только после \\n — так не режется).
 */
export function buildKanbanMentionInCommentTelegramHtmlLine(
  ctx: KanbanMentionTelegramContext,
): string {
  const lines = buildKanbanMentionInCommentTelegramHtmlLines(ctx);
  if (lines.length === 1) return lines[0]!;
  return `${lines[0]}: ${lines[1]}\n\n${lines[1]}`;
}

/** Первая строка заголовка карточки до пробела — обычно номер наряда в зеркале Kaiten. */
export function extractOrderNumberLabelFromKanbanCardTitle(title: string): string {
  const firstLine = title.split(/\n/)[0]?.trim() ?? "";
  const token = firstLine.split(/\s+/)[0]?.trim() ?? "";
  return token;
}
