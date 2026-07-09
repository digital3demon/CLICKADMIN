import { describe, expect, it } from "vitest";
import {
  appendOrdersShipmentParams,
  isOrdersShipmentListPath,
  ordersShipmentListPdfHref,
  parseOrdersShipmentParams,
} from "./orders-shipment-list-query";
import { ordersListHref } from "./orders-list-query";

describe("parseOrdersShipmentParams", () => {
  it("parses actual mode", () => {
    expect(parseOrdersShipmentParams({ ship: "actual" })).toEqual({
      mode: "actual",
      shipFrom: null,
      shipTo: null,
      periodError: null,
    });
  });

  it("requires shipTo for period", () => {
    const res = parseOrdersShipmentParams({ ship: "period" });
    expect(res.periodError).toContain("по");
  });

  it("allows open-start period with only shipTo", () => {
    expect(
      parseOrdersShipmentParams({ ship: "period", shipTo: "2026-07-09" }),
    ).toEqual({
      mode: "period",
      shipFrom: null,
      shipTo: "2026-07-09",
      periodError: null,
    });
  });
});

describe("ordersListHref shipment params", () => {
  it("builds actual href", () => {
    expect(ordersListHref({ ship: "actual" })).toBe("/orders?ship=actual");
  });

  it("builds period href with open start", () => {
    expect(
      ordersListHref({ ship: "period", shipTo: "2026-07-09" }),
    ).toBe("/orders?ship=period&shipTo=2026-07-09");
  });

  it("appendOrdersShipmentParams clears ship on null", () => {
    const p = new URLSearchParams("ship=actual&shipTo=2026-07-01");
    appendOrdersShipmentParams(p, { ship: null });
    expect(p.has("ship")).toBe(false);
    expect(p.has("shipTo")).toBe(false);
  });
});

describe("isOrdersShipmentListPath", () => {
  it("detects shipment mode on /orders", () => {
    expect(isOrdersShipmentListPath("/orders", "ship=actual")).toBe(true);
    expect(isOrdersShipmentListPath("/orders", "?ship=period&shipTo=2026-07-09")).toBe(
      true,
    );
  });

  it("returns false without ship param or on other paths", () => {
    expect(isOrdersShipmentListPath("/orders", "")).toBe(false);
    expect(isOrdersShipmentListPath("/shipments", "ship=actual")).toBe(false);
  });
});

describe("ordersShipmentListPdfHref", () => {
  it("builds actual pdf href", () => {
    expect(ordersShipmentListPdfHref({ ship: "actual" })).toBe(
      "/api/shipments/orders-list-pdf?ship=actual",
    );
  });

  it("builds period pdf href", () => {
    expect(
      ordersShipmentListPdfHref({
        ship: "period",
        shipTo: "2026-07-09",
      }),
    ).toBe("/api/shipments/orders-list-pdf?ship=period&shipTo=2026-07-09");
  });

  it("returns null for period without shipTo", () => {
    expect(ordersShipmentListPdfHref({ ship: "period" })).toBeNull();
  });
});
