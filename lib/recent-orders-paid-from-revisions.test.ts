import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import {
  ORDER_PAYMENT_EXPECTED,
  ORDER_PAYMENT_NOT_PAID,
  ORDER_PAYMENT_PAID,
  ORDER_PAYMENT_PARTIAL,
} from "@/lib/order-clinic-client-fields";
import {
  isStrictPaidPayment,
  isUnpaidOrPartialPayment,
  lastPaidTransitionAtFromRevisions,
} from "@/lib/recent-orders-paid-from-revisions-logic";

function snap(payment: string | null): Prisma.JsonValue {
  return {
    v: 1,
    order: { payment },
    constructions: [],
  };
}

describe("recent-orders-paid-from-revisions", () => {
  it("detects unpaid → paid on consecutive revisions", () => {
    const t0 = new Date("2026-01-01T10:00:00.000Z");
    const t1 = new Date("2026-01-02T11:00:00.000Z");
    const chain = [
      { createdAt: t0, snapshot: snap(ORDER_PAYMENT_NOT_PAID) },
      { createdAt: t1, snapshot: snap(ORDER_PAYMENT_PAID) },
    ];
    expect(lastPaidTransitionAtFromRevisions(chain)).toEqual(t1);
  });

  it("detects partial → paid (кириллица как в БД)", () => {
    const t0 = new Date("2026-03-01T08:00:00.000Z");
    const t1 = new Date("2026-03-01T09:00:00.000Z");
    const chain = [
      { createdAt: t0, snapshot: snap(ORDER_PAYMENT_PARTIAL) },
      { createdAt: t1, snapshot: snap(ORDER_PAYMENT_PAID) },
    ];
    expect(lastPaidTransitionAtFromRevisions(chain)).toEqual(t1);
  });

  it("uses last transition when paid toggled back and forth", () => {
    const t0 = new Date("2026-01-01T10:00:00.000Z");
    const t1 = new Date("2026-01-02T10:00:00.000Z");
    const t2 = new Date("2026-01-03T10:00:00.000Z");
    const t3 = new Date("2026-01-04T10:00:00.000Z");
    const chain = [
      { createdAt: t0, snapshot: snap(ORDER_PAYMENT_NOT_PAID) },
      { createdAt: t1, snapshot: snap(ORDER_PAYMENT_PAID) },
      { createdAt: t2, snapshot: snap(ORDER_PAYMENT_NOT_PAID) },
      { createdAt: t3, snapshot: snap(ORDER_PAYMENT_PAID) },
    ];
    expect(lastPaidTransitionAtFromRevisions(chain)).toEqual(t3);
  });

  it("isUnpaidOrPartialPayment treats «Ожидает оплаты» как не оплачено", () => {
    expect(isUnpaidOrPartialPayment(ORDER_PAYMENT_EXPECTED)).toBe(true);
  });

  it("isStrictPaidPayment only exact Оплачено", () => {
    expect(isStrictPaidPayment(ORDER_PAYMENT_PAID)).toBe(true);
    expect(isStrictPaidPayment(" Сверка-ОПЛАЧЕНО ")).toBe(false);
  });
});
