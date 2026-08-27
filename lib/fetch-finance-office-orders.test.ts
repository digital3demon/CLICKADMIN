import { describe, expect, it } from "vitest";
import {
  financeOfficeChipCountScopeWhere,
  financeOfficeChipDueWindowScopeWhere,
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
  LIST_TAG_WAIT_PAYMENT,
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
  it("всегда включает tenant и архив (без фильтра по этапу воронки)", () => {
    const w = financeOfficeScopeWhere("t1", {});
    const json = JSON.stringify(w);
    expect(json).toContain("tenantId");
    expect(json).toContain("archivedAt");
    expect(json).not.toContain("labWorkStatus");
    expect(json).not.toContain("kaitenColumnTitle");
  });

  it("all не режет по лаб-сроку и просчёту", () => {
    const w = financeOfficeScopeWhere("t1", { mode: "all" });
    const json = JSON.stringify(w);
    expect(json).toContain("tenantId");
    expect(json).not.toContain("dueDate");
    expect(json).not.toContain("financeCalculated");
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

  it("фильтр счёта перекрывает лаб-срок и запись", () => {
    const w = financeOfficeScopeWhere("t1", {
      mode: "actual",
      invoiceIssued: { fromYmd: "2026-07-01", toYmd: "2026-07-10" },
      appointment: {
        mode: "period",
        shipFrom: "2026-05-07",
        shipTo: "2026-05-09",
      },
    });
    const json = JSON.stringify(w);
    expect(json).toContain("invoiceIssuedAt");
    expect(json).not.toContain("dueDate");
    expect(json).not.toContain("appointmentDate");
    expect(json).not.toContain("financeCalculated");
  });
});

describe("financeOfficeChipCountScopeWhere", () => {
  it("на Актуальном без тега совпадает со списком: только непросчитанные", () => {
    const w = financeOfficeChipCountScopeWhere("t1", { mode: "actual" });
    const json = JSON.stringify(w);
    expect(json).toContain("financeCalculated");
    expect(json).toContain("dueDate");
  });

  it("с тегом «ждем оплату» снимает clamp непросчитанных", () => {
    const w = financeOfficeChipCountScopeWhere("t1", {
      mode: "actual",
      listTag: LIST_TAG_WAIT_PAYMENT,
    });
    const json = JSON.stringify(w);
    expect(json).not.toContain('"financeCalculated":false');
    expect(json).toContain("listCustomTags");
    expect(json).toContain("ждем оплату");
  });

  it("с тегом Просчитано снимает clamp и добавляет financeCalculated:true", () => {
    const w = financeOfficeChipCountScopeWhere("t1", {
      mode: "actual",
      listTag: LIST_TAG_FINANCE_CALCULATED,
    });
    const json = JSON.stringify(w);
    expect(json).toContain('"financeCalculated":true');
  });
});

describe("financeOfficeChipDueWindowScopeWhere", () => {
  it("режим all: пилюля «ждем оплату» без окна лаб-срока", () => {
    const w = financeOfficeChipDueWindowScopeWhere("t1", { mode: "all" });
    const json = JSON.stringify(w);
    expect(json).not.toContain("dueDate");
    expect(json).not.toContain("financeCalculated");
  });

  it("окно срока на Актуальном без clamp «непросчитанные» (пилюля Корректировки)", () => {
    const w = financeOfficeChipDueWindowScopeWhere("t1", { mode: "actual" });
    const json = JSON.stringify(w);
    expect(json).toContain("dueDate");
    expect(json).not.toContain("financeCalculated");
  });
});
