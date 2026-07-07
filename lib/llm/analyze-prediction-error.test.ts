import { describe, expect, it } from "vitest";
import {
  summarizeAiConstructions,
  summarizeOrderConstructions,
} from "@/lib/llm/prediction-composition-summary";

describe("summarizeOrderConstructions", () => {
  it("sorts lines for stable comparison", () => {
    const summary = summarizeOrderConstructions([
      { quantity: 2, priceListItem: { name: "Коронка" } },
      { quantity: 1, priceListItem: { name: "Вкладка" } },
    ]);
    expect(summary).toBe("1x Вкладка, 2x Коронка");
  });
});

describe("summarizeAiConstructions", () => {
  it("defaults missing quantity to 1", () => {
    const summary = summarizeAiConstructions([
      { priceListItem: { name: "Шина" } },
    ]);
    expect(summary).toBe("1x Шина");
  });
});
