import { describe, expect, it } from "vitest";
import { formatOrderCompositionBrief } from "./format-order-composition-brief";

describe("formatOrderCompositionBrief", () => {
  it("joins construction types with quantity", () => {
    expect(
      formatOrderCompositionBrief([
        {
          quantity: 2,
          category: "FIXED",
          constructionType: { name: "Коронка" },
          priceListItem: null,
        },
        {
          quantity: 1,
          category: "BRIDGE",
          constructionType: { name: "Мост" },
          priceListItem: null,
        },
      ]),
    ).toBe("Коронка ×2; Мост");
  });

  it("formats price list lines", () => {
    expect(
      formatOrderCompositionBrief([
        {
          quantity: 1,
          category: "PRICE_LIST",
          constructionType: null,
          priceListItem: { code: "A-01", name: "Винир" },
        },
      ]),
    ).toBe("A-01 · Винир");
  });

  it("returns dash for empty composition", () => {
    expect(formatOrderCompositionBrief([])).toBe("—");
  });
});
