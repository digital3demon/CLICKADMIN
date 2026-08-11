import { describe, expect, it } from "vitest";
import { defaultModuleAllowed } from "@/lib/role-module-defaults";

describe("ORDERS_EDIT defaults", () => {
  it("enabled for administrators, manager, financial manager and accountant", () => {
    for (const role of [
      "ADMINISTRATOR",
      "SENIOR_ADMINISTRATOR",
      "MANAGER",
      "FINANCIAL_MANAGER",
      "ACCOUNTANT",
    ] as const) {
      expect(defaultModuleAllowed(role, "ORDERS_EDIT")).toBe(true);
    }
  });

  it("disabled for production and kanban-only roles by default", () => {
    for (const role of [
      "USER",
      "PRODUCTION",
      "SENIOR_TECHNICIAN",
    ] as const) {
      expect(defaultModuleAllowed(role, "ORDERS_EDIT")).toBe(false);
    }
  });
});
