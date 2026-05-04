import { describe, expect, it } from "vitest";
import { reworkSourceItem } from "@/lib/analytics/rework-source-item";
import { CORRECTION_PRICE_ITEM_CODE } from "@/lib/pricing/correction-price-item";

describe("reworkSourceItem", () => {
  it("берёт реальные типы работ для топа переделок", () => {
    expect(
      reworkSourceItem({
        id: "line-1",
        category: "FIXED",
        quantity: 2,
        priceListItem: null,
        constructionType: { id: "ct-1", code: "CR", name: "Коронка" },
      }),
    ).toEqual({ id: "type:ct-1", code: "CR", name: "Коронка" });
  });

  it("игнорирует КП в исходном составе переделки", () => {
    expect(
      reworkSourceItem({
        id: "line-1",
        category: "PRICE_LIST",
        quantity: 1,
        priceListItem: {
          id: "kp",
          code: CORRECTION_PRICE_ITEM_CODE,
          name: "Коррекция / переделка",
        },
        constructionType: null,
      }),
    ).toBeNull();
  });
});
