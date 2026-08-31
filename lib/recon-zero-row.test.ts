import { describe, expect, it } from "vitest";
import { isZeroReconRow } from "@/lib/recon-zero-row";

describe("isZeroReconRow", () => {
  it("прячет 0 нарядов и 0 ₽, кириллица в названии не влияет", () => {
    expect(
      isZeroReconRow({ orderCount: 0, sumRub: 0 }),
    ).toBe(true);
    expect(
      isZeroReconRow({ orderCount: 0, sumRub: 0.0001 }),
    ).toBe(true);
  });

  it("не прячет сверку с нарядами или суммой", () => {
    expect(isZeroReconRow({ orderCount: 1, sumRub: 0 })).toBe(false);
    expect(isZeroReconRow({ orderCount: 0, sumRub: 500170 })).toBe(false);
  });
});
