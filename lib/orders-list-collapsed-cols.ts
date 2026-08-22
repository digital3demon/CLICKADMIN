/**
 * Свёрнутые столбцы списка нарядов.
 * scope=user в client-state + localStorage, чтобы не ждать API.
 */

export const ORDERS_LIST_COLLAPSED_COLS_KEY = "ordersListCollapsedColsV1";
export const ORDERS_LIST_COLLAPSED_COLS_LS = "crm.ordersListCollapsedColsV1";

export const ORDERS_LIST_COL_IDS = [
  "chat",
  "print",
  "status",
  "type",
  "number",
  "patient",
  "doctor",
  "clinic",
  "address",
  "admission",
  "lab",
  "appointment",
  "memoAdmin",
  "memoTech",
  "shipped",
  "tags",
] as const;

export type OrdersListColId = (typeof ORDERS_LIST_COL_IDS)[number];

const COL_SET = new Set<string>(ORDERS_LIST_COL_IDS);

export const ORDERS_LIST_COL_LABELS: Record<OrdersListColId, string> = {
  chat: "Чат",
  print: "Печать",
  status: "Статус",
  type: "Тип",
  number: "№ наряда",
  patient: "Пациент",
  doctor: "Врач",
  clinic: "Клиника",
  address: "Адрес",
  admission: "Поступление",
  lab: "ЛАБ",
  appointment: "Запись",
  memoAdmin: "ПА",
  memoTech: "ПТ",
  shipped: "Отправка",
  tags: "Отметки",
};

export function isOrdersListColId(v: string): v is OrdersListColId {
  return COL_SET.has(v);
}

export function parseCollapsedColIds(raw: unknown): OrdersListColId[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { collapsed?: unknown }).collapsed)
      ? (raw as { collapsed: unknown[] }).collapsed
      : [];
  const out: OrdersListColId[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (typeof item !== "string" || !isOrdersListColId(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    out.push(item);
  }
  return out;
}

export function toggleCollapsedColId(
  current: readonly OrdersListColId[],
  id: OrdersListColId,
): OrdersListColId[] {
  return current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
}

export function collapsedColsAttr(ids: readonly OrdersListColId[]): string {
  return ids.join(" ");
}

export function readCollapsedColsFromLocalStorage(): OrdersListColId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_LIST_COLLAPSED_COLS_LS);
    if (!raw) return [];
    return parseCollapsedColIds(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function writeCollapsedColsToLocalStorage(
  ids: readonly OrdersListColId[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ORDERS_LIST_COLLAPSED_COLS_LS,
      JSON.stringify({ v: 1, collapsed: [...ids] }),
    );
  } catch {
    /* quota / private */
  }
}

export function collapsedColsPayload(ids: readonly OrdersListColId[]): {
  v: 1;
  collapsed: OrdersListColId[];
} {
  return { v: 1, collapsed: [...ids] };
}
