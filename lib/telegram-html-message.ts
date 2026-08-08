/** Лимит Telegram Bot API на длину text. */
export const TELEGRAM_MESSAGE_MAX_LEN = 4096;

/** Разделитель между записями в списках бота. */
export const TELEGRAM_LIST_ITEM_SEPARATOR = "____________________________";

/** Лимит текста кнопки inline keyboard. */
export const TELEGRAM_INLINE_BUTTON_TEXT_MAX = 64;

/** Сколько web_app-кнопок кладём под список (лимит Telegram ~100). */
export const TELEGRAM_LIST_WEBAPP_BUTTONS_MAX = 40;

export type TelegramHtmlListItem = {
  /** Fallback URL (браузер), если нет web_app. */
  url: string;
  label: string;
  /** Строка под заголовком (например актуальный статус / колонка). */
  detail?: string | null;
  /** HTTPS URL для InlineKeyboardButton.web_app (`/tg-app?startapp=…`). */
  webAppUrl?: string | null;
};

export type TelegramBotListReply = {
  text: string;
  parseMode: "HTML";
  replyMarkup?: {
    inline_keyboard: Array<
      Array<
        | { text: string; web_app: { url: string } }
        | { text: string; url: string }
      >
    >;
  };
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

export function truncateTelegramButtonText(
  label: string,
  maxLen = TELEGRAM_INLINE_BUTTON_TEXT_MAX,
): string {
  const t = String(label || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "Открыть";
  if (t.length <= maxLen) return t;
  if (maxLen <= 1) return "…";
  return `${t.slice(0, Math.max(1, maxLen - 1))}…`;
}

function formatTelegramListItemTextBlock(
  item: TelegramHtmlListItem,
  index: number,
): string {
  const label = telegramEscapeHtmlText(item.label);
  const detail = String(item.detail ?? "").trim();
  const head = `${index}. ${label}`;
  if (!detail) return head;
  return `${head}\n${telegramEscapeHtmlText(detail)}`;
}

/**
 * Заголовок + нумерованный список (без синих ссылок) + inline web_app-кнопки.
 * Кнопки не требуют подтверждения Launch на каждый клик (в отличие от t.me deep link).
 */
export function formatTelegramBotWebAppList(
  items: TelegramHtmlListItem[],
  emptyRu: string,
  header: string,
  maxLen = TELEGRAM_MESSAGE_MAX_LEN,
): TelegramBotListReply {
  const headerBlock = `<b>${telegramEscapeHtmlText(header)}</b>`;
  if (items.length === 0) {
    return {
      parseMode: "HTML",
      text: `${headerBlock}\n${telegramEscapeHtmlText(emptyRu)}`,
    };
  }

  const lines: string[] = [headerBlock];
  let included = 0;
  const buttonRows: Array<
    Array<
      | { text: string; web_app: { url: string } }
      | { text: string; url: string }
    >
  > = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    const block = formatTelegramListItemTextBlock(item, included + 1);
    const chunk =
      included === 0
        ? `\n${block}`
        : `\n${TELEGRAM_LIST_ITEM_SEPARATOR}\n${block}`;
    const remainingAfter = items.length - included - 1;
    const footer = remainingAfter > 0 ? `\n… ещё ${remainingAfter}` : "";
    const candidate = lines.join("") + chunk + footer;
    if (candidate.length > maxLen - 8) break;

    const webApp = String(item.webAppUrl ?? "").trim();
    const fallbackUrl = String(item.url ?? "").trim();
    const btnText = truncateTelegramButtonText(
      `${included + 1}. ${item.label}`,
    );
    let button:
      | { text: string; web_app: { url: string } }
      | { text: string; url: string }
      | null = null;
    if (/^https:\/\//i.test(webApp)) {
      button = { text: btnText, web_app: { url: webApp } };
    } else if (/^https?:\/\//i.test(fallbackUrl)) {
      button = { text: btnText, url: fallbackUrl };
    }
    if (!button) continue;
    if (buttonRows.length >= TELEGRAM_LIST_WEBAPP_BUTTONS_MAX) break;

    lines.push(chunk);
    buttonRows.push([button]);
    included += 1;
  }

  const skipped = items.length - included;
  if (included === 0) {
    return {
      parseMode: "HTML",
      text: `${headerBlock}\n${telegramEscapeHtmlText(emptyRu)}`,
    };
  }
  const extra = skipped > 0 ? `\n… ещё ${skipped}` : "";
  const text = truncateTelegramHtmlMessage(lines.join("") + extra, maxLen);
  return {
    parseMode: "HTML",
    text,
    replyMarkup: { inline_keyboard: buttonRows },
  };
}

/**
 * @deprecated Для списков бота используйте formatTelegramBotWebAppList.
 * Заголовок + список HTML-ссылок с учётом лимита Telegram.
 */
export function formatTelegramHtmlLinkList(
  items: TelegramHtmlListItem[],
  emptyRu: string,
  header: string,
  maxLen = TELEGRAM_MESSAGE_MAX_LEN,
): string {
  return formatTelegramBotWebAppList(items, emptyRu, header, maxLen).text;
}
