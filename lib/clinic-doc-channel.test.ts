import { describe, expect, it } from "vitest";
import {
  clinicDocChannel,
  clinicDocChannelLabel,
  clinicDocChannelListTag,
} from "@/lib/clinic-doc-channel";

describe("clinicDocChannel", () => {
  it("оба канала", () => {
    expect(clinicDocChannel(true, true)).toBe("edoPaper");
    expect(clinicDocChannelLabel("edoPaper")).toBe("ЭДО+бумдоки");
    expect(clinicDocChannelListTag("edoPaper")).toBe("edo-paper");
  });

  it("только ЭДО", () => {
    expect(clinicDocChannel(true, false)).toBe("edo");
    expect(clinicDocChannelLabel("edo")).toBe("ЭДО");
  });

  it("бумдоки: только бумага или ничего", () => {
    expect(clinicDocChannel(false, true)).toBe("paper");
    expect(clinicDocChannel(false, false)).toBe("paper");
    expect(clinicDocChannelLabel("paper")).toBe("бумдоки");
  });
});
