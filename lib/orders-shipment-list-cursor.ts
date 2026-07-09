/** Курсор списка отгрузок: сортировка по дате записи ASC, id ASC. */
export type OrdersShipmentCursorPayload = { i: string };

export function encodeOrdersShipmentCursor(id: string): string {
  const payload: OrdersShipmentCursorPayload = { i: id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeOrdersShipmentCursor(
  raw: string | null | undefined,
): OrdersShipmentCursorPayload | null {
  if (raw == null || !String(raw).trim()) return null;
  try {
    const json = Buffer.from(String(raw).trim(), "base64url").toString("utf8");
    const v = JSON.parse(json) as unknown;
    if (!v || typeof v !== "object") return null;
    const i = (v as Record<string, unknown>).i;
    if (typeof i !== "string" || !i.trim()) return null;
    return { i: i.trim() };
  } catch {
    return null;
  }
}
