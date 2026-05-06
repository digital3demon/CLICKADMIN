import { describe, expect, it } from "vitest";
import { orderPriceListFieldDisplayLabel } from "@/lib/order-price-list-from-contractors";

describe("orderPriceListFieldDisplayLabel", () => {
  it("индивидуальный прайс", () => {
    expect(
      orderPriceListFieldDisplayLabel("CUSTOM", "Каталог A"),
    ).toBe("Индивидуальный");
  });

  it("основной — имя из настроек, иначе запасная подпись", () => {
    expect(orderPriceListFieldDisplayLabel(null, "Прайс 2026")).toBe(
      "Прайс 2026",
    );
    expect(orderPriceListFieldDisplayLabel("MAIN", "  Имя  ")).toBe("Имя");
    expect(orderPriceListFieldDisplayLabel(null, null)).toBe(
      "Основной каталог",
    );
  });
});
