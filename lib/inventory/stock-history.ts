import {
  STOCK_MOVEMENT_KIND_LABELS,
  type StockMovementKindKey,
  isStockMovementKind,
} from "@/lib/inventory/stock-movement-kind-labels";

export type StockHistoryRow = {
  id: string;
  createdAt: string;
  kind: string;
  kindLabel: string;
  /** Человекочитаемая строка: «Внесено 5 шт „…“ на склад „…“». */
  description: string;
  quantity: number;
  actorLabel: string;
  note: string | null;
  returnedToWarehouseAt: string | null;
  item: { id: string; label: string; unit: string };
  warehouse: { id: string; name: string };
  order: { id: string; orderNumber: string } | null;
};

function formatQty(quantity: number, unit: string): string {
  const q =
    Number.isInteger(quantity) || Math.abs(quantity - Math.round(quantity)) < 1e-9
      ? String(Math.round(quantity))
      : String(quantity);
  const u = (unit || "шт").trim() || "шт";
  return `${q} ${u}`;
}

/**
 * Текст журнала: внесено / добавлено / списано / возврат / брак.
 */
export function formatStockHistoryDescription(opts: {
  kind: string;
  quantity: number;
  unit: string;
  itemLabel: string;
  warehouseName: string;
  orderNumber?: string | null;
  note?: string | null;
}): { kindLabel: string; description: string } {
  const kind = isStockMovementKind(opts.kind)
    ? opts.kind
    : ("ADJUSTMENT_PLUS" as StockMovementKindKey);
  const kindLabel = STOCK_MOVEMENT_KIND_LABELS[kind] ?? opts.kind;
  const qty = formatQty(opts.quantity, opts.unit);
  const item = (opts.itemLabel || "позиция").trim() || "позиция";
  const wh = (opts.warehouseName || "склад").trim() || "склад";
  const orderN = opts.orderNumber?.trim() || "";

  let core: string;
  switch (kind) {
    case "PURCHASE_RECEIPT":
      core = `Внесено ${qty} «${item}» на склад «${wh}»`;
      break;
    case "ADJUSTMENT_PLUS":
      core = `Добавлено ${qty} «${item}» на склад «${wh}»`;
      break;
    case "RETURN_IN":
      core = `Возврат на склад «${wh}»: ${qty} «${item}»`;
      break;
    case "MANUAL_ISSUE":
      core = `Списано ${qty} «${item}» со склада «${wh}»`;
      break;
    case "SALE_ISSUE":
      core = orderN
        ? `Списано ${qty} «${item}» по наряду ${orderN} (склад «${wh}»)`
        : `Списано ${qty} «${item}» по наряду (склад «${wh}»)`;
      break;
    case "ADJUSTMENT_MINUS":
      core = `Корректировка −: ${qty} «${item}» со склада «${wh}»`;
      break;
    case "DEFECT_WRITE_OFF":
      core = `Брак: списано ${qty} «${item}» со склада «${wh}»`;
      break;
    case "COST_CORRECTION":
      core = `Коррекция стоимости «${item}» на складе «${wh}»`;
      break;
    default:
      core = `${kindLabel}: ${qty} «${item}» (склад «${wh}»)`;
  }

  const note = opts.note?.trim();
  const description = note ? `${core}. ${note}` : core;
  return { kindLabel, description };
}
