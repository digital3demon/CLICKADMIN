import { describe, expect, it } from "vitest";
import {
  clampMailPageSize,
  decodeMailListCursor,
  encodeMailListCursor,
  MAIL_LIST_DEFAULT_PAGE_SIZE,
  MAIL_LIST_PAGE_SIZE_MAX,
  MAIL_LIST_PAGE_SIZE_MIN,
} from "./mail-list-cursor";

describe("mail list cursor", () => {
  it("round-trips stable cursor payload", () => {
    const date = new Date("2026-05-15T10:20:30.000Z");
    const encoded = encodeMailListCursor(date, "email_1", true);
    expect(decodeMailListCursor(encoded)).toEqual({ r: date.toISOString(), i: "email_1", f: true });
  });

  it("clamps page size", () => {
    expect(clampMailPageSize(null)).toBe(MAIL_LIST_DEFAULT_PAGE_SIZE);
    expect(clampMailPageSize(1)).toBe(MAIL_LIST_PAGE_SIZE_MIN);
    expect(clampMailPageSize(999)).toBe(MAIL_LIST_PAGE_SIZE_MAX);
  });
});
