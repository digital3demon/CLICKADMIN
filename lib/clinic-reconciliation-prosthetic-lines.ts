/**
 * Протетика в сверке PDF/XLSX: qty только из order.prosthetics.ourLines,
 * имя/цена — справочник позиции склада по inventoryItemId.
 */
import { prostheticWorkTotalRub } from "@/lib/inventory/sale-unit-price";
import type { ProstheticsOurLine } from "@/lib/order-prosthetics";

export type ProstheticPdfAggLine = {
  itemId: string;
  name: string;
  qty: number;
  totalRub: number;
};

export function aggregateProstheticLinesForReconciliationPdf(
  lines: ProstheticsOurLine[],
  itemsById: Map<
    string,
    { name: string; saleUnitPriceRub: number | null | undefined }
  >,
): ProstheticPdfAggLine[] {
  const list: ProstheticPdfAggLine[] = [];
  for (const line of lines) {
    const itemId = String(line.inventoryItemId ?? "").trim();
    if (!itemId) continue;
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const item = itemsById.get(itemId);
    const name = item?.name?.trim() || "Позиция склада";
    const cost = prostheticWorkTotalRub({
      quantity: qty,
      saleUnitPriceRub: item?.saleUnitPriceRub,
    });
    const existing = list.find((x) => x.itemId === itemId);
    if (existing) {
      existing.qty += qty;
      existing.totalRub += cost;
    } else {
      list.push({ itemId, name, qty, totalRub: cost });
    }
  }
  return list;
}
