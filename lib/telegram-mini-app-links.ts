import {
  encodeTelegramMiniAppStartParamCard,
  encodeTelegramMiniAppStartParamOrder,
} from "@/lib/telegram-mini-app-start-param";

const DEFAULT_SHORT_NAME = "crm";

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
 * Прямая ссылка Mini App. null — если username не задан (списки падают обратно на https CRM).
 */
export function telegramMiniAppDeepLink(startParam: string): string | null {
  const username = telegramBotUsernameForMiniApp();
  if (!username) return null;
  const short = telegramMiniAppShortName();
  const param = encodeURIComponent(startParam);
  return `https://t.me/${username}/${short}?startapp=${param}`;
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
