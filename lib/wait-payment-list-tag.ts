/**
 * Отметка списка «ждем оплату».
 * Хвост до 20 символов без «:» (запрещён в custom tags).
 * Сравнение без \b — кириллица не считается word-char.
 */

export const WAIT_PAYMENT_TAG_BASE = "ждем оплату";
export const WAIT_PAYMENT_NOTE_MAX = 20;

const BASES = [WAIT_PAYMENT_TAG_BASE, "ждём оплату"] as const;

function normLabel(s: string): string {
  return s.trim().toLocaleLowerCase("ru-RU");
}

function matchingBase(normalized: string): string | null {
  for (const base of BASES) {
    const b = normLabel(base);
    if (normalized === b || normalized.startsWith(`${b} `)) return b;
  }
  return null;
}

export function isWaitPaymentListTagLabel(label: string): boolean {
  return matchingBase(normLabel(label)) != null;
}

export function sanitizeWaitPaymentNote(raw: string): string {
  return String(raw ?? "")
    .replace(/[^\p{L}\p{N}\s._-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, WAIT_PAYMENT_NOTE_MAX);
}

export function waitPaymentNoteFromLabel(label: string): string {
  const raw = String(label ?? "").trim();
  const n = normLabel(raw);
  const base = matchingBase(n);
  if (!base) return "";
  if (n === base) return "";
  return sanitizeWaitPaymentNote(raw.slice(base.length));
}

export function buildWaitPaymentListTagLabel(note: string): string {
  const n = sanitizeWaitPaymentNote(note);
  return n ? `${WAIT_PAYMENT_TAG_BASE} ${n}` : WAIT_PAYMENT_TAG_BASE;
}
