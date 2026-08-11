import { describe, expect, it } from "vitest";
import { defaultModuleAllowed } from "@/lib/role-module-defaults";

describe("ORDERS_CHAT defaults", () => {
  it("включён для админов, менеджера, финотдела и бухгалтера", () => {
    for (const role of [
      "ADMINISTRATOR",
      "SENIOR_ADMINISTRATOR",
      "MANAGER",
      "FINANCIAL_MANAGER",
      "ACCOUNTANT",
    ] as const) {
      expect(defaultModuleAllowed(role, "ORDERS_CHAT")).toBe(true);
    }
    expect(defaultModuleAllowed("SENIOR_TECHNICIAN", "ORDERS_CHAT")).toBe(true);
  });

  it("выключен для ролей «только канбан»", () => {
    for (const role of ["USER", "PRODUCTION", "SENIOR_PRODUCTION"] as const) {
      expect(defaultModuleAllowed(role, "ORDERS_CHAT")).toBe(false);
    }
  });

  it("чат и редактирование: менеджер и бухгалтер имеют оба по умолчанию", () => {
    expect(defaultModuleAllowed("MANAGER", "ORDERS_CHAT")).toBe(true);
    expect(defaultModuleAllowed("MANAGER", "ORDERS_EDIT")).toBe(true);
    expect(defaultModuleAllowed("ACCOUNTANT", "ORDERS_CHAT")).toBe(true);
    expect(defaultModuleAllowed("ACCOUNTANT", "ORDERS_EDIT")).toBe(true);
  });
});
