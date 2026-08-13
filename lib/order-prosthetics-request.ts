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

/**
 * Текст заявки для UI: без маркера «???» (в т.ч. если в БД остался префикс или отдельная строка).
 */
export function formatProstheticsRequestTextForDisplay(raw: string): string {
  const stripped = stripOrderProstheticsRequestPrefix(raw);
  const base = (stripped ?? raw).replace(/\uFEFF/g, "");
  return base
    .split("\n")
    .map((line) => line.replace(/^\s*\?{3}\s*/u, "").trimEnd())
    .join("\n")
    .replace(/^\s*\n+/, "")
    .trim();
}

/** Ключ близнеца Канбан↔Kaiten: без учёта переносов/пробелов. */
export function normalizeProstheticsTwinKey(raw: string): string {
  return String(raw || "")
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
