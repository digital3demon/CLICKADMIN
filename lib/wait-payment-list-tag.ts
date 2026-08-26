/**
 * Отметка списка «ждем оплату».
 * Хвост до 20 символов без «:» (запрещён в custom tags).
 * Сравнение без \b — кириллица не считается word-char.
 */

export const WAIT_PAYMENT_TAG_BASE = "ждем оплату";
export const WAIT_PAYMENT_PILL_LABEL = "ЖДЕМ ОПЛАТУ";
export const WAIT_PAYMENT_NOTE_MAX = 20;
/** Служебный тег: блок ставили вместе с «ждем оплату» (не показываем в облаке). */
export const WAIT_PAYMENT_LINKED_BLOCK_SENTINEL = "wp-linked-block";

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
  const raw = String(label ?? "").trim();
  if (raw === WAIT_PAYMENT_LINKED_BLOCK_SENTINEL) return false;
  return matchingBase(normLabel(raw)) != null;
}

export function isWaitPaymentLinkedBlockSentinel(label: string): boolean {
  return String(label ?? "").trim() === WAIT_PAYMENT_LINKED_BLOCK_SENTINEL;
}

export function waitPaymentLabelOrClauses(): Array<
  { label: string } | { label: { startsWith: string } }
> {
  return [
    { label: WAIT_PAYMENT_TAG_BASE },
    { label: { startsWith: `${WAIT_PAYMENT_TAG_BASE} ` } },
    { label: "ждём оплату" },
    { label: { startsWith: "ждём оплату " } },
  ];
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

export function formatWaitPaymentPillLabel(label: string): string {
  const note = waitPaymentNoteFromLabel(label);
  return note ? `${WAIT_PAYMENT_PILL_LABEL} ${note}` : WAIT_PAYMENT_PILL_LABEL;
}

/** Все варианты «ждем оплату» + хвост (SQLite, без mode:insensitive). */
export function waitPaymentListTagWhere(): {
  listCustomTags: {
    some: {
      OR: Array<{ label: string } | { label: { startsWith: string } }>;
    };
  };
} {
  return {
    listCustomTags: {
      some: {
        OR: waitPaymentLabelOrClauses(),
      },
    },
  };
}
