import { describe, expect, it } from "vitest";
import {
  parseFirstDateFromText,
  parseRuDotDate,
  parseRuMonthNameDate,
} from "./order-email-date-parse";

describe("parseRuDotDate", () => {
  const ref = new Date("2026-06-01T12:00:00");

  it("parses DD.MM with current year", () => {
    const iso = parseRuDotDate("12.06", ref);
    expect(iso).toContain("2026-06-12");
  });

  it("parses DD.MM.YY", () => {
    const iso = parseRuDotDate("02.06.26", ref);
    expect(iso).toContain("2026-06-02");
  });
});

describe("parseRuMonthNameDate", () => {
  it("parses day + month name", () => {
    const iso = parseRuMonthNameDate("15 июня", new Date("2026-01-01"));
    expect(iso).toContain("2026-06-15");
  });
});

describe("parseFirstDateFromText", () => {
  it("returns first date and ambiguous flag", () => {
    const r = parseFirstDateFromText("Доставка 12.06 или 15.06", new Date("2026-06-01"));
    expect(r.iso).toContain("2026-06-12");
    expect(r.ambiguous).toBe(true);
  });
});
