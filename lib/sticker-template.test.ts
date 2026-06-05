import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRESET_ID,
  createDefaultPreset,
  normalizeStickerPrintSettingsV2,
} from "@/lib/sticker-template";

describe("normalizeStickerPrintSettingsV2", () => {
  it("мигрирует v1 только с размерами в пресет с блоками", () => {
    const out = normalizeStickerPrintSettingsV2({ widthMm: 100, heightMm: 50 });
    expect(out.version).toBe(2);
    expect(out.activePresetId).toBe(DEFAULT_PRESET_ID);
    expect(out.presets).toHaveLength(1);
    expect(out.presets[0]?.widthMm).toBe(100);
    expect(out.presets[0]?.heightMm).toBe(50);
    expect(out.presets[0]?.blocks.length).toBe(7);
    expect(out.presets[0]?.blocks.some((b) => b.id === "address")).toBe(true);
    expect(out.presets[0]?.blocks.every((b) => b.visible)).toBe(true);
  });

  it("сохраняет активный пресет и имя при v2", () => {
    const preset = createDefaultPreset(58, 40, "Термо 58", "p1");
    preset.blocks[0]!.visible = false;
    const out = normalizeStickerPrintSettingsV2({
      version: 2,
      activePresetId: "p1",
      presets: [preset],
    });
    expect(out.activePresetId).toBe("p1");
    expect(out.presets[0]?.name).toBe("Термо 58");
    expect(out.presets[0]?.blocks[0]?.visible).toBe(false);
  });
});
