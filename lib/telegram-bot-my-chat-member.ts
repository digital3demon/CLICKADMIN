import "server-only";
import { getTelegramBotUserIdStr } from "@/lib/telegram-bot-identity";
import { telegramPeerIdToString } from "@/lib/telegram-json-ids";
import { replyTelegramGroupChatIdForCrm } from "@/lib/telegram-group-chat-id-reply";

/**
 * Когда бота добавили в группу — сообщение с chat id для ручного ввода в CRM.
 * Не дублируем при смене прав (member → administrator), только вход из «вне».
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

  const botIdStr = await getTelegramBotUserIdStr(botToken);
  if (!botIdStr) return;

  const newUidStr = telegramPeerIdToString(newUser.id);
  if (!newUidStr || newUidStr !== botIdStr) return;

  const newStatus =
    typeof newMember.status === "string" ? newMember.status : "";
  if (
    newStatus !== "member" &&
    newStatus !== "administrator" &&
    newStatus !== "creator"
  ) {
    return;
  }

  const oldUidStr = oldMember
    ? telegramPeerIdToString(
        (oldMember.user as Record<string, unknown> | undefined)?.id,
      )
    : null;
  const oldStatus =
    oldMember && typeof oldMember.status === "string"
      ? oldMember.status
      : "";

  if (
    oldUidStr === botIdStr &&
    oldStatus &&
    oldStatus !== "left" &&
    oldStatus !== "kicked"
  ) {
    return;
  }

  const chatIdStr = telegramPeerIdToString(chat.id);
  if (!chatIdStr) return;

  const ok = await replyTelegramGroupChatIdForCrm(botToken, chatIdStr);
  if (!ok) {
    console.warn("[telegram my_chat_member] send chat id failed");
  }
}
