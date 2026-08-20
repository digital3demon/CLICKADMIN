import { describe, expect, it } from "vitest";
import {
  financeOfficeRowTintClass,
  resolveFinanceOfficeRowTintKind,
} from "@/lib/finance-office-row-tint";

describe("resolveFinanceOfficeRowTintKind", () => {
  it("счёт важнее просчитано — синий, не градиент", () => {
    expect(
      resolveFinanceOfficeRowTintKind({
        financeCalculated: true,
        invoiceIssued: true,
      }),
    ).toBe("invoiced");
  });

  it("только просчитано — зелёный", () => {
    expect(
      resolveFinanceOfficeRowTintKind({
        financeCalculated: true,
        invoiceIssued: false,
      }),
    ).toBe("calculated");
  });

  it("только счёт — синий", () => {
    expect(
      resolveFinanceOfficeRowTintKind({
        financeCalculated: false,
        invoiceIssued: true,
      }),
    ).toBe("invoiced");
  });

  it("номер счёта без галки «выставлен» — тоже синий", () => {
    expect(
      resolveFinanceOfficeRowTintKind({
        financeCalculated: false,
        invoiceIssued: false,
        invoiceNumber: "СЧЕТ №183 от 8.05.2026",
      }),
    ).toBe("invoiced");
    expect(
      resolveFinanceOfficeRowTintKind({
        financeCalculated: false,
        invoiceIssued: false,
        invoiceAttachmentId: "att_1",
      }),
    ).toBe("invoiced");
  });

  it("ничего — без тинта", () => {
    expect(
      resolveFinanceOfficeRowTintKind({
        financeCalculated: false,
        invoiceIssued: false,
      }),
    ).toBeNull();
  });
});

describe("financeOfficeRowTintClass", () => {
  it("calculated / invoiced — сплошные CSS-классы, без both", () => {
    expect(financeOfficeRowTintClass("calculated")).toContain(
      "finance-office-row-tint-calc",
    );
    expect(financeOfficeRowTintClass("invoiced")).toContain(
      "finance-office-row-tint-inv",
    );
    expect(financeOfficeRowTintClass(null)).toContain(
      "hover:bg-[var(--table-row-hover)]",
    );
    expect(financeOfficeRowTintClass("calculated")).not.toContain("both");
    expect(financeOfficeRowTintClass("invoiced")).not.toContain("gradient");
  });
});

describe("finance-office tint CSS не вешает scroll", () => {
  it("нет градиента и background-attachment:fixed", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(src).toContain("--fo-tint-calc:");
    expect(src).toContain("--fo-tint-inv:");
    expect(src).not.toContain(".finance-office-row-tint-both");
    const calcAt = src.indexOf(".finance-office-row-tint-calc");
    expect(calcAt).toBeGreaterThan(0);
    const block = src.slice(calcAt, calcAt + 900);
    expect(block).not.toMatch(/background-attachment:\s*fixed/);
    expect(block).not.toMatch(/linear-gradient/);
  });
});
