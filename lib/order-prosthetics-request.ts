import { stripOrderChatTriggerPrefixKeepFullMessage } from "@/lib/kaiten-comment-parse";

const PREFIX = "???";

/** Есть строка с «???» и непустое тело сообщения после снятия префикса (в т.ч. на следующих строках). */
export function isOrderProstheticsRequestTrigger(raw: string): boolean {
  return stripOrderProstheticsRequestPrefix(raw) != null;
}

/**
 * Убирает «???» только с триггер-строки; остальные строки комментария сохраняются.
 */
export function stripOrderProstheticsRequestPrefix(raw: string): string | null {
  return stripOrderChatTriggerPrefixKeepFullMessage(raw, PREFIX);
}
