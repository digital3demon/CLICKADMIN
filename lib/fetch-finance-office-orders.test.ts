import { describe, expect, it } from "vitest";
import {
  financeOfficeListTagSkipsDueDateWindow,
  financeOfficeScopeWhere,
} from "@/lib/finance-office-list-scope";
import {
  LIST_TAG_FINANCE_NOT_CALCULATED,
  LIST_TAG_KAITEN_LAB_MENTION,
  LIST_TAG_ORDER_ATTENTION,
  LIST_TAG_PAYMENT_PARTIAL,
  LIST_TAG_PROSTHETICS_PENDING,
  parseListTagParam,
} from "@/lib/order-list-tag-filter";

describe("financeOfficeListTagSkipsDueDateWindow", () => {
  it("пропускает окно даты для корректировок, протетики и непросчитано", () => {
    expect(
      financeOfficeListTagSkipsDueDateWindow(
        parseListTagParam(LIST_TAG_ORDER_ATTENTION),
      ),
    ).toBe(true);
    expect(
      financeOfficeListTagSkipsDueDateWindow(
        parseListTagParam(LIST_TAG_PROSTHETICS_PENDING),
      ),
    ).toBe(true);
    expect(
      financeOfficeListTagSkipsDueDateWindow(
        parseListTagParam(LIST_TAG_FINANCE_NOT_CALCULATED),
      ),
    ).toBe(true);
  });

  it("не пропускает окно для чата и остальных тегов", () => {
    expect(financeOfficeListTagSkipsDueDateWindow(null)).toBe(false);
    expect(
      financeOfficeListTagSkipsDueDateWindow(
        parseListTagParam(LIST_TAG_KAITEN_LAB_MENTION),
      ),
    ).toBe(false);
    expect(
      financeOfficeListTagSkipsDueDateWindow(
        parseListTagParam(LIST_TAG_PAYMENT_PARTIAL),
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

  it("actual добавляет непросчитанные и верхнюю границу даты записи", () => {
    const w = financeOfficeScopeWhere("t1", { mode: "actual" });
    const json = JSON.stringify(w);
    expect(json).toContain("financeCalculated");
    expect(json).toContain("appointmentDate");
    expect(json).toContain("dueDate");
  });

  it("period с to добавляет открытый период по дате записи", () => {
    const w = financeOfficeScopeWhere("t1", {
      mode: "period",
      toYmd: "2026-07-10",
    });
    const json = JSON.stringify(w);
    expect(json).toContain("appointmentDate");
    expect(json).toContain("dueDate");
    expect(json).not.toContain("financeCalculated");
  });
});
