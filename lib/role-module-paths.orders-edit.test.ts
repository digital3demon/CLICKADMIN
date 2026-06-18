import { describe, expect, it } from "vitest";
import { ordersBranchModuleForMethod } from "@/lib/role-module-paths";

describe("ordersBranchModuleForMethod", () => {
  it("GET order API maps to ORDERS view", () => {
    expect(ordersBranchModuleForMethod("/api/orders/abc", "GET")).toBe("ORDERS");
  });

  it("PATCH order API maps to ORDERS_EDIT", () => {
    expect(ordersBranchModuleForMethod("/api/orders/abc", "PATCH")).toBe(
      "ORDERS_EDIT",
    );
  });

  it("POST /api/orders maps to ORDERS_CREATE", () => {
    expect(ordersBranchModuleForMethod("/api/orders", "POST")).toBe(
      "ORDERS_CREATE",
    );
  });
});
