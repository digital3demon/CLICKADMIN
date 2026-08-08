/**
 * Отправка сообщения в Telegram (Bot API). Сервер-only.
 */

import { telegramBotApiUrl } from "@/lib/telegram-api-base";
import {
  TELEGRAM_MESSAGE_MAX_LEN,
  truncateTelegramHtmlMessage,
} from "@/lib/telegram-html-message";

export type TelegramSendResult =
  | { ok: true; sentMessageId?: string }
  | { ok: false; error: string };

function normalizeTelegramNetworkError(e: unknown): string {
  const msg =
    e instanceof Error ? e.message.trim().toLowerCase() : String(e ?? "").trim().toLowerCase();
  if (!msg || msg === "fetch failed") {
    return "Сеть до Telegram Bot API недоступна";
  }
  return e instanceof Error ? e.message : "Сеть";
}

async function sendMessageRequest(
  botToken: string,
  body: Record<string, unknown>,
): Promise<TelegramSendResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(telegramBotApiUrl(botToken, "sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    };
    if (!res.ok || j.ok !== true) {
      return {
        ok: false,
        error: j.description?.trim() || `HTTP ${res.status}`,
      };
    }
    const mid = j.result?.message_id;
    return {
      ok: true,
      sentMessageId:
        mid != null && Number.isFinite(mid) ? String(Math.trunc(mid)) : undefined,
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, error: "Таймаут запроса к Telegram API" };
    }
    return { ok: false, error: normalizeTelegramNetworkError(e) };
  } finally {
    clearTimeout(timer);
  }
}

export async function telegramSendMessage(
  botToken: string,
  chatId: string,
  text: string,
  opts?: {
    parseMode?: "HTML";
    /** Напр. ReplyKeyboardMarkup или `{ remove_keyboard: true }` */
    replyMarkup?: Record<string, unknown>;
    /** Ответ на сообщение в группе / чате */
    replyToMessageId?: number;
  },
): Promise<TelegramSendResult> {
  const t = text.trim();
  if (!t) return { ok: false, error: "Пустой текст" };
  const bodyText =
    opts?.parseMode === "HTML"
      ? truncateTelegramHtmlMessage(t, TELEGRAM_MESSAGE_MAX_LEN)
      : t.slice(0, TELEGRAM_MESSAGE_MAX_LEN);
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: bodyText,
    disable_web_page_preview: true,
  };
  if (
    opts?.replyToMessageId != null &&
    Number.isFinite(opts.replyToMessageId)
  ) {
    body.reply_to_message_id = Math.trunc(opts.replyToMessageId);
  }
  if (opts?.parseMode === "HTML") {
    body.parse_mode = "HTML";
  }
  if (opts?.replyMarkup && Object.keys(opts.replyMarkup).length > 0) {
    body.reply_markup = opts.replyMarkup;
  }

  let sent = await sendMessageRequest(botToken, body);
  if (!sent.ok && body.reply_to_message_id != null) {
    const err = sent.error.toLowerCase();
    if (err.includes("reply message not found") || err.includes("message to reply not found")) {
      const retryBody = { ...body };
      delete retryBody.reply_to_message_id;
      sent = await sendMessageRequest(botToken, retryBody);
    }
  }
  if (
    !sent.ok &&
    (sent.error === "Сеть до Telegram Bot API недоступна" ||
      sent.error === "Сеть до api.telegram.org недоступна")
  ) {
    sent = await sendMessageRequest(botToken, body);
  }
  return sent;
}
