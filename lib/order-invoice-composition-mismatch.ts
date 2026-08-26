import { orderCompositionSubtotalAfterDiscountsRub } from "@/lib/format-order-construction";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";

type Line = {
  quantity: number;
  unitPrice: number | null;
  lineDiscountPercent?: number | null;
};

export type InvoiceCompositionCompareInput = {
  invoiceParsedTotalRub: number | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  compositionDiscountPercent?: number | null;
  constructions: Line[];
  /** Реализация «наше со склада»; скидка/срочность не применяются. */
  prostheticsOurRub?: number | null;
  /** Если совпадает с текущей парой сумм — расхождение подтверждено и не светится. */
  invoiceMismatchAckFingerprint?: string | null;
};

function compositionRubForInvoiceCompare(
  o: InvoiceCompositionCompareInput,
): number {
  const mult = orderUrgentPriceMultiplier(o.isUrgent, o.urgentCoefficient);
  const sub = orderCompositionSubtotalAfterDiscountsRub(
    o.constructions.map((c) => ({
      quantity: c.quantity > 0 ? c.quantity : 1,
      unitPrice: c.unitPrice,
      lineDiscountPercent: c.lineDiscountPercent,
    })),
    o.compositionDiscountPercent,
  );
  const constructions = Math.round(sub * mult * 100) / 100;
  const prost =
    o.prostheticsOurRub != null && Number.isFinite(o.prostheticsOurRub)
      ? Math.max(0, Math.round(o.prostheticsOurRub * 100) / 100)
      : 0;
  return Math.round((constructions + prost) * 100) / 100;
}

/** Канон в БД: целые рубли счёта и состава через двоеточие. */
export function invoiceMismatchFingerprint(
  invoiceRub: number,
  compositionRub: number,
): string {
  return `${Math.round(invoiceRub)}:${Math.round(compositionRub)}`;
}

export function invoiceMismatchFingerprintFor(
  o: InvoiceCompositionCompareInput,
): string | null {
  if (o.invoiceParsedTotalRub == null) return null;
  return invoiceMismatchFingerprint(
    o.invoiceParsedTotalRub,
    compositionRubForInvoiceCompare(o),
  );
}

/**
 * Как на карточке наряда: сумма по счёту задана и |состав − счёт| > 1 ₽.
 * Пилюля «Корректировки»: чат «!!!» ∪ это расхождение (уникальные наряды).
 * После «Подтвердить расхождение» та же пара сумм не считается.
 */
export function orderInvoiceCompositionMismatch(
  o: InvoiceCompositionCompareInput,
): boolean {
  if (o.invoiceParsedTotalRub == null) return false;
  const compositionRub = compositionRubForInvoiceCompare(o);
  const invoiceRub = o.invoiceParsedTotalRub;
  if (Math.abs(compositionRub - invoiceRub) <= 1) return false;
  const fp = invoiceMismatchFingerprint(invoiceRub, compositionRub);
  if (
    typeof o.invoiceMismatchAckFingerprint === "string" &&
    o.invoiceMismatchAckFingerprint === fp
  ) {
    return false;
  }
  return true;
}

/** Счётчик пилюли: чат + расхождение счёта, без двойного учёта одного наряда. */
export function uniqueAttentionOrderCount(
  pendingCorrectionOrderIds: Iterable<string>,
  mismatchOrderIds: Iterable<string>,
): number {
  const ids = new Set<string>();
  for (const id of pendingCorrectionOrderIds) ids.add(id);
  for (const id of mismatchOrderIds) ids.add(id);
  return ids.size;
}
