import { describe, expect, it } from "vitest";
import {
  blockStyleForButtonSizePreset,
  buttonSizePresetFromStyle,
} from "@/lib/mail/reply-block-editor/button-size-presets";

describe("button-size-presets", () => {
  it("маппит S/M/L в стили кнопки", () => {
    expect(blockStyleForButtonSizePreset("M")).toEqual({
      buttonFontSizePx: 15,
      buttonPaddingXPx: 20,
      buttonPaddingYPx: 12,
    });
    expect(blockStyleForButtonSizePreset("S").buttonFontSizePx).toBe(13);
    expect(blockStyleForButtonSizePreset("L").buttonFontSizePx).toBe(18);
  });

  it("определяет пресет по размеру шрифта", () => {
    expect(buttonSizePresetFromStyle({ buttonFontSizePx: 13 })).toBe("S");
    expect(buttonSizePresetFromStyle({ buttonFontSizePx: 15 })).toBe("M");
    expect(buttonSizePresetFromStyle({ buttonFontSizePx: 18 })).toBe("L");
  });
});
