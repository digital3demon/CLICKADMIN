/** Лимит Telegram Bot API на длину text. */
export const TELEGRAM_MESSAGE_MAX_LEN = 4096;

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

/**
 * Заголовок + список HTML-ссылок с учётом лимита Telegram.
 * Пропускает url без http(s).
 */
export function formatTelegramHtmlLinkList(
  items: { url: string; label: string }[],
  emptyRu: string,
  header: string,
  maxLen = TELEGRAM_MESSAGE_MAX_LEN,
): string {
  const headerBlock = `<b>${telegramEscapeHtmlText(header)}</b>`;
  if (items.length === 0) {
    return `${headerBlock}\n${telegramEscapeHtmlText(emptyRu)}`;
  }

  const lines: string[] = [headerBlock];
  let included = 0;
  for (const x of items) {
    const url = x.url.trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const line = `<a href="${telegramEscapeHtmlAttr(url)}">${telegramEscapeHtmlText(x.label)}</a>`;
    const withLine = [...lines, line].join("\n");
    const remaining = items.length - included - 1;
    const footer = remaining > 0 ? `\n… ещё ${remaining}` : "";
    if (withLine.length + footer.length > maxLen - 8) break;
    lines.push(line);
    included += 1;
  }

  const skipped = items.length - included;
  if (included === 0) {
    return `${headerBlock}\n${telegramEscapeHtmlText(emptyRu)}`;
  }
  const extra = skipped > 0 ? `\n… ещё ${skipped}` : "";
  return truncateTelegramHtmlMessage(lines.join("\n") + extra, maxLen);
}
