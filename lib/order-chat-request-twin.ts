/**
 * Близнец = одно сообщение (inbox+legacy или CRM+Kaiten того же комментария).
 * Тот же текст спустя несколько секунд — новая заявка, не дубль.
 * Случайный дубль: повтор того же клика в пределах окна.
 */

/** Повтор кнопки / тот же persist (inbox+legacy). */
export const CHAT_REQUEST_TEXT_TWIN_MAX_GAP_MS = 2000;

/** Дедуп комментария канбана для кнопок «!!!» / «???» (не 120 с обычного чата). */
export const KANBAN_TRIGGER_COMMENT_DEDUP_MS = 1500;

export function chatRequestCreatedAtMs(value: Date | string | number | null | undefined): number {
  if (value == null) return 0;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : 0;
  }
  const t = typeof value === "number" ? value : Date.parse(String(value));
  return Number.isFinite(t) ? t : 0;
}

export function areChatRequestCreatedTwins(
  a: Date | string | number | null | undefined,
  b: Date | string | number | null | undefined,
  gapMs: number = CHAT_REQUEST_TEXT_TWIN_MAX_GAP_MS,
): boolean {
  const am = chatRequestCreatedAtMs(a);
  const bm = chatRequestCreatedAtMs(b);
  if (!am || !bm) return false;
  return Math.abs(am - bm) <= gapMs;
}

/** Карточка: CRM+Kaiten одного комментария схлопываем даже если Kaiten пришёл позже. */
export function arePendingChatRequestDisplayTwins(opts: {
  sameText: boolean;
  createdAtA: Date | string | number | null | undefined;
  createdAtB: Date | string | number | null | undefined;
  sourceA?: string | null;
  sourceB?: string | null;
}): boolean {
  if (!opts.sameText) return false;
  if (areChatRequestCreatedTwins(opts.createdAtA, opts.createdAtB)) return true;
  const a = String(opts.sourceA || "").trim();
  const b = String(opts.sourceB || "").trim();
  return Boolean(a && b && a !== b);
}
