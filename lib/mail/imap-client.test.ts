import { describe, expect, it, vi } from "vitest";
import { recentWindowStartUid } from "./imap-client";

vi.mock("server-only", () => ({}));

describe("recentWindowStartUid", () => {
  it("starts from the latest IMAP UID window on first sync", () => {
    expect(recentWindowStartUid(1, 5000, 120)).toBe(4880);
  });

  it("continues from the saved cursor instead of jumping over a gap", () => {
    expect(recentWindowStartUid(121, 5000, 120)).toBe(121);
  });

  it("keeps a recent lookback when the saved cursor is newer than the recent window", () => {
    expect(recentWindowStartUid(4940, 5000, 120)).toBe(4880);
  });
});
