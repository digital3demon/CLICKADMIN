import { describe, expect, it, vi } from "vitest";
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
