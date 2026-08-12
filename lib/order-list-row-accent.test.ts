import { describe, expect, it } from "vitest";
import {
  mergeOrderListRowClass,
  orderListRowAccentClass,
  resolveOrderListHarmonyRowState,
  resolveOrderListRowAccentKind,
} from "@/lib/order-list-row-accent";

describe("resolveOrderListRowAccentKind", () => {
  it("корректировки не красят строку — только протетика pending", () => {
    expect(
      resolveOrderListRowAccentKind({
        listPendingChatCorrections: true,
        listPendingProstheticsRequests: true,
        prostheticsOrdered: false,
      }),
    ).toBe("prosthetics-pending");
  });

  it("расхождение счёта — без акцента строки", () => {
    expect(
      resolveOrderListRowAccentKind({ listCompositionMismatch: true }),
    ).toBeNull();
  });

  it("ожидание протетики", () => {
    expect(
      resolveOrderListRowAccentKind({
        listPendingProstheticsRequests: true,
        prostheticsOrdered: false,
      }),
    ).toBe("prosthetics-pending");
  });

  it("протетика заказана — не pending и без акцента", () => {
    expect(
      resolveOrderListRowAccentKind({
        listPendingProstheticsRequests: true,
        prostheticsOrdered: true,
      }),
    ).toBeNull();
  });

  it("без флагов — null", () => {
    expect(resolveOrderListRowAccentKind({})).toBeNull();
  });
});

describe("orderListRowAccentClass / harmony", () => {
  it("классы только для pending", () => {
    expect(orderListRowAccentClass("prosthetics-pending")).toContain("sky");
    expect(orderListRowAccentClass(null)).toBe("");
  });

  it("blocked важнее accent в harmony state", () => {
    expect(
      resolveOrderListHarmonyRowState({
        blocked: true,
        shipped: true,
        accent: "prosthetics-pending",
      }),
    ).toBe("blocked");
  });

  it("merge: accent перекрывает shipped-тинт", () => {
    const cls = mergeOrderListRowClass({
      shipped: true,
      accent: "prosthetics-pending",
      shippedClass: "shipped-base",
    });
    expect(cls).not.toContain("shipped-base");
    expect(cls).toContain("sky");
    expect(cls).toMatch(/bg-sky/);
  });

  it("merge без accent — shipped", () => {
    expect(
      mergeOrderListRowClass({
        shipped: true,
        accent: null,
        shippedClass: "shipped-base",
      }),
    ).toBe("shipped-base");
  });
});
