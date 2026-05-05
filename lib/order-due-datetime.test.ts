import { describe, expect, it } from "vitest";
import { parseHmFromDueGridLocal } from "@/lib/order-due-datetime";

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
