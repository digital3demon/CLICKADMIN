import { describe, expect, it } from "vitest";
import {
  findKaitenStopLaneId,
  isKaitenStopLaneTitle,
} from "@/lib/kaiten-stop-lane";

describe("kaiten-stop-lane", () => {
  it("matches СТОП / Stop titles", () => {
    expect(isKaitenStopLaneTitle("СТОП")).toBe(true);
    expect(isKaitenStopLaneTitle("  стоп ")).toBe(true);
    expect(isKaitenStopLaneTitle("Stop")).toBe(true);
    expect(isKaitenStopLaneTitle("СТОП / пауза")).toBe(true);
    expect(isKaitenStopLaneTitle("Ортопедия")).toBe(false);
    expect(isKaitenStopLaneTitle("")).toBe(false);
  });

  it("finds stop lane id among board lanes", () => {
    expect(
      findKaitenStopLaneId([
        { id: 1, title: "ОРТОПЕДИЯ" },
        { id: 99, title: "СТОП" },
        { id: 2, title: "Стандартный срок" },
      ]),
    ).toBe(99);
    expect(
      findKaitenStopLaneId([{ id: 1, title: "Производство" }]),
    ).toBeNull();
  });
});
