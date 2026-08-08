import {
  encodeTelegramMiniAppStartParamCard,
  encodeTelegramMiniAppStartParamOrder,
} from "@/lib/telegram-mini-app-start-param";

const DEFAULT_SHORT_NAME = "crm";

function crmHttpsBaseForWebApp(): string | null {
  const raw =
    process.env.CRM_PUBLIC_BASE_URL?.trim() ||
    (process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL.trim().replace(/^https?:\/\//, "")}`
      : "");
  const base = raw.replace(/\/+$/, "");
  if (!/^https:\/\//i.test(base)) return null;
  return base;
}

/** Username бота без @ (env TELEGRAM_BOT_USERNAME или NEXT_PUBLIC_TELEGRAM_BOT_NAME). */
export function telegramBotUsernameForMiniApp(): string | null {
  const raw =
    process.env.TELEGRAM_BOT_USERNAME?.trim() ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME?.trim() ||
    "";
  const name = raw.replace(/^@+/, "").trim();
  return name || null;
}

export function telegramMiniAppShortName(): string {
  const s = process.env.TELEGRAM_MINI_APP_SHORT_NAME?.trim();
  return s || DEFAULT_SHORT_NAME;
}

/**
 * URL для InlineKeyboardButton.web_app (свой HTTPS-домен CRM).
 * Так Telegram не спрашивает Launch на каждый t.me deep link.
 */
export function telegramMiniAppWebAppOpenUrl(startParam: string): string | null {
  const base = crmHttpsBaseForWebApp();
  if (!base) return null;
  const param = String(startParam || "").trim();
  if (!param) return null;
  return `${base}/tg-app?startapp=${encodeURIComponent(param)}`;
}

/**
 * Прямая ссылка t.me (текст / fallback). null — если username не задан.
 */
export function telegramMiniAppDeepLink(startParam: string): string | null {
  const username = telegramBotUsernameForMiniApp();
  if (!username) return null;
  const short = telegramMiniAppShortName();
  const param = encodeURIComponent(startParam);
  return `https://t.me/${username}/${short}?startapp=${param}`;
}

export function telegramMiniAppOrderWebAppUrl(orderId: string): string | null {
  try {
    return telegramMiniAppWebAppOpenUrl(
      encodeTelegramMiniAppStartParamOrder(orderId),
    );
  } catch {
    return null;
  }
}

export function telegramMiniAppCardWebAppUrl(cardId: string): string | null {
  try {
    return telegramMiniAppWebAppOpenUrl(
      encodeTelegramMiniAppStartParamCard(cardId),
    );
  } catch {
    return null;
  }
}

export function telegramMiniAppOrderDeepLink(orderId: string): string | null {
  try {
    return telegramMiniAppDeepLink(encodeTelegramMiniAppStartParamOrder(orderId));
  } catch {
    return null;
  }
}

export function telegramMiniAppCardDeepLink(cardId: string): string | null {
  try {
    return telegramMiniAppDeepLink(encodeTelegramMiniAppStartParamCard(cardId));
  } catch {
    return null;
  }
}
