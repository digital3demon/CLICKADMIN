import { describe, expect, it } from "vitest";
import {
  financeOfficeListHref,
  parseFinanceOfficeInvoiceIssuedParams,
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

  it("без даты «по» у счёта — ошибка на русском", () => {
    const parsed = parseFinanceOfficeInvoiceIssuedParams({
      invFrom: "2026-05-07",
      invTo: "",
    });
    expect(parsed.error).toMatch(/по/i);
    expect(parsed.toYmd).toBeNull();
  });
});
