import { describe, expect, it, vi } from "vitest";
import { userCanManageMailAccountSettings } from "@/lib/auth/permissions";
import { canOpenMailSettingsModule } from "./mail-settings-access";

vi.mock("@/lib/mail/mail-service", () => ({
  hasMailSettingsPageAccess: vi.fn(),
}));

import { hasMailSettingsPageAccess } from "@/lib/mail/mail-service";

const db = {} as never;

describe("canOpenMailSettingsModule", () => {
  it("allows owner without matrix flags", async () => {
    await expect(
      canOpenMailSettingsModule(db, "t1", "u1", "OWNER", { CONFIG_MAIL: false }),
    ).resolves.toBe(true);
  });

  it("allows role with CONFIG_MAIL in matrix", async () => {
    vi.mocked(hasMailSettingsPageAccess).mockResolvedValue(false);
    await expect(
      canOpenMailSettingsModule(db, "t1", "u1", "ADMINISTRATOR", { CONFIG_MAIL: true }),
    ).resolves.toBe(true);
  });

  it("allows role delegated on a mailbox via settingsRoles", async () => {
    vi.mocked(hasMailSettingsPageAccess).mockResolvedValue(true);
    await expect(
      canOpenMailSettingsModule(db, "t1", "u1", "ADMINISTRATOR", { CONFIG_MAIL: false }),
    ).resolves.toBe(true);
  });
});

describe("userCanManageMailAccountSettings", () => {
  it("allows CONFIG_MAIL without per-mailbox settingsRoles", () => {
    expect(
      userCanManageMailAccountSettings("SENIOR_ADMINISTRATOR", [], { CONFIG_MAIL: true }),
    ).toBe(true);
  });

  it("allows per-mailbox settingsRoles without CONFIG_MAIL", () => {
    expect(
      userCanManageMailAccountSettings(
        "SENIOR_ADMINISTRATOR",
        ["SENIOR_ADMINISTRATOR"],
        { CONFIG_MAIL: false },
      ),
    ).toBe(true);
  });
});
