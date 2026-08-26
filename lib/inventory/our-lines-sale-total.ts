/**
 * Сумма «наше со склада» в наряде: реализация × кол-во.
 * Скидка и срочность не применяются. Timezone не нужен (рубли).
 * Без цены реализации строка даёт 0 (в UI — «—»).
 */
import { prostheticWorkTotalRub } from "@/lib/inventory/sale-unit-price";
import { prostheticsFromDb } from "@/lib/order-prosthetics";

export type SalePriceLookupItem = {
  id: string;
  saleUnitPriceRub?: number | null;
};

function saleByIdMap(
  items:
    | Map<string, number | null | undefined>
    | SalePriceLookupItem[],
): Map<string, number | null | undefined> {
  if (items instanceof Map) return items;
  const m = new Map<string, number | null | undefined>();
  for (const it of items) m.set(it.id, it.saleUnitPriceRub);
  return m;
}

/** Сумма строки или null, если нет позиции / цены реализации. */
export function ourLineSaleRub(
  line: { inventoryItemId?: string; quantity?: number },
  items: Map<string, number | null | undefined> | SalePriceLookupItem[],
): number | null {
  const id = String(line.inventoryItemId ?? "").trim();
  if (!id) return null;
  const sale = saleByIdMap(items).get(id);
  if (sale == null || !Number.isFinite(sale)) return null;
  const qty = Number(line.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return prostheticWorkTotalRub({
    quantity: qty,
    saleUnitPriceRub: sale,
  });
}

export function ourLinesSaleTotalRub(
  lines: Array<{ inventoryItemId?: string; quantity?: number }>,
  items: Map<string, number | null | undefined> | SalePriceLookupItem[],
): number {
  const map = saleByIdMap(items);
  let sum = 0;
  for (const line of lines) {
    const n = ourLineSaleRub(line, map);
    if (n != null) sum += n;
  }
  return Math.round(sum * 100) / 100;
}

export function prostheticsOurSaleTotalFromJson(
  raw: unknown,
  items: Map<string, number | null | undefined> | SalePriceLookupItem[],
): number {
  return ourLinesSaleTotalRub(prostheticsFromDb(raw).ourLines, items);
}

export function collectProstheticsOurItemIds(raws: unknown[]): string[] {
  const ids = new Set<string>();
  for (const raw of raws) {
    for (const line of prostheticsFromDb(raw).ourLines) {
      const id = line.inventoryItemId.trim();
      if (id) ids.add(id);
    }
  }
  return [...ids];
}
