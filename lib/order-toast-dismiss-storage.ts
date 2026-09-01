/**
 * Persist toast dismiss / collapse: sync localStorage + async client-state API.
 * localStorage — чтобы скрытие не «отлипало» при смене страницы до ответа API.
 */

export const ORDER_TOAST_DISMISSED_KEY = "orderToastDismissedV1";
export const ORDER_TOAST_COLLAPSED_KEY = "orderToastStackCollapsedV1";

const LS_DISMISSED = "crm.orderToastDismissedV1";
const LS_COLLAPSED = "crm.orderToastStackCollapsedV1";

/** Потолок ключей «скрыто» — иначе localStorage и Set в RAM растут без bound. */
export const ORDER_TOAST_DISMISSED_MAX = 500;

export function capDismissedIds(ids: readonly string[]): string[] {
  if (ids.length <= ORDER_TOAST_DISMISSED_MAX) return [...ids];
  return ids.slice(-ORDER_TOAST_DISMISSED_MAX);
}

export type OrderToastDismissKind =
  | "chat"
  | "correction"
  | "prosthetics"
  | "personal";

export function orderToastDismissKey(
  kind: OrderToastDismissKind,
  id: string,
): string {
  return `${kind}:${id}`;
}

export function parseDismissedIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}

export function readDismissedFromLocalStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_DISMISSED);
    if (!raw) return [];
    return parseDismissedIdList(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function writeDismissedToLocalStorage(ids: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LS_DISMISSED,
      JSON.stringify(capDismissedIds(ids)),
    );
  } catch {
    /* quota / private mode */
  }
}

export function readCollapsedFromLocalStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LS_COLLAPSED) === "1";
  } catch {
    return false;
  }
}

export function writeCollapsedToLocalStorage(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (collapsed) window.localStorage.setItem(LS_COLLAPSED, "1");
    else window.localStorage.removeItem(LS_COLLAPSED);
  } catch {
    /* ignore */
  }
}

/** Ключи для «Скрыть все» по текущим спискам тостов. */
export function collectToastDismissKeys(input: {
  chat: ReadonlyArray<{ id: string }>;
  corrections: ReadonlyArray<{ id: string }>;
  prosthetics: ReadonlyArray<{ id: string }>;
  personal: ReadonlyArray<{ id: string }>;
}): string[] {
  const out: string[] = [];
  for (const r of input.chat) out.push(orderToastDismissKey("chat", r.id));
  for (const r of input.corrections)
    out.push(orderToastDismissKey("correction", r.id));
  for (const r of input.prosthetics)
    out.push(orderToastDismissKey("prosthetics", r.id));
  for (const r of input.personal)
    out.push(orderToastDismissKey("personal", r.id));
  return out;
}

/** Есть ли среди nextKeys ключ, которого не было в prev и который не dismissed. */
export function shouldExpandToastStack(input: {
  nextKeys: ReadonlySet<string>;
  prevKeys: ReadonlySet<string>;
  dismissed: ReadonlySet<string>;
}): boolean {
  for (const key of input.nextKeys) {
    if (input.prevKeys.has(key)) continue;
    if (input.dismissed.has(key)) continue;
    return true;
  }
  return false;
}
