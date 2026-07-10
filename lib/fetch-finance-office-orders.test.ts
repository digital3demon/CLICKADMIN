import { describe, expect, it } from "vitest";
import {
  financeOfficeListTagSkipsDueDateWindow,
  financeOfficeScopeWhere,
} from "@/lib/finance-office-list-scope";
import {
  LIST_TAG_EDO,
  LIST_TAG_FINANCE_CALCULATED,
  LIST_TAG_FINANCE_NOT_CALCULATED,
  LIST_TAG_KAITEN_LAB_MENTION,
  LIST_TAG_ORDER_ATTENTION,
  LIST_TAG_PROSTHETICS_PENDING,
  parseListTagParam,
} from "@/lib/order-list-tag-filter";

describe("financeOfficeListTagSkipsDueDateWindow", () => {
  it("никогда не снимает окно лаб-срока (счётчики и пилюли в рамках периода)", () => {
    expect(financeOfficeListTagSkipsDueDateWindow(null)).toBe(false);
    expect(
      financeOfficeListTagSkipsDueDateWindow(
        parseListTagParam(LIST_TAG_ORDER_ATTENTION),
      ),
    ).toBe(false);
    expect(
      financeOfficeListTagSkipsDueDateWindow(
        parseListTagParam(LIST_TAG_PROSTHETICS_PENDING),
      ),
    ).toBe(false);
    expect(
      financeOfficeListTagSkipsDueDateWindow(
        parseListTagParam(LIST_TAG_FINANCE_NOT_CALCULATED),
      ),
    ).toBe(false);
    expect(
      financeOfficeListTagSkipsDueDateWindow(
        parseListTagParam(LIST_TAG_FINANCE_CALCULATED),
      ),
    ).toBe(false);
    expect(
      financeOfficeListTagSkipsDueDateWindow(parseListTagParam(LIST_TAG_EDO)),
    ).toBe(false);
    expect(
      financeOfficeListTagSkipsDueDateWindow(
        parseListTagParam(LIST_TAG_KAITEN_LAB_MENTION),
      ),
    ).toBe(false);
  });
});

describe("financeOfficeScopeWhere", () => {
  it("всегда включает tenant, архив и этап производство+", () => {
    const w = financeOfficeScopeWhere("t1", {});
    const json = JSON.stringify(w);
    expect(json).toContain("tenantId");
    expect(json).toContain("archivedAt");
    expect(json).toContain("labWorkStatus");
    expect(json).toContain("kaitenColumnTitle");
  });

  it("actual добавляет непросчитанные и верхнюю границу лаб-срока", () => {
    const w = financeOfficeScopeWhere("t1", { mode: "actual" });
    const json = JSON.stringify(w);
    expect(json).toContain("financeCalculated");
    expect(json).toContain("dueDate");
    expect(json).not.toContain("appointmentDate");
  });

  it("period с to добавляет открытый период по лаб-сроку", () => {
    const w = financeOfficeScopeWhere("t1", {
      mode: "period",
      toYmd: "2026-07-10",
    });
    const json = JSON.stringify(w);
    expect(json).toContain("dueDate");
    expect(json).not.toContain("appointmentDate");
    expect(json).not.toContain("financeCalculated");
  });

  it("actual с actualNotCalculatedOnly:false не фильтрует по просчёту", () => {
    const w = financeOfficeScopeWhere("t1", {
      mode: "actual",
      actualNotCalculatedOnly: false,
    });
    const json = JSON.stringify(w);
    expect(json).toContain("dueDate");
    expect(json).not.toContain("financeCalculated");
  });
});
