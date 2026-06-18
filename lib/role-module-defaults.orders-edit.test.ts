import { describe, expect, it } from "vitest";
import { defaultModuleAllowed } from "@/lib/role-module-defaults";

describe("ORDERS_EDIT defaults", () => {
  it("enabled for administrators, manager and financial manager", () => {
    for (const role of [
      "ADMINISTRATOR",
      "SENIOR_ADMINISTRATOR",
      "MANAGER",
      "FINANCIAL_MANAGER",
    ] as const) {
      expect(defaultModuleAllowed(role, "ORDERS_EDIT")).toBe(true);
    }
  });

  it("disabled for accountant and production roles by default", () => {
    for (const role of [
      "ACCOUNTANT",
      "USER",
      "PRODUCTION",
      "SENIOR_TECHNICIAN",
    ] as const) {
      expect(defaultModuleAllowed(role, "ORDERS_EDIT")).toBe(false);
    }
  });
});
