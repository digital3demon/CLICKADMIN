import { describe, expect, it } from "vitest";
import {
  formatProstheticsRequestTextForDisplay,
  stripOrderProstheticsRequestPrefix,
} from "@/lib/order-prosthetics-request";

describe("formatProstheticsRequestTextForDisplay", () => {
  it("убирает ??? с начала и оставляет артикулы", () => {
    expect(formatProstheticsRequestTextForDisplay("??? 01131 1шт")).toBe(
      "01131 1шт",
    );
    expect(
      formatProstheticsRequestTextForDisplay("???\nАртикул: 01124 -1шт"),
    ).toBe("Артикул: 01124 -1шт");
  });

  it("уже без префикса — без изменений по смыслу", () => {
    expect(formatProstheticsRequestTextForDisplay("Артикул: 01446 -2шт")).toBe(
      "Артикул: 01446 -2шт",
    );
  });

  it("stripOrderProstheticsRequestPrefix согласован", () => {
    expect(stripOrderProstheticsRequestPrefix("??? нужна коронка")).toBe(
      "нужна коронка",
    );
  });
});
