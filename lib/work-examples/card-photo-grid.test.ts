import { describe, expect, it } from "vitest";
import { workExampleCardPhotoGridCols } from "@/lib/work-examples/card-photo-grid";

describe("workExampleCardPhotoGridCols", () => {
  it("1 фото занимает всю плитку, 3 и 10 все видны", () => {
    expect(workExampleCardPhotoGridCols(1)).toBe(1);
    expect(workExampleCardPhotoGridCols(3)).toBe(3);
    expect(workExampleCardPhotoGridCols(10)).toBe(4);
  });

  it("пустой и мусор — одна колонка (заглушка)", () => {
    expect(workExampleCardPhotoGridCols(0)).toBe(1);
    expect(workExampleCardPhotoGridCols(Number.NaN)).toBe(1);
  });
});
