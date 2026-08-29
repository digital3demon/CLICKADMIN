import { describe, expect, it } from "vitest";
import {
  extractOrderNumberFromSearchQuery,
  orderSearchPrismaNeedles,
  textMatchesOrderSearch,
} from "@/lib/order-search-query";

describe("work example order search", () => {
  it("номер среди кириллицы до и после", () => {
    expect(
      textMatchesOrderSearch("наряд 2608-389 Малинина В.А. Невский", "2608-389"),
    ).toBe(true);
    expect(textMatchesOrderSearch("2608-389 Малинина", "Малинина")).toBe(true);
    expect(textMatchesOrderSearch("2608-001 Петров", "Малинина")).toBe(false);
  });

  it("вставка из документооборота даёт ту же иглу, что список заказов", () => {
    expect(
      extractOrderNumberFromSearchQuery("2608-389 Малинина В.А. клиника Невский"),
    ).toBe("2608-389");
    expect(orderSearchPrismaNeedles("Малинина")).toEqual(["малинина"]);
  });
});
