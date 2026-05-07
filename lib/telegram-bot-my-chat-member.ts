import "server-only";
import { telegramSendMessage } from "@/lib/telegram-send-message";

let cachedBotTelegramUserId: number | null = null;

async function getTelegramBotUserId(botToken: string): Promise<number | null> {
  if (cachedBotTelegramUserId != null) return cachedBotTelegramUserId;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/getMe`,
    );
    const j = (await res.json()) as { result?: { id?: number } };
    const id = j.result?.id;
    if (typeof id === "number" && Number.isFinite(id)) {
      cachedBotTelegramUserId = Math.trunc(id);
      return cachedBotTelegramUserId;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  return null;
}

/**
 * Когда бота добавили в группу — одно сообщение с chat id для ручного ввода в CRM.
 * Не дублируем при смене прав (member → administrator): только вход из «вне» (left/kicked).
 */
export async function tryTelegramBotAddedChatIdAnnounce(
  update: Record<string, unknown>,
  botToken: string,
): Promise<void> {
  const mcm = update.my_chat_member;
  if (!mcm || typeof mcm !== "object") return;

  const o = mcm as Record<string, unknown>;
  const chat = o.chat as Record<string, unknown> | undefined;
  const newMember = o.new_chat_member as Record<string, unknown> | undefined;
  const oldMember = o.old_chat_member as Record<string, unknown> | undefined;
  if (!chat || !newMember) return;

  const chatType = typeof chat.type === "string" ? chat.type : "";
  if (chatType !== "group" && chatType !== "supergroup") return;

  const newUser = newMember.user as Record<string, unknown> | undefined;
  if (!newUser || newUser.is_bot !== true) return;

  const botId = await getTelegramBotUserId(botToken);
  if (botId == null) return;

  const newUid = asNum(newUser.id);
  if (newUid !== botId) return;

  const newStatus =
    typeof newMember.status === "string" ? newMember.status : "";
  if (
    newStatus !== "member" &&
    newStatus !== "administrator" &&
    newStatus !== "creator"
  ) {
    return;
  }

  const oldUser = oldMember?.user as Record<string, unknown> | undefined;
  const oldUid = oldUser ? asNum(oldUser.id) : null;
  const oldStatus =
    oldMember && typeof oldMember.status === "string"
      ? oldMember.status
      : "";

  if (oldUid === botId && oldStatus && oldStatus !== "left" && oldStatus !== "kicked") {
    return;
  }

  const chatIdRaw = chat.id;
  const chatIdStr =
    typeof chatIdRaw === "number"
      ? String(Math.trunc(chatIdRaw))
      : typeof chatIdRaw === "string" && /^-?\d+$/.test(chatIdRaw.trim())
        ? chatIdRaw.trim()
        : null;
  if (!chatIdStr) return;

  const text =
    `ID этой группы для CRM:\n\n` +
    `<code>${chatIdStr}</code>\n\n` +
    `Скопируйте число и вставьте в карточку врача в CRM (раздел «Группы Telegram»).`;

  const r = await telegramSendMessage(botToken, chatIdStr, text, {
    parseMode: "HTML",
  });
  if (!r.ok) {
    console.warn("[telegram my_chat_member] send chat id failed", r.error);
  }
}
