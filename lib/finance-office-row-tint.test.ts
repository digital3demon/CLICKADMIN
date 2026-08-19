import { describe, expect, it } from "vitest";
import {
  financeOfficeRowTintClass,
  resolveFinanceOfficeRowTintKind,
} from "@/lib/finance-office-row-tint";

describe("resolveFinanceOfficeRowTintKind", () => {
  it("оба — градиент", () => {
    expect(
      resolveFinanceOfficeRowTintKind({
        financeCalculated: true,
        invoiceIssued: true,
      }),
    ).toBe("both");
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
  it("both — один градиент на строке, не на каждой ячейке", () => {
    const cls = financeOfficeRowTintClass("both");
    expect(cls).toContain("bg-gradient-to-r");
    expect(cls).toContain("[&>td]:bg-transparent");
    expect(cls).not.toContain("[&>td]:bg-gradient-to-r");
    expect(cls).toContain("from-emerald");
    expect(cls).toContain("to-sky");
  });

  it("calculated — emerald, invoiced — sky", () => {
    expect(financeOfficeRowTintClass("calculated")).toContain("emerald");
    expect(financeOfficeRowTintClass("invoiced")).toContain("sky");
    expect(financeOfficeRowTintClass(null)).toContain("hover:bg-[var(--table-row-hover)]");
  });
});
