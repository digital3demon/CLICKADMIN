import "server-only";
import { telegramBotApiUrl } from "@/lib/telegram-api-base";
import { telegramPeerIdToString } from "@/lib/telegram-json-ids";

let cachedBotUserIdStr: string | null = null;

/** Числовой id бота из getMe (кэш на процесс) — для сравнения с update. */
export async function getTelegramBotUserIdStr(
  botToken: string,
): Promise<string | null> {
  if (cachedBotUserIdStr != null) return cachedBotUserIdStr;
  try {
    const res = await fetch(telegramBotApiUrl(botToken, "getMe"));
    const j = (await res.json()) as { ok?: boolean; result?: { id?: unknown } };
    if (j.ok !== true || !j.result) return null;
    const s = telegramPeerIdToString(j.result.id);
    if (!s) return null;
    cachedBotUserIdStr = s;
    return s;
  } catch {
    return null;
  }
}

/** Сброс кэша (тесты / смена токена в рантайме не предусмотрены). */
export function __resetTelegramBotIdentityCacheForTests(): void {
  cachedBotUserIdStr = null;
}
