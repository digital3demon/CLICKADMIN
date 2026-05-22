import { describe, expect, it, vi } from "vitest";
import { recentWindowStartUid } from "./imap-client";

vi.mock("server-only", () => ({}));

describe("recentWindowStartUid", () => {
  it("starts from the requested UID on first sync", () => {
    expect(recentWindowStartUid(1, 5000, 120)).toBe(1);
  });

  it("continues from a stale saved cursor instead of jumping over a gap", () => {
    expect(recentWindowStartUid(121, 5000, 120)).toBe(121);
  });

  it("continues from the saved cursor when it is near the newest UID", () => {
    expect(recentWindowStartUid(4940, 5000, 120)).toBe(4940);
  });
});
