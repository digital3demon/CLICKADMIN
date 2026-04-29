/** Курсор для списка заказов: сортировка createdAt desc, id desc (стабильный порядок). */
export type OrdersListCursorPayload = { c: string; i: string };

export const ORDERS_LIST_PAGE_SIZE_MIN = 1;
export const ORDERS_LIST_PAGE_SIZE_MAX = 200;
/** Размер страницы, если в URL нет `limit` и в профиле не задано своё значение. */
export const ORDERS_LIST_DEFAULT_PAGE_SIZE = 30;

export function clampOrdersPageSize(raw: string | null): number {
  const n =
    raw == null || raw === "" ? ORDERS_LIST_DEFAULT_PAGE_SIZE : Number(raw);
  if (!Number.isFinite(n)) return ORDERS_LIST_DEFAULT_PAGE_SIZE;
  return Math.min(
    ORDERS_LIST_PAGE_SIZE_MAX,
    Math.max(ORDERS_LIST_PAGE_SIZE_MIN, Math.floor(n)),
  );
}

/**
 * Размер страницы списка заказов: приоритет у `limit` в URL, иначе сохранённое в профиле, иначе дефолт.
 */
export function resolveOrdersPageSize(
  urlLimitRaw: string | null | undefined,
  userStored: number | null | undefined,
): number {
  const u = String(urlLimitRaw ?? "").trim();
  if (u !== "") {
    return clampOrdersPageSize(u);
  }
  if (userStored != null && Number.isFinite(userStored)) {
    return clampOrdersPageSize(String(Math.trunc(userStored)));
  }
  return clampOrdersPageSize(null);
}

export function encodeOrdersListCursor(createdAt: Date, id: string): string {
  const payload: OrdersListCursorPayload = {
    c: createdAt.toISOString(),
    i: id,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeOrdersListCursor(
  raw: string | null | undefined,
): OrdersListCursorPayload | null {
  if (raw == null || !String(raw).trim()) return null;
  try {
    const json = Buffer.from(String(raw).trim(), "base64url").toString("utf8");
    const v = JSON.parse(json) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const c = o.c;
    const i = o.i;
    if (typeof c !== "string" || typeof i !== "string" || !i.trim()) return null;
    const d = new Date(c);
    if (Number.isNaN(d.getTime())) return null;
    return { c, i: i.trim() };
  } catch {
    return null;
  }
}
