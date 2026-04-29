import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRandomBytes = vi.hoisted(() => vi.fn());

vi.mock("node:crypto", async (importOriginal) => {
  const mod = await importOriginal<typeof import("node:crypto")>();
  return { ...mod, randomBytes: mockRandomBytes };
});

import { generateInviteCodePlain, normalizeInviteCodeInput } from "@/lib/auth/invite-code";

describe("normalizeInviteCodeInput", () => {
  it("trims, uppercases, removes inner spaces", () => {
    expect(normalizeInviteCodeInput("  ab cd ef  ")).toBe("ABCDEF");
  });

  it("handles empty after trim", () => {
    expect(normalizeInviteCodeInput("   ")).toBe("");
  });
});

describe("generateInviteCodePlain", () => {
  beforeEach(() => {
    mockRandomBytes.mockReturnValue(Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89]));
  });

  it("returns 10 hex chars uppercase from 5 random bytes", () => {
    expect(generateInviteCodePlain()).toBe("0123456789");
    expect(mockRandomBytes).toHaveBeenCalledWith(5);
  });
});
