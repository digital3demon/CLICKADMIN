/**
 * Канон текста после кнопки канбана («!!!» / «???» / «ПТ»).
 * Обычный комментарий не превращаем в заявку по набранному префиксу.
 */
import { stripOrderChatCorrectionPrefix } from "@/lib/order-chat-correction";
import { formatOrderChatPtMemoMessage } from "@/lib/order-chat-pt-memo";
import { stripOrderProstheticsRequestPrefix } from "@/lib/order-prosthetics-request";

export type KanbanChatTriggerAction =
  | "comment"
  | "correction"
  | "prosthetics"
  | "pt";

export function canonicalizeKanbanChatTriggerMessage(
  action: KanbanChatTriggerAction,
  text: string,
): string {
  const t = String(text || "").trim();
  if (!t) return "";
  if (action === "pt") return formatOrderChatPtMemoMessage(t);
  if (action === "correction") {
    const body = stripOrderChatCorrectionPrefix(t)?.trim() || t;
    return `!!! ${body}`;
  }
  if (action === "prosthetics") {
    const body = stripOrderProstheticsRequestPrefix(t)?.trim() || t;
    return `??? ${body}`;
  }
  return t;
}
