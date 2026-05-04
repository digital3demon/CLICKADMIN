import type { ConstructionCategory } from "@prisma/client";
import { lineAllocatedTotalRub } from "@/lib/format-order-construction";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";

/**
 * Единая позиция прайса для коррекций и переделок: код «КП», цена в каталоге 0 ₽,
 * фактическая сумма задаётся в строке состава наряда (unitPrice × кол-во).
 */
export const CORRECTION_PRICE_ITEM_CODE = "КП";

type LineWithPl = {
  category: ConstructionCategory;
  quantity: number;
  unitPrice: number | null;
  lineDiscountPercent: number | null | undefined;
  priceListItem: { code: string } | null | undefined;
};

type OrderLike = {
  isUrgent: boolean;
  urgentCoefficient: number | null;
  compositionDiscountPercent?: number | null;
  constructions: LineWithPl[];
};

/** Доля выручки наряда по строкам прайса «КП» (после скидок и срочности). */
export function sumCorrectionPriceLinesAllocatedRub(order: OrderLike): number {
  const mult = orderUrgentPriceMultiplier(
    order.isUrgent,
    order.urgentCoefficient,
  );
  const lines = order.constructions.map((c) => ({
    quantity: c.quantity,
    unitPrice: c.unitPrice,
    lineDiscountPercent: c.lineDiscountPercent,
  }));
  let sum = 0;
  for (const [i, c] of order.constructions.entries()) {
    if (c.category !== "PRICE_LIST") continue;
    if (c.priceListItem?.code !== CORRECTION_PRICE_ITEM_CODE) continue;
    sum += lineAllocatedTotalRub(
      lines[i]!,
      lines,
      order.compositionDiscountPercent,
      mult,
    );
  }
  return Math.round(sum * 100) / 100;
}
