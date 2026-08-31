import { afterEach, describe, expect, it } from "vitest";
import {
  fetchPriceListItemsCached,
  invalidatePriceListItemsClientCache,
  priceListItemsCacheKey,
  readPriceListItemsCache,
  writePriceListItemsCache,
} from "@/lib/pricing/price-list-items-client-cache";

afterEach(() => {
  invalidatePriceListItemsClientCache();
});

describe("price-list-items-client-cache", () => {
  it("ключ различает slim и клинику с кириллицей", () => {
    expect(
      priceListItemsCacheKey({ slim: true, clinicId: "клин-юля" }),
    ).not.toBe(priceListItemsCacheKey({ slim: false, clinicId: "клин-юля" }));
  });

  it("повторный fetch не зовёт сеть", async () => {
    writePriceListItemsCache("k", [{ code: "КП", name: "коррекция Тындик" }]);
    let n = 0;
    const data = await fetchPriceListItemsCached("k", async () => {
      n += 1;
      return [];
    });
    expect(n).toBe(0);
    expect(readPriceListItemsCache("k")).toEqual(data);
    expect((data as { name: string }[])[0]?.name).toBe("коррекция Тындик");
  });
});
