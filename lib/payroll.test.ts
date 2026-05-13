import { describe, expect, it } from "vitest";
import {
  canConfigurePayroll,
  canReviewPayroll,
  isPayrollUserRole,
  parsePayrollWorkKind,
  payrollAmountForKind,
  normalizePayrollQuantity,
} from "@/lib/payroll";
import { defaultModuleAllowed } from "@/lib/role-module-defaults";

describe("payroll helpers", () => {
  it("allows payroll module for deal-based roles", () => {
    expect(defaultModuleAllowed("USER", "PAYROLL")).toBe(true);
    expect(defaultModuleAllowed("SENIOR_TECHNICIAN", "PAYROLL")).toBe(true);
    expect(defaultModuleAllowed("ACCOUNTANT", "PAYROLL")).toBe(false);
  });

  it("separates user, reviewer and config permissions", () => {
    expect(isPayrollUserRole("USER")).toBe(true);
    expect(isPayrollUserRole("SENIOR_TECHNICIAN")).toBe(true);
    expect(canReviewPayroll("USER")).toBe(false);
    expect(canReviewPayroll("SENIOR_TECHNICIAN")).toBe(true);
    expect(canConfigurePayroll("SENIOR_TECHNICIAN")).toBe(false);
    expect(canConfigurePayroll("OWNER")).toBe(true);
  });

  it("parses only supported work kinds", () => {
    expect(parsePayrollWorkKind("CAD")).toBe("CAD");
    expect(parsePayrollWorkKind("CAD_SURGERY")).toBe("CAD_SURGERY");
    expect(parsePayrollWorkKind("cad")).toBeNull();
    expect(parsePayrollWorkKind("OTHER")).toBeNull();
  });

  it("takes amounts from server-side config only", () => {
    const config = {
      cadRub: 1000,
      cadSurgeryRub: 1500,
      manualRub: null,
      processingRub: 0,
    };
    expect(payrollAmountForKind(config, "CAD")).toBe(1000);
    expect(payrollAmountForKind(config, "CAD_SURGERY")).toBe(1500);
    expect(payrollAmountForKind(config, "MANUAL")).toBeNull();
    expect(payrollAmountForKind(config, "PROCESSING")).toBeNull();
  });

  it("normalizes work quantity", () => {
    expect(normalizePayrollQuantity("4")).toBe(4);
    expect(normalizePayrollQuantity(2.9)).toBe(2);
    expect(normalizePayrollQuantity("0")).toBe(1);
    expect(normalizePayrollQuantity("10000")).toBe(999);
  });
});
