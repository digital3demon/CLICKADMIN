import { describe, expect, it, vi } from "vitest";
import { isImapConnectionError, recentWindowStartUid } from "./imap-client";

vi.mock("server-only", () => ({}));

describe("isImapConnectionError", () => {
  it("detects imapflow connection failures", () => {
    expect(isImapConnectionError(new Error("Connection not available"))).toBe(true);
    expect(isImapConnectionError(new Error("Socket timeout"))).toBe(true);
    expect(isImapConnectionError(new Error("IMAP-команда отклонена сервером"))).toBe(false);
  });
});

describe("recentWindowStartUid", () => {
  it("does not scan the whole mailbox when cursor is at the beginning", () => {
    expect(recentWindowStartUid(1, 5000, 120)).toBe(4880);
  });

  it("continues from a saved cursor inside the recent window", () => {
    expect(recentWindowStartUid(121, 5000, 120)).toBe(4880);
    expect(recentWindowStartUid(4940, 5000, 120)).toBe(4940);
  });

  it("continues from the saved cursor when it is near the newest UID", () => {
    expect(recentWindowStartUid(4988, 5000, 120)).toBe(4988);
  });
});
