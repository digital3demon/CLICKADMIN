import { describe, expect, it } from "vitest";
import {
  canonicalOrderPayment,
  ORDER_PAYMENT_EXPECTED,
  ORDER_PAYMENT_NOT_PAID,
  ORDER_PAYMENT_PARTIAL,
} from "@/lib/order-clinic-client-fields";

describe("canonicalOrderPayment", () => {
  it("maps legacy «Ожидает оплаты» to «Не оплачено»", () => {
    expect(canonicalOrderPayment(ORDER_PAYMENT_EXPECTED)).toBe(
      ORDER_PAYMENT_NOT_PAID,
    );
  });

  it("normalizes empty to «Не оплачено»", () => {
    expect(canonicalOrderPayment(null)).toBe(ORDER_PAYMENT_NOT_PAID);
    expect(canonicalOrderPayment("")).toBe(ORDER_PAYMENT_NOT_PAID);
    expect(canonicalOrderPayment("   ")).toBe(ORDER_PAYMENT_NOT_PAID);
  });

  it("passes through other statuses", () => {
    expect(canonicalOrderPayment(ORDER_PAYMENT_PARTIAL)).toBe(
      ORDER_PAYMENT_PARTIAL,
    );
  });
});
