import type { Prisma } from "@prisma/client";
import {
  ORDER_PAYMENT_NOT_PAID,
  ORDER_PAYMENT_PAID,
  ORDER_PAYMENT_PARTIAL,
  canonicalOrderPayment,
} from "@/lib/order-clinic-client-fields";

export type RecentPaidOrderRow = {
  orderId: string;
  orderNumber: string;
  /** ISO */
  changedAt: string;
};

function paymentFromSnapshot(snapshot: Prisma.JsonValue): string {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return ORDER_PAYMENT_NOT_PAID;
  }
  const root = snapshot as Record<string, unknown>;
  const order = root.order;
  if (!order || typeof order !== "object" || Array.isArray(order)) {
    return ORDER_PAYMENT_NOT_PAID;
  }
  const pay = (order as Record<string, unknown>).payment;
  if (typeof pay !== "string") return ORDER_PAYMENT_NOT_PAID;
  return pay;
}

/** «Не оплачено» / «Ожидает» (канон → не оплачено) или «Частично оплачено». */
export function isUnpaidOrPartialPayment(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  if (raw === ORDER_PAYMENT_PARTIAL) return true;
  return canonicalOrderPayment(raw) === ORDER_PAYMENT_NOT_PAID;
}

export function isStrictPaidPayment(value: string | null | undefined): boolean {
  return (value ?? "").trim() === ORDER_PAYMENT_PAID;
}

/**
 * Последний переход в журнале версий: с «Не оплачено»/«Частично оплачено» на «Оплачено».
 * Сравниваются подряд идущие снимки в `revisionsAsc` (по времени создания).
 */
export function lastPaidTransitionAtFromRevisions(
  revisionsAsc: Array<{ createdAt: Date; snapshot: Prisma.JsonValue }>,
): Date | null {
  if (revisionsAsc.length < 2) return null;
  let last: Date | null = null;
  for (let i = 1; i < revisionsAsc.length; i++) {
    const prevPay = paymentFromSnapshot(revisionsAsc[i - 1]!.snapshot);
    const nextPay = paymentFromSnapshot(revisionsAsc[i]!.snapshot);
    if (isUnpaidOrPartialPayment(prevPay) && isStrictPaidPayment(nextPay)) {
      last = revisionsAsc[i]!.createdAt;
    }
  }
  return last;
}
