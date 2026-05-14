import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("mail app password encryption", () => {
  it("roundtrips app password without exposing plaintext", async () => {
    vi.stubEnv("MAIL_CREDENTIALS_SECRET", "test-secret-for-mail-credentials");
    const { decryptAppPassword, encryptAppPassword } = await import("./encryption");
    const encrypted = encryptAppPassword("yandex-app-password");
    expect(encrypted).not.toContain("yandex-app-password");
    expect(decryptAppPassword(encrypted)).toBe("yandex-app-password");
  });
});
