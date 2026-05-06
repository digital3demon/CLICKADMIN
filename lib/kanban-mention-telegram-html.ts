import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { escapeTelegramHtml, telegramHtmlLink } from "@/lib/telegram-html";

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
};

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
  if (oid && orderUrl) {
    const numRaw = (ctx.orderNumberLabel || "").trim();
    const label = numRaw || oid.slice(0, 12);
    const orderLink = telegramHtmlLink(orderUrl, label);
    return `${who} упомянул вас в заказе ${orderLink} и в ${cardLink}`;
  }

  return `${who} упомянул вас в ${cardLink}`;
}

/** Первая строка заголовка карточки до пробела — обычно номер наряда в зеркале Kaiten. */
export function extractOrderNumberLabelFromKanbanCardTitle(title: string): string {
  const firstLine = title.split(/\n/)[0]?.trim() ?? "";
  const token = firstLine.split(/\s+/)[0]?.trim() ?? "";
  return token;
}
