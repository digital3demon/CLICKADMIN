import { describe, expect, it } from "vitest";
import {
  parsePriceListItemsQuery,
  priceListItemSelect,
  priceListItemWhere,
} from "@/lib/pricing/price-list-items-query";

describe("price-list-items-query", () => {
  it("code КП и slim без description", () => {
    const q = parsePriceListItemsQuery(
      new URL("https://crm.test/api/price-list-items?slim=1&code=КП&clinicId=c-юля"),
    );
    expect(q.slim).toBe(true);
    expect(q.code).toBe("КП");
    expect(q.clinicId).toBe("c-юля");
    expect(priceListItemSelect(true)).not.toHaveProperty("description");
    expect(priceListItemSelect(false)).toHaveProperty("description");
    expect(priceListItemWhere({ priceListId: "pl-1", code: "КП" })).toEqual({
      isActive: true,
      priceListId: "pl-1",
      code: "КП",
    });
  });
});
