import { describe, expect, it } from "vitest";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";

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
});
