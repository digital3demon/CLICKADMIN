/**
 * Чистая математика / агрегаты сверки по шаблону (без Prisma).
 */

export const RECONCILIATION_VAT_RATE = 0.05;

/** НДС 5% внутри цены: total * 5/105. */
export function reconciliationVatIncluded5(totalWithDiscountRub: number): number {
  if (!Number.isFinite(totalWithDiscountRub) || totalWithDiscountRub <= 0) {
    return 0;
  }
  return Math.round(((totalWithDiscountRub * 5) / 105) * 100) / 100;
}

export type ReconciliationSummaryAggLine = {
  label: string;
  quantity: number;
  unitRub: number;
  totalRub: number;
};

/**
 * Сводка одинаковых позиций без скидок: ключ = наименование + цена за ед.
 */
export function aggregateReconciliationSummaryWithoutDiscount(
  lines: Array<{
    label: string;
    quantity: number;
    unitRub: number | null;
    baseTotalRub: number;
  }>,
): ReconciliationSummaryAggLine[] {
  const map = new Map<
    string,
    { label: string; quantity: number; totalRub: number; unitRub: number }
  >();
  for (const line of lines) {
    const qty = line.quantity > 0 ? line.quantity : 0;
    const unit =
      line.unitRub != null && Number.isFinite(line.unitRub)
        ? Math.round(line.unitRub * 100) / 100
        : qty > 0
          ? Math.round((line.baseTotalRub / qty) * 100) / 100
          : 0;
    const unitKey = String(unit);
    const key = `${line.label}\u0001${unitKey}`;
    const prev = map.get(key);
    if (prev) {
      prev.quantity += qty;
      prev.totalRub += line.baseTotalRub;
    } else {
      map.set(key, {
        label: line.label,
        quantity: qty,
        totalRub: line.baseTotalRub,
        unitRub: unit,
      });
    }
  }
  const out: ReconciliationSummaryAggLine[] = [];
  for (const v of map.values()) {
    const totalRub = Math.round(v.totalRub * 100) / 100;
    const quantity = Math.round(v.quantity * 100) / 100;
    const unitRub =
      quantity > 0
        ? Math.round((totalRub / quantity) * 100) / 100
        : v.unitRub;
    out.push({ label: v.label, quantity, unitRub, totalRub });
  }
  out.sort((a, b) => a.label.localeCompare(b.label, "ru"));
  return out;
}

/** Мода строковых меток (юрлицо нарядов); пустые игнорируются. */
export function modeNonEmptyLabel(
  labels: Array<string | null | undefined>,
): string | null {
  const counts = new Map<string, number>();
  for (const raw of labels) {
    const s = typeof raw === "string" ? raw.trim() : "";
    if (!s) continue;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN || (n === bestN && best != null && k.localeCompare(best, "ru") < 0)) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

/** Группировка строк детализации: новая группа на showOrderColumns (вариант B). */
export function groupReconciliationDetailRows<
  T extends { showOrderColumns: boolean },
>(rows: T[]): T[][] {
  const groups: T[][] = [];
  let cur: T[] = [];
  for (const row of rows) {
    if (row.showOrderColumns) {
      if (cur.length) groups.push(cur);
      cur = [row];
    } else {
      cur.push(row);
    }
  }
  if (cur.length) groups.push(cur);
  return groups;
}

export function defaultReconciliationLabLegalName(): string {
  return (
    process.env.RECONCILIATION_LAB_LEGAL_NAME?.trim() || "ООО «КЛИКЛаб»"
  );
}
