/**
 * HTML для TG: кто упомянул + ссылки на наряд/карточку + цитата текста комментария.
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
  /** Текст комментария (с @тегами); в TG показываем цитату, если есть слова кроме упоминаний. */
  commentText?: string | null;
};

/**
 * Цитата для TG: схлопывает пробелы, режет длину.
 * Пусто, если в тексте только @токены — заголовок «упомянул вас» уже это говорит.
 * Не `\b`: кириллица не word-char; токен как в kanban-comment-mentions.
 */
export function telegramMentionCommentQuote(
  text: string,
  max = TELEGRAM_MENTION_COMMENT_MAX,
): string | null {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  const withoutMentions = collapsed
    .replace(/@[\p{L}\p{N}._-]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!withoutMentions) return null;
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

/**
 * Одна строка Telegram HTML: «ФИО (@тег) упомянул вас в заказе № … и в карточке …».
 * Ссылка на карточку — Kaiten при известном id и рабочем шаблоне origin, иначе канбан CRM.
 */
export function buildKanbanMentionInCommentTelegramHtmlLine(
  ctx: KanbanMentionTelegramContext,
): string {
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
  const head =
    oid && orderUrl
      ? `${who} упомянул вас в заказе ${telegramHtmlLink(
          orderUrl,
          (ctx.orderNumberLabel || "").trim() || oid.slice(0, 12),
        )} и в ${cardLink}`
      : `${who} упомянул вас в ${cardLink}`;
  const quote = telegramMentionCommentQuote(ctx.commentText ?? "");
  if (!quote) return head;
  return `${head}\n\n«${escapeTelegramHtml(quote)}»`;
}

/** Первая строка заголовка карточки до пробела — обычно номер наряда в зеркале Kaiten. */
export function extractOrderNumberLabelFromKanbanCardTitle(title: string): string {
  const firstLine = title.split(/\n/)[0]?.trim() ?? "";
  const token = firstLine.split(/\s+/)[0]?.trim() ?? "";
  return token;
}
