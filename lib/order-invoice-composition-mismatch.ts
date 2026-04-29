import { orderCompositionSubtotalAfterDiscountsRub } from "@/lib/format-order-construction";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";

type Line = {
  quantity: number;
  unitPrice: number | null;
  lineDiscountPercent?: number | null;
};

/**
 * Как на карточке наряда: сумма по счёту задана и |состав − счёт| > 1 ₽.
 */
export function orderInvoiceCompositionMismatch(o: {
  invoiceParsedTotalRub: number | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  compositionDiscountPercent?: number | null;
  constructions: Line[];
}): boolean {
  if (o.invoiceParsedTotalRub == null) return false;
  const mult = orderUrgentPriceMultiplier(o.isUrgent, o.urgentCoefficient);
  const sub = orderCompositionSubtotalAfterDiscountsRub(
    o.constructions.map((c) => ({
      quantity: c.quantity > 0 ? c.quantity : 1,
      unitPrice: c.unitPrice,
      lineDiscountPercent: c.lineDiscountPercent,
    })),
    o.compositionDiscountPercent,
  );
  const compositionRub = Math.round(sub * mult * 100) / 100;
  const invoiceRub = o.invoiceParsedTotalRub;
  return Math.abs(compositionRub - invoiceRub) > 1;
}
