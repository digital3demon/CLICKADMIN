/**
 * Отправка сообщения в Telegram (Bot API). Сервер-only.
 */

export type TelegramSendResult =
  | { ok: true }
  | { ok: false; error: string };

export async function telegramSendMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<TelegramSendResult> {
  const t = text.trim();
  if (!t) return { ok: false, error: "Пустой текст" };
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: t.slice(0, 4096),
          disable_web_page_preview: true,
        }),
      },
    );
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
    };
    if (!res.ok || j.ok !== true) {
      return {
        ok: false,
        error: j.description?.trim() || `HTTP ${res.status}`,
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Сеть",
    };
  }
}
