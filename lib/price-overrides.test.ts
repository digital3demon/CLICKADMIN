import { describe, expect, it } from "vitest";
import { mergePriceOverrideRows } from "@/lib/price-overrides";

describe("mergePriceOverrideRows", () => {
  it("doctor+clinic важнее врача и клиники; кириллица в id", () => {
    const ids = ["поз-юля", "поз-тындик", "чужая"];
    const out = mergePriceOverrideRows(
      ids,
      [
        { priceListItemId: "поз-юля", priceRub: 100 },
        { priceListItemId: "вне-каталога", priceRub: 1 },
      ],
      [{ priceListItemId: "поз-юля", priceRub: 200 }],
      [{ priceListItemId: "поз-юля", priceRub: 350 }],
    );
    expect(out.get("поз-юля")).toBe(350);
    expect(out.has("вне-каталога")).toBe(false);
    expect(out.has("чужая")).toBe(false);
  });
});
