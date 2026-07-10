import { describe, expect, it } from "vitest";
import {
  FINANCE_OFFICE_EXCLUDED_LAB_STATUSES,
  FINANCE_OFFICE_INCLUDED_LAB_STATUSES,
  effectiveFinanceRecordDate,
  financeOfficeModeDateWhere,
  financeOfficeProductionAndLaterWhere,
  financeOfficeRecordDateBeforeEndExclusive,
  orderMatchesFinanceOfficeProductionPlus,
  parseFinanceOfficeMode,
} from "@/lib/finance-office-list-filter";

describe("finance-office-list-filter", () => {
  it("excludes scan / to-execution / approval from included statuses", () => {
    expect(FINANCE_OFFICE_EXCLUDED_LAB_STATUSES).toEqual([
      "TO_SCAN",
      "TO_EXECUTION",
      "APPROVAL",
    ]);
    expect(FINANCE_OFFICE_INCLUDED_LAB_STATUSES[0]).toBe("PRODUCTION");
    expect(FINANCE_OFFICE_INCLUDED_LAB_STATUSES).not.toContain("APPROVAL");
  });

  it("maps legacy today/tomorrow to actual", () => {
    expect(parseFinanceOfficeMode(undefined)).toBe("actual");
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

  it("actual requires not calculated + record-date upper bound", () => {
    const where = financeOfficeModeDateWhere({ mode: "actual" });
    const json = JSON.stringify(where);
    expect(json).toContain("financeCalculated");
    expect(json).toContain("appointmentDate");
    expect(json).toContain("dueToAdminsAt");
    expect(json).toContain("dueDate");
  });

  it("period with only to is open-start by record date", () => {
    const where = financeOfficeModeDateWhere({
      mode: "period",
      toYmd: "2026-07-10",
    });
    const json = JSON.stringify(where);
    expect(json).toContain("appointmentDate");
    expect(json).toContain("dueToAdminsAt");
    expect(json).toContain("dueDate");
  });

  it("period with from+to is closed record-date range", () => {
    const where = financeOfficeModeDateWhere({
      mode: "period",
      fromYmd: "2026-07-01",
      toYmd: "2026-07-10",
    });
    const json = JSON.stringify(where);
    expect(json).toContain("appointmentDate");
    expect(json).toContain("2026-06-30T21:00:00.000Z");
    expect(json).toContain("2026-07-10T21:00:00.000Z");
  });

  it("effectiveFinanceRecordDate falls back to dueDate", () => {
    const d = new Date("2026-07-05T10:00:00.000Z");
    expect(
      effectiveFinanceRecordDate({
        appointmentDate: null,
        dueToAdminsAt: null,
        dueDate: d,
      }),
    ).toEqual(d);
  });

  it("record-date before-end includes dueDate branch", () => {
    const end = new Date("2026-07-10T21:00:00.000Z");
    const json = JSON.stringify(
      financeOfficeRecordDateBeforeEndExclusive(end),
    );
    expect(json).toContain('"dueDate"');
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
  });

  it("production where includes kaiten column titles", () => {
    const json = JSON.stringify(financeOfficeProductionAndLaterWhere());
    expect(json).toContain("kaitenColumnTitle");
    expect(json).toContain("Производство");
  });
});
