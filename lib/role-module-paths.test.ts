import { describe, expect, it } from "vitest";
import { mailSettingsModuleForPath } from "./role-module-paths";

describe("mailSettingsModuleForPath", () => {
  it("uses CONFIG_MAIL for directory mail settings page", () => {
    expect(mailSettingsModuleForPath("/directory/mail", "GET")).toBe("CONFIG_MAIL");
  });

  it("uses CONFIG_MAIL for settings account list", () => {
    expect(
      mailSettingsModuleForPath("/api/mail/accounts", "GET", "?lite=1&forSettings=1"),
    ).toBe("CONFIG_MAIL");
  });

  it("uses MAIL for inbox account list", () => {
    expect(mailSettingsModuleForPath("/api/mail/accounts", "GET", "?tree=1")).toBe("MAIL");
  });

  it("uses CONFIG_MAIL for account patch and rules", () => {
    expect(mailSettingsModuleForPath("/api/mail/accounts/acc-1", "PATCH")).toBe("CONFIG_MAIL");
    expect(mailSettingsModuleForPath("/api/mail/rules", "GET")).toBe("CONFIG_MAIL");
  });
});
