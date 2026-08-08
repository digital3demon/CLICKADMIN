/** Лимит Telegram Bot API на длину text. */
export const TELEGRAM_MESSAGE_MAX_LEN = 4096;

/** Разделитель между записями (legacy / тесты совместимости). */
export const TELEGRAM_LIST_ITEM_SEPARATOR = "____________________________";

/** Лимит текста кнопки inline keyboard. */
export const TELEGRAM_INLINE_BUTTON_TEXT_MAX = 64;

/** Сколько web_app-кнопок кладём под список (лимит Telegram ~100). */
export const TELEGRAM_LIST_WEBAPP_BUTTONS_MAX = 40;

export type TelegramHtmlListItem = {
  /** Fallback URL (браузер), если нет web_app. */
  url: string;
  label: string;
  /** Строка статуса (например «Статус: Производство»). */
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

/** Статус для второй строки кнопки (без префикса «Статус:»). */
export function telegramListStatusForButton(detail: string | null | undefined): string {
  const raw = String(detail ?? "").trim();
  if (!raw) return "";
  // Явный префикс «Статус:» (после цифр/кириллицы \b ненадёжен).
  const m = raw.match(/^Статус:\s*(.+)$/u);
  return (m?.[1] ?? raw).trim();
}

/**
 * Текст кнопки: название на первой строке, статус на второй (лимит 64 символа Telegram).
 */
export function formatTelegramListButtonText(
  label: string,
  detail?: string | null,
  maxLen = TELEGRAM_INLINE_BUTTON_TEXT_MAX,
): string {
  const title = String(label || "")
    .replace(/\s+/g, " ")
    .trim() || "Открыть";
  const status = telegramListStatusForButton(detail);
  if (!status) return truncateTelegramButtonText(title, maxLen);

  // «title\nstatus» — перевод строки тоже входит в лимит 64.
  const sep = "\n";
  const statusBudget = Math.min(status.length, Math.max(8, Math.floor(maxLen / 3)));
  let statusLine = status.length <= statusBudget ? status : `${status.slice(0, statusBudget - 1)}…`;
  const titleMax = maxLen - sep.length - statusLine.length;
  if (titleMax < 8) {
    statusLine = truncateTelegramButtonText(status, Math.max(4, maxLen - 9));
    const tMax = maxLen - sep.length - statusLine.length;
    return `${truncateTelegramButtonText(title, Math.max(1, tMax))}${sep}${statusLine}`;
  }
  return `${truncateTelegramButtonText(title, titleMax)}${sep}${statusLine}`;
}

/**
 * Только заголовок в тексте + inline web_app-кнопки (название + статус).
 * Текстовый список записей не выводим — всё в кнопках.
 */
export function formatTelegramBotWebAppList(
  items: TelegramHtmlListItem[],
  emptyRu: string,
  header: string,
): TelegramBotListReply {
  const headerBlock = `<b>${telegramEscapeHtmlText(header)}</b>`;
  if (items.length === 0) {
    return {
      parseMode: "HTML",
      text: `${headerBlock}\n${telegramEscapeHtmlText(emptyRu)}`,
    };
  }

  const buttonRows: Array<
    Array<
      | { text: string; web_app: { url: string } }
      | { text: string; url: string }
    >
  > = [];

  for (let i = 0; i < items.length; i += 1) {
    if (buttonRows.length >= TELEGRAM_LIST_WEBAPP_BUTTONS_MAX) break;
    const item = items[i]!;
    const webApp = String(item.webAppUrl ?? "").trim();
    const fallbackUrl = String(item.url ?? "").trim();
    const btnText = formatTelegramListButtonText(item.label, item.detail);
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
    buttonRows.push([button]);
  }

  if (buttonRows.length === 0) {
    return {
      parseMode: "HTML",
      text: `${headerBlock}\n${telegramEscapeHtmlText(emptyRu)}`,
    };
  }

  const skipped = items.length - buttonRows.length;
  const extra =
    skipped > 0 ? `\n${telegramEscapeHtmlText(`… ещё ${skipped}`)}` : "";

  return {
    parseMode: "HTML",
    text: `${headerBlock}${extra}`,
    replyMarkup: { inline_keyboard: buttonRows },
  };
}

/**
 * @deprecated Для списков бота используйте formatTelegramBotWebAppList.
 */
export function formatTelegramHtmlLinkList(
  items: TelegramHtmlListItem[],
  emptyRu: string,
  header: string,
): string {
  return formatTelegramBotWebAppList(items, emptyRu, header).text;
}
