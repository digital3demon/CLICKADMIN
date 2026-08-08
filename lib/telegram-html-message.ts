/** Лимит Telegram Bot API на длину text. */
export const TELEGRAM_MESSAGE_MAX_LEN = 4096;

/** Разделитель между записями в списках бота. */
export const TELEGRAM_LIST_ITEM_SEPARATOR = "____________________________";

export type TelegramHtmlListItem = {
  url: string;
  label: string;
  /** Строка под ссылкой (например актуальный статус / колонка). */
  detail?: string | null;
};

export function telegramEscapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function telegramEscapeHtmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** Обрезка HTML без обрыва посередине `<a …>`. */
export function truncateTelegramHtmlMessage(text: string, maxLen = TELEGRAM_MESSAGE_MAX_LEN): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  let cut = t.slice(0, maxLen);
  const lastClose = cut.lastIndexOf("</a>");
  if (lastClose > maxLen * 0.5) {
    cut = cut.slice(0, lastClose + 4);
  } else {
    const lastNl = cut.lastIndexOf("\n");
    if (lastNl > maxLen * 0.5) cut = cut.slice(0, lastNl);
  }
  return cut.trimEnd();
}

function formatTelegramListItemBlock(item: TelegramHtmlListItem): string | null {
  const url = item.url.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  const link = `<a href="${telegramEscapeHtmlAttr(url)}">${telegramEscapeHtmlText(item.label)}</a>`;
  const detail = String(item.detail ?? "").trim();
  if (!detail) return link;
  return `${link}\n${telegramEscapeHtmlText(detail)}`;
}

/**
 * Заголовок + список HTML-ссылок с учётом лимита Telegram.
 * Между записями — разделитель; под ссылкой опционально статус (`detail`).
 */
export function formatTelegramHtmlLinkList(
  items: TelegramHtmlListItem[],
  emptyRu: string,
  header: string,
  maxLen = TELEGRAM_MESSAGE_MAX_LEN,
): string {
  const headerBlock = `<b>${telegramEscapeHtmlText(header)}</b>`;
  if (items.length === 0) {
    return `${headerBlock}\n${telegramEscapeHtmlText(emptyRu)}`;
  }

  const blocks: string[] = [];
  for (const x of items) {
    const block = formatTelegramListItemBlock(x);
    if (block) blocks.push(block);
  }
  if (blocks.length === 0) {
    return `${headerBlock}\n${telegramEscapeHtmlText(emptyRu)}`;
  }

  const lines: string[] = [headerBlock];
  let included = 0;
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!;
    const chunk =
      included === 0
        ? `\n${block}`
        : `\n${TELEGRAM_LIST_ITEM_SEPARATOR}\n${block}`;
    const remaining = blocks.length - included - 1;
    const footer = remaining > 0 ? `\n… ещё ${remaining}` : "";
    const candidate = lines.join("") + chunk + footer;
    if (candidate.length > maxLen - 8) break;
    lines.push(chunk);
    included += 1;
  }

  const skipped = blocks.length - included;
  if (included === 0) {
    return `${headerBlock}\n${telegramEscapeHtmlText(emptyRu)}`;
  }
  const extra = skipped > 0 ? `\n… ещё ${skipped}` : "";
  return truncateTelegramHtmlMessage(lines.join("") + extra, maxLen);
}
