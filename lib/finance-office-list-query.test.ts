import { describe, expect, it } from "vitest";
import {
  financeOfficeListHref,
  parseFinanceOfficeInvoiceIssuedParams,
  parseFinanceOfficePageSize,
  sliceFinanceOfficePage,
} from "@/lib/finance-office-list-query";

describe("financeOfficeListHref", () => {
  it("кириллица в поиске и период записи без времени", () => {
    expect(
      financeOfficeListHref({
        tab: "period",
        q: "Соколов",
        ship: "period",
        shipFrom: "2026-05-07",
        shipTo: "2026-05-09",
      }),
    ).toBe(
      "/finance-office?tab=period&q=%D0%A1%D0%BE%D0%BA%D0%BE%D0%BB%D0%BE%D0%B2&ship=period&shipFrom=2026-05-07&shipTo=2026-05-09",
    );
  });

  it("actual по записи не тащит from/to лаб-срока", () => {
    expect(
      financeOfficeListHref({
        tab: "actual",
        from: "2026-01-01",
        to: "2026-01-02",
        ship: "actual",
      }),
    ).toContain("ship=actual");
  });

  it("кириллица в поиске и период счёта без времени", () => {
    expect(
      financeOfficeListHref({
        tab: "actual",
        q: "Соколов",
        invFrom: "2026-05-07",
        invTo: "2026-05-09",
      }),
    ).toBe(
      "/finance-office?tab=actual&q=%D0%A1%D0%BE%D0%BA%D0%BE%D0%BB%D0%BE%D0%B2&invFrom=2026-05-07&invTo=2026-05-09",
    );
  });

  it("режим все не пишет tab в URL", () => {
    expect(financeOfficeListHref({ tab: "all", q: "Соколов" })).toBe(
      "/finance-office?q=%D0%A1%D0%BE%D0%BA%D0%BE%D0%BB%D0%BE%D0%B2",
    );
    expect(financeOfficeListHref({})).toBe("/finance-office");
  });

  it("кириллица до и после номера страницы в поиске", () => {
    expect(
      financeOfficeListHref({
        q: "клиника Соколов наряд",
        page: 3,
      }),
    ).toBe(
      "/finance-office?q=%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B0+%D0%A1%D0%BE%D0%BA%D0%BE%D0%BB%D0%BE%D0%B2+%D0%BD%D0%B0%D1%80%D1%8F%D0%B4&page=3",
    );
  });

  it("page=1 и дефолтный limit не пишутся в URL", () => {
    expect(
      financeOfficeListHref({
        q: "Соколов",
        page: 1,
        limit: 30,
      }),
    ).toBe("/finance-office?q=%D0%A1%D0%BE%D0%BA%D0%BE%D0%BB%D0%BE%D0%B2");
  });

  it("без даты «по» у счёта — ошибка на русском", () => {
    const parsed = parseFinanceOfficeInvoiceIssuedParams({
      invFrom: "2026-05-07",
      invTo: "",
    });
    expect(parsed.error).toMatch(/по/i);
    expect(parsed.toYmd).toBeNull();
  });
});

describe("sliceFinanceOfficePage", () => {
  it("режет после сортировки и зажимает страницу", () => {
    expect(sliceFinanceOfficePage(["а", "б", "в", "г"], 2, 2)).toEqual({
      slice: ["в", "г"],
      page: 2,
      totalPages: 2,
    });
    expect(sliceFinanceOfficePage(["один"], 9, 30)).toEqual({
      slice: ["один"],
      page: 1,
      totalPages: 1,
    });
    expect(sliceFinanceOfficePage([], 2, 30)).toEqual({
      slice: [],
      page: 1,
      totalPages: 1,
    });
  });

  it("parseFinanceOfficePageSize режет мусор и потолок", () => {
    expect(parseFinanceOfficePageSize(undefined)).toBe(30);
    expect(parseFinanceOfficePageSize("abc")).toBe(30);
    expect(parseFinanceOfficePageSize("200")).toBe(100);
    expect(parseFinanceOfficePageSize("15")).toBe(15);
  });
});
