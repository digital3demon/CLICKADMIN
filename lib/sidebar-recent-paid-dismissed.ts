/** Ключ в `UserClientState` для скрытых строк блока «Оплаты» (только админы). */
export const SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY = "sidebarRecentPaidDismissed";

const MAX_KEYS = 400;

export function sidebarRecentPaidDismissEntryKey(
  orderId: string,
  changedAtIso: string,
): string {
  return `${orderId}\t${changedAtIso}`;
}

type Stored = { v?: number; keys?: unknown };

export function sidebarRecentPaidDismissedKeySet(value: unknown): Set<string> {
  const out = new Set<string>();
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  const keys = (value as Stored).keys;
  if (!Array.isArray(keys)) return out;
  for (const k of keys) {
    if (typeof k === "string" && k.length > 0 && k.length < 500) out.add(k);
  }
  return out;
}

export function sidebarRecentPaidDismissedKeysArray(value: unknown): string[] {
  return [...sidebarRecentPaidDismissedKeySet(value)];
}

export function mergeSidebarRecentPaidDismissedKeys(
  prevKeys: readonly string[],
  add: string,
): { v: 1; keys: string[] } {
  if (prevKeys.includes(add)) {
    return { v: 1, keys: [...prevKeys] };
  }
  const next = [...prevKeys, add];
  if (next.length <= MAX_KEYS) return { v: 1, keys: next };
  return { v: 1, keys: next.slice(next.length - MAX_KEYS) };
}
