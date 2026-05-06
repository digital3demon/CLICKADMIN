import type { KanbanTelegramPrefKey } from "@/lib/kanban-telegram-prefs";

/** Ключи уведомлений на общий админский Telegram (расширяем по мере задач). */
export const ADMIN_SHARED_MESSENGER_NOTIFY_KEYS = [
  "tg_mentioned_in_comment",
] as const satisfies readonly KanbanTelegramPrefKey[];

export type AdminSharedMessengerNotifyKey =
  (typeof ADMIN_SHARED_MESSENGER_NOTIFY_KEYS)[number];

export const ADMIN_SHARED_MESSENGER_PREF_LABELS: Record<
  AdminSharedMessengerNotifyKey,
  string
> = {
  tg_mentioned_in_comment: "Упоминания в комментариях (канбан, чат наряда / Kaiten)",
};

export function mergeAdminSharedMessengerNotifyPrefs(
  stored: unknown,
): Record<AdminSharedMessengerNotifyKey, boolean> {
  const base: Record<AdminSharedMessengerNotifyKey, boolean> = {
    tg_mentioned_in_comment: true,
  };
  if (stored == null || typeof stored !== "object" || Array.isArray(stored)) {
    return base;
  }
  const o = stored as Record<string, unknown>;
  for (const k of ADMIN_SHARED_MESSENGER_NOTIFY_KEYS) {
    const v = o[k];
    if (typeof v === "boolean") base[k] = v;
  }
  return base;
}

export function parseAdminSharedMessengerNotifyPrefsPatch(
  raw: unknown,
): Partial<Record<AdminSharedMessengerNotifyKey, boolean>> | null {
  if (raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Partial<Record<AdminSharedMessengerNotifyKey, boolean>> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (
      !(ADMIN_SHARED_MESSENGER_NOTIFY_KEYS as readonly string[]).includes(k)
    ) {
      return null;
    }
    if (typeof v !== "boolean") return null;
    out[k as AdminSharedMessengerNotifyKey] = v;
  }
  return out;
}

function sharedPrefAllowsKey(
  merged: Record<AdminSharedMessengerNotifyKey, boolean>,
  key: KanbanTelegramPrefKey,
): boolean {
  if (
    !(ADMIN_SHARED_MESSENGER_NOTIFY_KEYS as readonly string[]).includes(key)
  ) {
    return false;
  }
  return merged[key as AdminSharedMessengerNotifyKey] === true;
}

/** OR по ключам (как у личных prefs при alternatePrefKeys). */
export function adminSharedMessengerAllowsEvent(
  merged: Record<AdminSharedMessengerNotifyKey, boolean>,
  keys: readonly KanbanTelegramPrefKey[],
): boolean {
  return keys.some((k) => sharedPrefAllowsKey(merged, k));
}
