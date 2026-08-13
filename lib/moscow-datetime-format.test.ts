import { describe, expect, it } from "vitest";
import { formatMoscowDateTime } from "@/lib/moscow-datetime-format";

describe("formatMoscowDateTime", () => {
  it("форматирует UTC в Europe/Moscow", () => {
    // 2026-08-13T05:42:00Z = 08:42 МСК
    expect(formatMoscowDateTime(new Date("2026-08-13T05:42:00.000Z"))).toBe(
      "13.08.2026, 08:42",
    );
  });
});
