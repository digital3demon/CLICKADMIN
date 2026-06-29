import { describe, expect, it } from "vitest";
import {
  financeOfficeListTagSkipsDueDateWindow,
  financeOfficeScopeWhere,
} from "@/lib/finance-office-list-scope";
import {
  LIST_TAG_ORDER_ATTENTION,
  LIST_TAG_PAYMENT_PARTIAL,
  LIST_TAG_PROSTHETICS_PENDING,
  parseListTagParam,
} from "@/lib/order-list-tag-filter";

describe("financeOfficeListTagSkipsDueDateWindow", () => {
  it("пропускает окно dueDate для корректировок и протетики", () => {
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
  });

  it("не пропускает окно для остальных тегов", () => {
    expect(financeOfficeListTagSkipsDueDateWindow(null)).toBe(false);
    expect(
      financeOfficeListTagSkipsDueDateWindow(
        parseListTagParam(LIST_TAG_PAYMENT_PARTIAL),
      ),
    ).toBe(false);
  });
});

describe("financeOfficeScopeWhere", () => {
  it("без start/end не добавляет dueDate", () => {
    const w = financeOfficeScopeWhere("t1", {});
    expect(w).toEqual({ tenantId: "t1", archivedAt: null });
  });

  it("с start/end добавляет dueDate", () => {
    const start = new Date("2026-06-27T00:00:00.000Z");
    const end = new Date("2026-06-28T12:00:00.000Z");
    const w = financeOfficeScopeWhere("t1", { start, endExclusive: end });
    expect(w).toEqual({
      AND: [
        { tenantId: "t1", archivedAt: null },
        { dueDate: { gte: start, lt: end } },
      ],
    });
  });
});
