import type { BlockStyle } from "@/lib/mail/reply-block-editor/types";

export type ButtonSizePreset = "S" | "M" | "L";

const BUTTON_SIZE_STYLES: Record<
  ButtonSizePreset,
  Pick<BlockStyle, "buttonFontSizePx" | "buttonPaddingXPx" | "buttonPaddingYPx">
> = {
  S: { buttonFontSizePx: 13, buttonPaddingXPx: 14, buttonPaddingYPx: 8 },
  M: { buttonFontSizePx: 15, buttonPaddingXPx: 20, buttonPaddingYPx: 12 },
  L: { buttonFontSizePx: 18, buttonPaddingXPx: 28, buttonPaddingYPx: 16 },
};

export function buttonSizePresetFromStyle(
  style: BlockStyle | undefined,
): ButtonSizePreset {
  const font = style?.buttonFontSizePx ?? 15;
  if (font <= 13) return "S";
  if (font >= 17) return "L";
  return "M";
}

export function blockStyleForButtonSizePreset(
  preset: ButtonSizePreset,
): Pick<BlockStyle, "buttonFontSizePx" | "buttonPaddingXPx" | "buttonPaddingYPx"> {
  return BUTTON_SIZE_STYLES[preset];
}
