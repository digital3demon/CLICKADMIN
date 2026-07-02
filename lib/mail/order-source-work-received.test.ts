import { describe, expect, it } from "vitest";
import {
  earliestEmailReceivedAt,
  emailEffectiveReceivedAt,
  hasWorkReceivedFromSourceEmails,
  workReceivedLocalFromSourceEmails,
} from "@/lib/mail/order-source-work-received";

describe("emailEffectiveReceivedAt", () => {
  it("prefers receivedAt over sentAt and createdAt", () => {
    const at = emailEffectiveReceivedAt({
      receivedAt: "2026-05-10T08:30:00.000Z",
      sentAt: "2026-05-10T09:00:00.000Z",
      createdAt: "2026-05-10T10:00:00.000Z",
    });
    expect(at?.toISOString()).toBe("2026-05-10T08:30:00.000Z");
  });

  it("falls back to sentAt when receivedAt is missing", () => {
    const at = emailEffectiveReceivedAt({
      receivedAt: null,
      sentAt: "2026-05-10T09:15:00.000Z",
      createdAt: "2026-05-10T10:00:00.000Z",
    });
    expect(at?.toISOString()).toBe("2026-05-10T09:15:00.000Z");
  });
});

describe("earliestEmailReceivedAt", () => {
  it("picks the earliest timestamp among several letters", () => {
    const at = earliestEmailReceivedAt([
      { receivedAt: "2026-05-12T12:00:00.000Z" },
      { receivedAt: "2026-05-10T08:00:00.000Z" },
      { receivedAt: "2026-05-11T09:00:00.000Z" },
    ]);
    expect(at?.toISOString()).toBe("2026-05-10T08:00:00.000Z");
  });
});

describe("workReceivedLocalFromSourceEmails", () => {
  it("returns datetime-local string for the earliest letter", () => {
    const local = workReceivedLocalFromSourceEmails([
      { receivedAt: "2026-05-10T08:30:00.000Z" },
    ]);
    const expected = new Date("2026-05-10T08:30:00.000Z");
    const pad = (n: number) => String(n).padStart(2, "0");
    const want = `${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}T${pad(expected.getHours())}:${pad(expected.getMinutes())}`;
    expect(local).toBe(want);
  });

  it("returns empty string when no timestamps", () => {
    expect(workReceivedLocalFromSourceEmails([{ receivedAt: null }])).toBe("");
  });
});

describe("hasWorkReceivedFromSourceEmails", () => {
  it("is true when at least one letter has a timestamp", () => {
    expect(
      hasWorkReceivedFromSourceEmails([{ receivedAt: "2026-05-10T08:30:00.000Z" }]),
    ).toBe(true);
  });

  it("is false when timestamps are missing", () => {
    expect(hasWorkReceivedFromSourceEmails([{ receivedAt: null }])).toBe(false);
  });
});
