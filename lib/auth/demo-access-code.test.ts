import { describe, expect, it } from "vitest";
import {
  demoAccessCodePrefix,
  demoAccessCodeStatus,
  formatDemoAccessCodePrefixForUi,
  normalizeDemoAccessCodeInput,
} from "@/lib/auth/demo-access-code";

describe("demo-access-code", () => {
  it("нормализует пробелы, дефисы и регистр", () => {
    expect(normalizeDemoAccessCodeInput("  a1b2-c3d4 e5  ")).toBe("A1B2C3D4E5");
    // Кириллица вокруг не «съедается» — гость вводит только код
    expect(normalizeDemoAccessCodeInput("а1b2c3d4e5")).toBe("А1B2C3D4E5");
  });

  it("берёт префикс из нормализованного кода", () => {
    expect(demoAccessCodePrefix("a1b2c3d4e5")).toBe("A1B2");
    expect(formatDemoAccessCodePrefixForUi("A1B2")).toBe("A1……");
  });

  it("статус unused / used / revoked", () => {
    expect(
      demoAccessCodeStatus({ revokedAt: null, consumedAt: null }),
    ).toBe("unused");
    expect(
      demoAccessCodeStatus({
        revokedAt: null,
        consumedAt: new Date("2026-08-01"),
      }),
    ).toBe("used");
    expect(
      demoAccessCodeStatus({
        revokedAt: new Date("2026-08-01"),
        consumedAt: null,
      }),
    ).toBe("revoked");
  });
});
