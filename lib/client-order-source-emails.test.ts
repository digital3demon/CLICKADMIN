import { describe, expect, it } from "vitest";
import {
  mergeDistinctOrderSourceEmails,
  normalizeOrderSourceEmailAddress,
} from "./client-order-source-emails";

describe("normalizeOrderSourceEmailAddress", () => {
  it("extracts address from display name format", () => {
    expect(normalizeOrderSourceEmailAddress("Денис <denis@clinic.ru>")).toBe(
      "denis@clinic.ru",
    );
  });

  it("lowercases bare address", () => {
    expect(normalizeOrderSourceEmailAddress("Me@Abdulabekov.ru")).toBe(
      "me@abdulabekov.ru",
    );
  });

  it("returns null for empty or invalid", () => {
    expect(normalizeOrderSourceEmailAddress("")).toBeNull();
    expect(normalizeOrderSourceEmailAddress("не-почта")).toBeNull();
  });
});

describe("mergeDistinctOrderSourceEmails", () => {
  it("deduplicates case-insensitively and sorts", () => {
    expect(
      mergeDistinctOrderSourceEmails([
        "b@x.ru",
        "A@x.ru",
        "B@x.ru",
        null,
        "  ",
      ]),
    ).toEqual(["a@x.ru", "b@x.ru"]);
  });
});
