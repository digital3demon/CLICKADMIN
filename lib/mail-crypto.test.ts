import { describe, expect, it } from "vitest";
import { decryptMailSecret, encryptMailSecret } from "@/lib/mail-crypto";

describe("mail credentials crypto", () => {
  it("encrypts and decrypts app passwords without storing plain text", () => {
    const prev = process.env.MAIL_CREDENTIALS_SECRET;
    process.env.MAIL_CREDENTIALS_SECRET = "test-secret-for-mail-crypto";
    try {
      const encrypted = encryptMailSecret("app-password");
      expect(encrypted).not.toContain("app-password");
      expect(decryptMailSecret(encrypted)).toBe("app-password");
    } finally {
      if (prev == null) delete process.env.MAIL_CREDENTIALS_SECRET;
      else process.env.MAIL_CREDENTIALS_SECRET = prev;
    }
  });
});
