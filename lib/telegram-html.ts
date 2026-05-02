/**
 * Telegram Bot API (HTML): экранирование текста и безопасная ссылка.
 * @see https://core.telegram.org/bots/api#html-style
 */

export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Гиперссылка: URL и подпись экранируются. */
export function telegramHtmlLink(absoluteUrl: string, linkText: string): string {
  const href = absoluteUrl.trim();
  const label = (linkText || "").trim() || "—";
  return `<a href="${escapeTelegramHtml(href)}">${escapeTelegramHtml(label)}</a>`;
}
