/**
 * База Bot API: по умолчанию https://api.telegram.org.
 * При блокировке исходящего с хостинга в РФ — HTTPS-прокси за рубежом:
 * TELEGRAM_API_BASE=https://bot.click-lab.online (без хвоста / и без /bot…).
 */

const DEFAULT_TELEGRAM_API_BASE = "https://api.telegram.org";

export function telegramApiBaseUrl(): string {
  const raw = process.env.TELEGRAM_API_BASE?.trim();
  if (!raw) return DEFAULT_TELEGRAM_API_BASE;
  return raw.replace(/\/+$/, "");
}

/** Хост из TELEGRAM_API_BASE (для DNS-проб в диагностике). */
export function telegramApiHost(): string {
  try {
    return new URL(telegramApiBaseUrl()).hostname;
  } catch {
    return "api.telegram.org";
  }
}

export function telegramBotApiUrl(botToken: string, method: string): string {
  const m = method.replace(/^\/+/, "");
  return `${telegramApiBaseUrl()}/bot${encodeURIComponent(botToken)}/${m}`;
}
