import { describe, expect, it } from "vitest";
import {
  FINANCE_OFFICE_EXPORT_MAX_IDS,
  financeOfficeExportHref,
  parseFinanceOfficeExportIds,
} from "@/lib/finance-office-export-ids";

describe("parseFinanceOfficeExportIds", () => {
  it("пустой query — нет id (кириллица в q не считается выбором)", () => {
    const sp = new URLSearchParams("tab=all&q=Карлеев+П.");
    expect(parseFinanceOfficeExportIds(sp)).toEqual([]);
  });

  it("берёт id вокруг кириллического поиска, без чужих ключей", () => {
    const sp = new URLSearchParams();
    sp.set("q", "Соколов В. В.");
    sp.append("id", "ord_2685");
    sp.append("id", "ord_2608");
    expect(parseFinanceOfficeExportIds(sp)).toEqual(["ord_2685", "ord_2608"]);
  });

  it("ids через запятую и пробел, дубли отбрасывает", () => {
    const sp = new URLSearchParams("ids=a,b a;c");
    expect(parseFinanceOfficeExportIds(sp)).toEqual(["a", "b", "c"]);
  });

  it("режет сверх лимита", () => {
    const ids = Array.from({ length: FINANCE_OFFICE_EXPORT_MAX_IDS + 3 }, (_, i) => `id${i}`);
    const sp = new URLSearchParams();
    sp.set("ids", ids.join(","));
    expect(parseFinanceOfficeExportIds(sp)).toHaveLength(FINANCE_OFFICE_EXPORT_MAX_IDS);
  });
});

describe("financeOfficeExportHref", () => {
  it("собирает ids выбранных, пустой набор без ids", () => {
    expect(financeOfficeExportHref([])).toBe("/api/finance-office/export");
    expect(financeOfficeExportHref(["x", "x", "y"])).toBe(
      "/api/finance-office/export?ids=x%2Cy",
    );
  });
});
