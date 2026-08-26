/**
 * Цена реализации позиции склада (₽ / ед.).
 * В сверке клиники это «стоимость работы» по списанной протетике.
 * Если реализации нет — берём fallback (старые списания по закупке).
 */

export function parseInventoryMoneyRub(
  raw: unknown,
): number | null | "invalid" {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return "invalid";
    return raw;
  }
  if (typeof raw !== "string") return "invalid";
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return "invalid";
  return n;
}

/**
 * Коррекция стоимости: 0 / пусто — поле не менять.
 * Отрицательное — ошибка.
 */
export function costCorrectionPriceOrSkip(
  raw: unknown,
): number | null | "invalid" {
  const p = parseInventoryMoneyRub(raw);
  if (p === "invalid") return "invalid";
  if (p == null || p === 0) return null;
  if (p < 0) return "invalid";
  return Math.round(p * 100) / 100;
}

export function prostheticWorkTotalRub(opts: {
  quantity: number;
  saleUnitPriceRub: number | null | undefined;
  fallbackTotalRub?: number | null;
}): number {
  const qty = Number(opts.quantity);
  const sale = opts.saleUnitPriceRub;
  if (sale != null && Number.isFinite(sale) && Number.isFinite(qty)) {
    return Math.round(qty * sale * 100) / 100;
  }
  if (
    opts.fallbackTotalRub != null &&
    Number.isFinite(opts.fallbackTotalRub)
  ) {
    return Math.round(opts.fallbackTotalRub * 100) / 100;
  }
  return 0;
}
