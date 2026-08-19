/**
 * Маркер кнопки «ПТ» в чате канбана: «ПТ: текст».
 * Канон в колонке нарядов — без префикса, до 100 символов (`listTechMemo`).
 */
import { stripOrderChatTriggerPrefixKeepFullMessage } from "@/lib/kaiten-comment-parse";
import { normalizeOrderListTechMemoInput } from "@/lib/order-list-tech-memo";

const PREFIX = "ПТ:";

export function isOrderChatPtMemoTrigger(raw: string): boolean {
  return stripOrderChatPtMemoPrefix(raw) != null;
}

/**
 * Убирает «ПТ:» только с триггер-строки.
 * Не JS `\b`: кириллица до/после префикса на других строках должна сохраняться.
 */
export function stripOrderChatPtMemoPrefix(raw: string): string | null {
  return stripOrderChatTriggerPrefixKeepFullMessage(raw, PREFIX);
}

export function formatOrderChatPtMemoMessage(body: string): string {
  const t = body.trim();
  if (!t) return "";
  const stripped = stripOrderChatPtMemoPrefix(t);
  return `${PREFIX} ${stripped ?? t}`;
}

/** Текст для колонки «ПТ» в списке нарядов (без маркера, обрезка как у пометки). */
export function techMemoTextFromPtChatBody(raw: string): string | null {
  const body = stripOrderChatPtMemoPrefix(raw) ?? raw.trim();
  return normalizeOrderListTechMemoInput(body);
}
