/** Чистые хелперы привязки писем к наряду (без server-only). */

export const LINK_EMAILS_TO_ORDER_MAX = 20;

export function normalizeLinkEmailIds(
  raw: unknown,
  max = LINK_EMAILS_TO_ORDER_MAX,
): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const v of raw) {
    const id = typeof v === "string" ? v.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (seen.size >= max) break;
  }
  return [...seen];
}
