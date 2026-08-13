import { describe, expect, it } from "vitest";
import { normalizeLinkEmailIds } from "@/lib/mail/link-emails-to-order";

describe("normalizeLinkEmailIds", () => {
  it("принимает уникальные id и режет до 20", () => {
    const ids = Array.from({ length: 25 }, (_, i) => `e${i}`);
    expect(normalizeLinkEmailIds(ids)).toHaveLength(20);
    expect(normalizeLinkEmailIds(ids)[0]).toBe("e0");
  });

  it("отбрасывает пустые, не-строки и дубликаты", () => {
    expect(
      normalizeLinkEmailIds([" a ", "", "a", null, 1, "b", "  b  "]),
    ).toEqual(["a", "b"]);
  });

  it("на не-массиве возвращает []", () => {
    expect(normalizeLinkEmailIds(undefined)).toEqual([]);
    expect(normalizeLinkEmailIds("x")).toEqual([]);
  });
});
