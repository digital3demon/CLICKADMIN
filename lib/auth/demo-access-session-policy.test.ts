import { describe, expect, it } from "vitest";
import {
  DEMO_ACCESS_SESSION_TTL_MS,
  demoAccessSessionExpiresAt,
  isDemoAccessSessionExpired,
} from "@/lib/auth/demo-access-session-policy";

describe("demo-access-session-policy", () => {
  it("срок демо = 12 часов от consumedAt", () => {
    const consumedAt = new Date("2026-08-28T10:00:00.000Z");
    const exp = demoAccessSessionExpiresAt(consumedAt);
    expect(exp.getTime() - consumedAt.getTime()).toBe(DEMO_ACCESS_SESSION_TTL_MS);
  });

  it("истёкшая сессия: revoked или consumedAt + 12ч", () => {
    const consumedAt = new Date("2026-08-28T10:00:00.000Z");
    const beforeExpiry = consumedAt.getTime() + DEMO_ACCESS_SESSION_TTL_MS - 1;
    const afterExpiry = consumedAt.getTime() + DEMO_ACCESS_SESSION_TTL_MS + 1;

    expect(
      isDemoAccessSessionExpired({
        consumedAt,
        revokedAt: null,
        now: beforeExpiry,
      }),
    ).toBe(false);
    expect(
      isDemoAccessSessionExpired({
        consumedAt,
        revokedAt: null,
        now: afterExpiry,
      }),
    ).toBe(true);
    expect(
      isDemoAccessSessionExpired({
        consumedAt,
        revokedAt: new Date("2026-08-28T11:00:00.000Z"),
        now: beforeExpiry,
      }),
    ).toBe(true);
  });
});
