import { describe, expect, it } from "vitest";
import { canEditOrderListTechMemo } from "@/lib/auth/permissions";
import { normalizeOrderListTechMemoInput } from "@/lib/order-list-tech-memo";

describe("canEditOrderListTechMemo", () => {
  it("allows admins, senior tech, owner, manager", () => {
    expect(canEditOrderListTechMemo("OWNER")).toBe(true);
    expect(canEditOrderListTechMemo("ADMINISTRATOR")).toBe(true);
    expect(canEditOrderListTechMemo("SENIOR_ADMINISTRATOR")).toBe(true);
    expect(canEditOrderListTechMemo("SENIOR_TECHNICIAN")).toBe(true);
    expect(canEditOrderListTechMemo("MANAGER")).toBe(true);
  });

  it("denies production and accountant", () => {
    expect(canEditOrderListTechMemo("USER")).toBe(false);
    expect(canEditOrderListTechMemo("PRODUCTION")).toBe(false);
    expect(canEditOrderListTechMemo("ACCOUNTANT")).toBe(false);
  });
});

describe("normalizeOrderListTechMemoInput", () => {
  it("keeps cyrillic and trims", () => {
    expect(normalizeOrderListTechMemoInput("  модель на согласе  ")).toBe(
      "модель на согласе",
    );
  });
});
