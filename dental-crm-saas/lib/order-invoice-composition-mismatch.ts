import { lineAmountRub } from "@/lib/format-order-construction";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";

type Line = { quantity: number; unitPrice: number | null };

/**
 * Как на карточке наряда: сумма по счёту задана и |состав − счёт| > 1 ₽.
 */
export function orderInvoiceCompositionMismatch(o: {
  invoiceParsedTotalRub: number | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  constructions: Line[];
}): boolean {
  if (o.invoiceParsedTotalRub == null) return false;
  const mult = orderUrgentPriceMultiplier(o.isUrgent, o.urgentCoefficient);
  let sum = 0;
  for (const c of o.constructions) {
    const q = c.quantity > 0 ? c.quantity : 1;
    const p = c.unitPrice;
    if (p == null || typeof p !== "number" || Number.isNaN(p)) continue;
    sum += lineAmountRub(q, p) * mult;
  }
  const compositionRub = Math.round(sum * 100) / 100;
  const invoiceRub = o.invoiceParsedTotalRub;
  return Math.abs(compositionRub - invoiceRub) > 1;
}
