import { describe, expect, it } from "vitest";
import {
  formatPasswordResetCodeForDisplay,
  isPasswordResetCodeFormat,
  isPasswordResetExpired,
  normalizePasswordResetCodeInput,
  passwordResetExpiresAt,
  PASSWORD_RESET_TTL_MS,
} from "@/lib/auth/password-reset";

describe("password reset code", () => {
  it("нормализует код; кириллица рядом не считается частью кода", () => {
    expect(normalizePasswordResetCodeInput("  ab 12 cd 34 ef  ")).toBe(
      "AB12CD34EF",
    );
    expect(isPasswordResetCodeFormat("AB12CD34EF")).toBe(true);
    expect(normalizePasswordResetCodeInput("код Иванова AB12CD34EF")).toBe(
      "AB12CD34EF",
    );
    expect(
      normalizePasswordResetCodeInput("передай AB12CD34EF от 10.02.2026"),
    ).toBe("AB12CD34EF");
    expect(formatPasswordResetCodeForDisplay("ab12cd34ef")).toBe(
      "AB 12 CD 34 EF",
    );
  });

  it("истекает через 24 часа", () => {
    const from = new Date("2026-08-19T12:00:00.000Z");
    const exp = passwordResetExpiresAt(from);
    expect(exp.getTime() - from.getTime()).toBe(PASSWORD_RESET_TTL_MS);
    expect(isPasswordResetExpired(exp, from)).toBe(false);
    expect(
      isPasswordResetExpired(exp, new Date(from.getTime() + PASSWORD_RESET_TTL_MS + 1)),
    ).toBe(true);
    expect(isPasswordResetExpired(null, from)).toBe(true);
  });
});
