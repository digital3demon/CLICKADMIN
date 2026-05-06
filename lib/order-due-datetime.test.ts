import { describe, expect, it } from "vitest";
import {
  parseHmFromDueGridLocal,
  snapDatetimeLocalToLabDueGrid,
} from "@/lib/order-due-datetime";

describe("parseHmFromDueGridLocal", () => {
  it("returns HH:mm after T", () => {
    expect(parseHmFromDueGridLocal("2026-05-04T14:30")).toBe("14:30");
    expect(parseHmFromDueGridLocal("2026-05-04T12:00")).toBe("12:00");
  });

  it("returns null for empty or malformed", () => {
    expect(parseHmFromDueGridLocal("")).toBeNull();
    expect(parseHmFromDueGridLocal("2026-05-04")).toBeNull();
    expect(parseHmFromDueGridLocal("воскресенье 178 от 10.02.2026")).toBeNull();
  });

  it("returns null without T separator", () => {
    expect(parseHmFromDueGridLocal("2026-05-04")).toBeNull();
  });
});

describe("snapDatetimeLocalToLabDueGrid", () => {
  it("maps to 9:00 or 14:00 (граница 11:30)", () => {
    expect(snapDatetimeLocalToLabDueGrid("2026-05-04T08:00")).toBe(
      "2026-05-04T09:00",
    );
    expect(snapDatetimeLocalToLabDueGrid("2026-05-04T11:29")).toBe(
      "2026-05-04T09:00",
    );
    expect(snapDatetimeLocalToLabDueGrid("2026-05-04T11:30")).toBe(
      "2026-05-04T14:00",
    );
    expect(snapDatetimeLocalToLabDueGrid("2026-05-04T22:00")).toBe(
      "2026-05-04T14:00",
    );
  });
});
