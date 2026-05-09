import { telegramSendMessage } from "@/lib/telegram-send-message";

const HTML_TEMPLATE =
  `ID этой группы для CRM:\n\n` +
  `<code>{{CHAT_ID}}</code>\n\n` +
  `Скопируйте число и вставьте в карточку врача в CRM (раздел «Группы Telegram»).`;

export async function replyTelegramGroupChatIdForCrm(
  botToken: string,
  chatIdStr: string,
): Promise<boolean> {
  const text = HTML_TEMPLATE.replace("{{CHAT_ID}}", chatIdStr);
  const r = await telegramSendMessage(botToken, chatIdStr, text, {
    parseMode: "HTML",
  });
  return r.ok;
}
