/**
 * Отправка сообщения в Telegram (Bot API). Сервер-only.
 */

export type TelegramSendResult =
  | { ok: true; sentMessageId?: string }
  | { ok: false; error: string };

function normalizeTelegramNetworkError(e: unknown): string {
  const msg =
    e instanceof Error ? e.message.trim().toLowerCase() : String(e ?? "").trim().toLowerCase();
  if (!msg || msg === "fetch failed") {
    return "Сеть до api.telegram.org недоступна";
  }
  return e instanceof Error ? e.message : "Сеть";
}

async function sendMessageRequest(
  botToken: string,
  body: Record<string, unknown>,
): Promise<TelegramSendResult> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
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
    return { ok: false, error: normalizeTelegramNetworkError(e) };
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
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: t.slice(0, 4096),
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
  if (!sent.ok && sent.error === "Сеть до api.telegram.org недоступна") {
    sent = await sendMessageRequest(botToken, body);
  }
  return sent;
}
