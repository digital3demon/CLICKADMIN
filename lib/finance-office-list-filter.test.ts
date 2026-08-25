import { describe, expect, it } from "vitest";
import {
  FINANCE_OFFICE_EXCLUDED_LAB_STATUSES,
  FINANCE_OFFICE_INCLUDED_LAB_STATUSES,
  effectiveFinanceLabDueDate,
  financeOfficeLabDueBeforeEndExclusive,
  financeOfficeInvoiceIssuedDateWhere,
  financeOfficeLabDueInRange,
  financeOfficeModeDateWhere,
  financeOfficeProductionAndLaterWhere,
  orderMatchesFinanceOfficeProductionPlus,
  parseFinanceOfficeMode,
} from "@/lib/finance-office-list-filter";

describe("finance-office-list-filter", () => {
  it("excludes early stages and TO_ADMINS from included statuses", () => {
    expect(FINANCE_OFFICE_EXCLUDED_LAB_STATUSES).toEqual([
      "TO_SCAN",
      "TO_EXECUTION",
      "APPROVAL",
      "TO_ADMINS",
    ]);
    expect(FINANCE_OFFICE_INCLUDED_LAB_STATUSES[0]).toBe("PRODUCTION");
    expect(FINANCE_OFFICE_INCLUDED_LAB_STATUSES).not.toContain("APPROVAL");
    expect(FINANCE_OFFICE_INCLUDED_LAB_STATUSES).not.toContain("TO_ADMINS");
    expect(FINANCE_OFFICE_INCLUDED_LAB_STATUSES.at(-1)).toBe("TO_REVIEW");
  });

  it("maps legacy today/tomorrow to actual; default is actual", () => {
    expect(parseFinanceOfficeMode(undefined)).toBe("actual");
    expect(parseFinanceOfficeMode(null)).toBe("actual");
    expect(parseFinanceOfficeMode("")).toBe("actual");
    expect(parseFinanceOfficeMode("today")).toBe("actual");
    expect(parseFinanceOfficeMode("tomorrow")).toBe("actual");
    expect(parseFinanceOfficeMode("period")).toBe("period");
  });

  it("period without to returns null (need date)", () => {
    expect(financeOfficeModeDateWhere({ mode: "period" })).toBeNull();
    expect(
      financeOfficeModeDateWhere({ mode: "period", toYmd: null }),
    ).toBeNull();
  });

  it("actual requires not calculated + lab-due upper bound", () => {
    const where = financeOfficeModeDateWhere({ mode: "actual" });
    const json = JSON.stringify(where);
    expect(json).toContain("financeCalculated");
    expect(json).toContain("dueDate");
    expect(json).not.toContain("appointmentDate");
  });

  it("period with only to is open-start by lab due", () => {
    const where = financeOfficeModeDateWhere({
      mode: "period",
      toYmd: "2026-07-10",
    });
    const json = JSON.stringify(where);
    expect(json).toContain("dueDate");
    expect(json).not.toContain("appointmentDate");
  });

  it("period with from+to is closed lab-due range", () => {
    const where = financeOfficeModeDateWhere({
      mode: "period",
      fromYmd: "2026-07-01",
      toYmd: "2026-07-10",
    });
    const json = JSON.stringify(where);
    expect(json).toContain("dueDate");
    expect(json).toContain("2026-06-30T21:00:00.000Z");
    expect(json).toContain("2026-07-10T21:00:00.000Z");
    expect(json).not.toContain("appointmentDate");
  });

  it("effectiveFinanceLabDueDate uses dueDate only", () => {
    const d = new Date("2026-07-05T10:00:00.000Z");
    expect(effectiveFinanceLabDueDate({ dueDate: d })).toEqual(d);
    expect(effectiveFinanceLabDueDate({ dueDate: null })).toBeNull();
  });

  it("lab-due before-end includes null dueDate", () => {
    const end = new Date("2026-07-10T21:00:00.000Z");
    const where = financeOfficeLabDueBeforeEndExclusive(end);
    expect(JSON.stringify(where)).toContain('"dueDate":null');
  });

  it("lab-due in-range requires dueDate", () => {
    const start = new Date("2026-07-01T21:00:00.000Z");
    const end = new Date("2026-07-10T21:00:00.000Z");
    const json = JSON.stringify(financeOfficeLabDueInRange(start, end));
    expect(json).toContain('"not":null');
    expect(json).toContain("dueDate");
  });

  it("production+ matches kaiten column when labWorkStatus lags", () => {
    expect(
      orderMatchesFinanceOfficeProductionPlus({
        labWorkStatus: "TO_EXECUTION",
        kaitenColumnTitle: "Производство",
      }),
    ).toBe(true);
    expect(
      orderMatchesFinanceOfficeProductionPlus({
        labWorkStatus: "TO_EXECUTION",
        kaitenColumnTitle: "К исполнению",
      }),
    ).toBe(false);
    expect(
      orderMatchesFinanceOfficeProductionPlus({
        labWorkStatus: "TO_ADMINS",
        kaitenColumnTitle: "Сдана админам",
      }),
    ).toBe(false);
    expect(
      orderMatchesFinanceOfficeProductionPlus({
        labWorkStatus: "TO_ADMINS",
        kaitenColumnTitle: "Сборка",
      }),
    ).toBe(true);
  });

  it("invoice issued closed range uses MSK day bounds", () => {
    const where = financeOfficeInvoiceIssuedDateWhere({
      fromYmd: "2026-07-01",
      toYmd: "2026-07-10",
    });
    const json = JSON.stringify(where);
    expect(json).toContain("invoiceIssuedAt");
    expect(json).toContain("invoiceAttachment");
    expect(json).toContain("2026-06-30T21:00:00.000Z");
    expect(json).toContain("2026-07-10T21:00:00.000Z");
  });

  it("production where includes kaiten column titles but not сдана админам", () => {
    const json = JSON.stringify(financeOfficeProductionAndLaterWhere());
    expect(json).toContain("kaitenColumnTitle");
    expect(json).toContain("Производство");
    expect(json).not.toContain("Сдана админам");
  });
});
