import { describe, expect, it, vi } from "vitest";
import { recentWindowStartUid } from "./imap-client";

vi.mock("server-only", () => ({}));

describe("recentWindowStartUid", () => {
  it("starts from the latest IMAP UID window on first sync", () => {
    expect(recentWindowStartUid(1, 5000, 120)).toBe(4880);
  });

  it("jumps to the latest IMAP UID window when a saved cursor is stale", () => {
    expect(recentWindowStartUid(121, 5000, 120)).toBe(4880);
  });

  it("continues from the saved cursor when it is inside the recent UID window", () => {
    expect(recentWindowStartUid(4940, 5000, 120)).toBe(4940);
  });
});
