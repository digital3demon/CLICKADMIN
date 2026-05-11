import { describe, expect, it } from "vitest";
import {
  CLICKLAB_ADMIN_MENTION,
  splitAroundClicklabAdmin,
  textIncludesClicklabAdminMention,
} from "./telegram-clicklab-admin-mention";

describe("clicklab admin mention", () => {
  it("detects substring with Cyrillic around", () => {
    const s = `Здравствуйте врач Иванов ${CLICKLAB_ADMIN_MENTION} срочно проверьте`;
    expect(textIncludesClicklabAdminMention(s)).toBe(true);
    const sp = splitAroundClicklabAdmin(s);
    expect(sp?.before.trim()).toContain("Иванов");
    expect(sp?.after.trim()).toContain("срочно");
  });

  it("splits case-insensitive mention", () => {
    const sp = splitAroundClicklabAdmin("до @CliCkLab_AdMiN после");
    expect(sp?.before.trim()).toBe("до");
    expect(sp?.after.trim()).toBe("после");
  });

  it("keeps full message after tag on same line (not only the handle)", () => {
    const sp = splitAroundClicklabAdmin(
      `${CLICKLAB_ADMIN_MENTION} проверьте коронку 11 по плану`,
    );
    expect(sp?.before).toBe("");
    expect(sp?.after.trim()).toBe("проверьте коронку 11 по плану");
  });
});
