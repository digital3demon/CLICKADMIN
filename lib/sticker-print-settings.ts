export const STICKER_PRINT_SETTINGS_KEY = "stickerPrintSettingsV1";

export const STICKER_PRINT_SIZE_LIMITS = {
  widthMin: 25,
  widthMax: 120,
  heightMin: 20,
  heightMax: 100,
} as const;

export type StickerPrintSettings = {
  widthMm: number;
  heightMm: number;
};

export const DEFAULT_STICKER_PRINT_SETTINGS: StickerPrintSettings = {
  widthMm: 58,
  heightMm: 40,
};

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseInt(raw.replace(/\s/g, ""), 10)
        : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeStickerPrintSettings(
  raw: unknown,
): StickerPrintSettings {
  const obj =
    raw != null && typeof raw === "object"
      ? (raw as Partial<StickerPrintSettings>)
      : {};
  return {
    widthMm: clampInt(
      obj.widthMm,
      DEFAULT_STICKER_PRINT_SETTINGS.widthMm,
      STICKER_PRINT_SIZE_LIMITS.widthMin,
      STICKER_PRINT_SIZE_LIMITS.widthMax,
    ),
    heightMm: clampInt(
      obj.heightMm,
      DEFAULT_STICKER_PRINT_SETTINGS.heightMm,
      STICKER_PRINT_SIZE_LIMITS.heightMin,
      STICKER_PRINT_SIZE_LIMITS.heightMax,
    ),
  };
}
