/** Значение по умолчанию, если в организации не задано или данные некорректны. */
export const DEFAULT_LAB_DUE_HM_SLOTS = ["09:00", "14:00"] as const;

const HM_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function hmToMinutes(hm: string): number | null {
  const m = hm.trim().match(HM_RE);
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const min = parseInt(m[2]!, 10);
  return h * 60 + min;
}

function minutesToHm(total: number): string {
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Нормализация списка слотов из БД / API: уникальные HH:mm по возрастанию, 1–24 слота.
 */
export function normalizeLabDueHmSlots(raw: unknown): string[] {
  if (raw == null) return [...DEFAULT_LAB_DUE_HM_SLOTS];
  if (!Array.isArray(raw)) return [...DEFAULT_LAB_DUE_HM_SLOTS];
  const mins = new Set<number>();
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const n = hmToMinutes(x);
    if (n == null || n < 0 || n > 23 * 60 + 59) continue;
    mins.add(n);
  }
  const sorted = [...mins].sort((a, b) => a - b);
  if (sorted.length < 1) return [...DEFAULT_LAB_DUE_HM_SLOTS];
  return sorted.slice(0, 24).map(minutesToHm);
}

/** Ближайший слот по порогам между соседними временами (как «центр масс» между соседями). */
export function snapTotalMinutesToLabSlot(
  totalMin: number,
  sortedSlotMinutes: readonly number[],
): number {
  const slots = [...sortedSlotMinutes].sort((a, b) => a - b);
  if (slots.length === 0) return Math.min(Math.max(totalMin, 0), 23 * 60 + 59);
  if (slots.length === 1) return slots[0]!;
  if (totalMin < (slots[0]! + slots[1]!) / 2) return slots[0]!;
  for (let i = 1; i < slots.length - 1; i++) {
    const low = (slots[i - 1]! + slots[i]!) / 2;
    const high = (slots[i]! + slots[i + 1]!) / 2;
    if (totalMin >= low && totalMin < high) return slots[i]!;
  }
  return slots[slots.length - 1]!;
}

/** Минуты слотов по возрастанию для расчётов срока лабораторного. */
export function labSlotMinutesSorted(slotsHm?: readonly string[] | null): number[] {
  const hm = normalizeLabDueHmSlots(slotsHm ?? null);
  return hm.map((s) => hmToMinutes(s)!);
}

export function snapLocalTimeToLabHm(
  totalMin: number,
  slotsHm?: readonly string[] | null,
): string {
  const mins = labSlotMinutesSorted(slotsHm);
  const snapped = snapTotalMinutesToLabSlot(totalMin, mins);
  return minutesToHm(snapped);
}
