import {
  DEFAULT_STICKER_PRINT_SETTINGS,
  STICKER_PRINT_SIZE_LIMITS,
  normalizeStickerPrintSettings,
  type StickerPrintSettings,
} from "@/lib/sticker-print-settings";

export const STICKER_PRINT_SETTINGS_KEY = "stickerPrintSettingsV1" as const;

export const DEFAULT_PRESET_ID = "default" as const;

export const STICKER_BLOCK_IDS = [
  "clinic",
  "address",
  "doctor",
  "patient",
  "orderNumber",
  "qr",
  "logo",
] as const;

export type StickerBlockId = (typeof STICKER_BLOCK_IDS)[number];

export type StickerBlockKind = "field" | "image";

export const STICKER_BLOCK_DEFS: Record<
  StickerBlockId,
  { label: string; kind: StickerBlockKind; valueLabel?: string }
> = {
  clinic: { label: "Клиника", kind: "field", valueLabel: "Клиника" },
  address: { label: "Адрес", kind: "field", valueLabel: "Адрес" },
  doctor: { label: "Доктор", kind: "field", valueLabel: "Доктор" },
  patient: { label: "Пациент", kind: "field", valueLabel: "Пациент" },
  orderNumber: { label: "№ заказа", kind: "field", valueLabel: "№ заказа" },
  qr: { label: "QR-код", kind: "image" },
  logo: { label: "Логотип", kind: "image" },
};

export type StickerTemplateBlock = {
  id: StickerBlockId;
  visible: boolean;
  /** Позиция левого верхнего угла, % от ширины/высоты этикетки */
  xPct: number;
  yPct: number;
  /** Размер шрифта подписи и значения, pt (только field) */
  fontSizePt: number;
  /** Масштаб блока 0.4–2 (field — подпись+текст, image — QR/лого) */
  scale: number;
};

export type StickerTemplatePreset = {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  blocks: StickerTemplateBlock[];
};

export type StickerPrintSettingsV2 = {
  version: 2;
  activePresetId: string;
  presets: StickerTemplatePreset[];
};

export const STICKER_TEMPLATE_LIMITS = {
  xPctMin: 0,
  xPctMax: 95,
  yPctMin: 0,
  yPctMax: 95,
  fontSizeMin: 5,
  fontSizeMax: 16,
  scaleMin: 0.4,
  scaleMax: 2,
  presetNameMax: 64,
  presetsMax: 24,
} as const;

function clampNum(raw: unknown, fallback: number, min: number, max: number): number {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseFloat(raw.replace(",", ".").replace(/\s/g, ""))
        : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  return Math.round(clampNum(raw, fallback, min, max));
}

export function isStickerBlockId(v: unknown): v is StickerBlockId {
  return (
    typeof v === "string" &&
    (STICKER_BLOCK_IDS as readonly string[]).includes(v)
  );
}

export function createDefaultBlocksForSize(
  widthMm: number,
  heightMm: number,
): StickerTemplateBlock[] {
  const wide = widthMm / heightMm >= 1.32;
  const baseFont = wide ? 7.2 : 7;
  const orderFont = wide ? 6.8 : 6.5;
  return [
    {
      id: "clinic",
      visible: true,
      xPct: 2,
      yPct: 2,
      fontSizePt: baseFont,
      scale: 1,
    },
    {
      id: "address",
      visible: true,
      xPct: 2,
      yPct: wide ? 10 : 11,
      fontSizePt: orderFont,
      scale: 1,
    },
    {
      id: "doctor",
      visible: true,
      xPct: 2,
      yPct: wide ? 20 : 22,
      fontSizePt: baseFont,
      scale: 1,
    },
    {
      id: "patient",
      visible: true,
      xPct: 2,
      yPct: wide ? 32 : 34,
      fontSizePt: baseFont,
      scale: 1,
    },
    {
      id: "orderNumber",
      visible: true,
      xPct: 2,
      yPct: wide ? 44 : 47,
      fontSizePt: orderFont,
      scale: 1,
    },
    {
      id: "qr",
      visible: true,
      xPct: 2,
      yPct: wide ? 58 : 61,
      fontSizePt: baseFont,
      scale: wide ? 1.05 : 1,
    },
    {
      id: "logo",
      visible: true,
      xPct: wide ? 48 : 42,
      yPct: wide ? 56 : 58,
      fontSizePt: baseFont,
      scale: wide ? 1.1 : 1,
    },
  ];
}

export function createDefaultPreset(
  widthMm = DEFAULT_STICKER_PRINT_SETTINGS.widthMm,
  heightMm = DEFAULT_STICKER_PRINT_SETTINGS.heightMm,
  name = "Основной",
  id: string = DEFAULT_PRESET_ID,
): StickerTemplatePreset {
  return {
    id,
    name,
    widthMm,
    heightMm,
    blocks: createDefaultBlocksForSize(widthMm, heightMm),
  };
}

function normalizeBlock(raw: unknown, fallback: StickerTemplateBlock): StickerTemplateBlock {
  const obj =
    raw != null && typeof raw === "object" ? (raw as Partial<StickerTemplateBlock>) : {};
  const id = isStickerBlockId(obj.id) ? obj.id : fallback.id;
  return {
    id,
    visible: obj.visible !== false,
    xPct: clampNum(
      obj.xPct,
      fallback.xPct,
      STICKER_TEMPLATE_LIMITS.xPctMin,
      STICKER_TEMPLATE_LIMITS.xPctMax,
    ),
    yPct: clampNum(
      obj.yPct,
      fallback.yPct,
      STICKER_TEMPLATE_LIMITS.yPctMin,
      STICKER_TEMPLATE_LIMITS.yPctMax,
    ),
    fontSizePt: clampNum(
      obj.fontSizePt,
      fallback.fontSizePt,
      STICKER_TEMPLATE_LIMITS.fontSizeMin,
      STICKER_TEMPLATE_LIMITS.fontSizeMax,
    ),
    scale: clampNum(
      obj.scale,
      fallback.scale,
      STICKER_TEMPLATE_LIMITS.scaleMin,
      STICKER_TEMPLATE_LIMITS.scaleMax,
    ),
  };
}

function normalizeBlocks(
  raw: unknown,
  widthMm: number,
  heightMm: number,
): StickerTemplateBlock[] {
  const defaults = createDefaultBlocksForSize(widthMm, heightMm);
  const byId = new Map(defaults.map((b) => [b.id, b]));
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<StickerBlockId>();
  const out: StickerTemplateBlock[] = [];

  for (const item of list) {
    const id =
      item != null &&
      typeof item === "object" &&
      isStickerBlockId((item as { id?: unknown }).id)
        ? (item as { id: StickerBlockId }).id
        : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(normalizeBlock(item, byId.get(id)!));
  }

  for (const def of defaults) {
    if (!seen.has(def.id)) out.push(def);
  }

  return out.sort(
    (a, b) =>
      STICKER_BLOCK_IDS.indexOf(a.id) - STICKER_BLOCK_IDS.indexOf(b.id),
  );
}

function normalizePreset(raw: unknown, fallback?: StickerTemplatePreset): StickerTemplatePreset {
  const base =
    fallback ??
    createDefaultPreset(
      DEFAULT_STICKER_PRINT_SETTINGS.widthMm,
      DEFAULT_STICKER_PRINT_SETTINGS.heightMm,
    );
  const obj =
    raw != null && typeof raw === "object" ? (raw as Partial<StickerTemplatePreset>) : {};
  const widthMm = clampInt(
    obj.widthMm,
    base.widthMm,
    STICKER_PRINT_SIZE_LIMITS.widthMin,
    STICKER_PRINT_SIZE_LIMITS.widthMax,
  );
  const heightMm = clampInt(
    obj.heightMm,
    base.heightMm,
    STICKER_PRINT_SIZE_LIMITS.heightMin,
    STICKER_PRINT_SIZE_LIMITS.heightMax,
  );
  const id =
    typeof obj.id === "string" && obj.id.trim()
      ? obj.id.trim().slice(0, 64)
      : base.id;
  const name =
    typeof obj.name === "string" && obj.name.trim()
      ? obj.name.trim().slice(0, STICKER_TEMPLATE_LIMITS.presetNameMax)
      : base.name;
  return {
    id,
    name,
    widthMm,
    heightMm,
    blocks: normalizeBlocks(obj.blocks, widthMm, heightMm),
  };
}

export function normalizeStickerPrintSettingsV2(raw: unknown): StickerPrintSettingsV2 {
  const fallback = {
    version: 2 as const,
    activePresetId: DEFAULT_PRESET_ID,
    presets: [createDefaultPreset()],
  };

  if (raw == null || typeof raw !== "object") return fallback;

  const obj = raw as Partial<StickerPrintSettingsV2> & StickerPrintSettings;
  if (obj.version !== 2) {
    const v1 = normalizeStickerPrintSettings(obj);
    return {
      version: 2,
      activePresetId: DEFAULT_PRESET_ID,
      presets: [createDefaultPreset(v1.widthMm, v1.heightMm)],
    };
  }

  const presetsRaw = Array.isArray(obj.presets) ? obj.presets : [];
  const presets = presetsRaw
    .slice(0, STICKER_TEMPLATE_LIMITS.presetsMax)
    .map((p, i) =>
      normalizePreset(
        p,
        createDefaultPreset(
          DEFAULT_STICKER_PRINT_SETTINGS.widthMm,
          DEFAULT_STICKER_PRINT_SETTINGS.heightMm,
          `Пресет ${i + 1}`,
          `preset-${i + 1}`,
        ),
      ),
    );

  if (presets.length === 0) {
    presets.push(createDefaultPreset());
  }

  const ids = new Set(presets.map((p) => p.id));
  let activePresetId =
    typeof obj.activePresetId === "string" && ids.has(obj.activePresetId)
      ? obj.activePresetId
      : presets[0]!.id;

  return {
    version: 2,
    activePresetId,
    presets,
  };
}

export function getActiveStickerPreset(
  settings: StickerPrintSettingsV2,
): StickerTemplatePreset {
  return (
    settings.presets.find((p) => p.id === settings.activePresetId) ??
    settings.presets[0]!
  );
}

/** Размеры активного пресета — для обратной совместимости со старым API. */
export function stickerPresetDimensions(
  preset: StickerTemplatePreset,
): StickerPrintSettings {
  return { widthMm: preset.widthMm, heightMm: preset.heightMm };
}

export function newPresetId(): string {
  return `preset-${Date.now().toString(36)}`;
}

export function clonePreset(
  source: StickerTemplatePreset,
  id: string,
  name: string,
): StickerTemplatePreset {
  return {
    id,
    name,
    widthMm: source.widthMm,
    heightMm: source.heightMm,
    blocks: source.blocks.map((b) => ({ ...b })),
  };
}
