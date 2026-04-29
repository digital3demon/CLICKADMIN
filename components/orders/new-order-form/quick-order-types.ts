export const QUICK_ORDER_VERSION = 2 as const;

export const DEFAULT_QUICK_TILE_ACCENT = "#0ea5e9";

export const MAX_QUICK_TILES = 40;
export const MAX_TILE_TITLE_LEN = 120;
export const MAX_OPTION_LABEL_LEN = 80;

export type QuickOrderTileOption = {
  id: string;
  label: string;
  priceListItemId: string | null;
  /** Код · название — для отображения без повторного запроса */
  priceSummary: string | null;
  checked: boolean;
};

export type QuickOrderTile = {
  id: string;
  title: string;
  accentColor: string;
  basePriceListItemId: string | null;
  basePriceSummary: string | null;
  /** Основная позиция прайса включена в наряд */
  baseActive: boolean;
  options: QuickOrderTileOption[];
};

export type QuickOrderState = {
  v: typeof QUICK_ORDER_VERSION;
  tiles: QuickOrderTile[];
  continueWork: { href: string; label: string } | null;
};

function newEntityId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newQuickOrderTile(): QuickOrderTile {
  return {
    id: newEntityId("qt"),
    title: "",
    accentColor: DEFAULT_QUICK_TILE_ACCENT,
    basePriceListItemId: null,
    basePriceSummary: null,
    baseActive: false,
    options: [],
  };
}

export function newQuickOrderTileOption(): QuickOrderTileOption {
  return {
    id: newEntityId("qo"),
    label: "",
    priceListItemId: null,
    priceSummary: null,
    checked: false,
  };
}

export const defaultQuickOrderState = (): QuickOrderState => ({
  v: QUICK_ORDER_VERSION,
  tiles: [],
  continueWork: null,
});

const HEX = /^#([0-9a-fA-F]{6})$/;

export function normalizeAccentColor(raw: string): string {
  const t = raw.trim();
  if (HEX.test(t)) return t.toLowerCase();
  return DEFAULT_QUICK_TILE_ACCENT;
}

/** rgba( r, g, b, a ) для фона плашки */
export function accentBackgroundCss(hex: string, alpha = 0.1): string {
  const h = normalizeAccentColor(hex).slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) {
    return `rgba(14, 165, 233, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Фон плашки «Быстрый наряд»: в тёмной теме смешиваем акцент с тёмной базой,
 * чтобы светлый текст (--app-text) не попадал на «молочный» pastel.
 */
export function accentTileBackground(hex: string, dark: boolean): string {
  const a = normalizeAccentColor(hex);
  if (!dark) return accentBackgroundCss(a, 0.11);
  return `color-mix(in srgb, ${a} 22%, rgb(24 24 27))`;
}

function parseContinueWork(
  raw: unknown,
): { href: string; label: string } | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as { href?: unknown; label?: unknown };
  if (typeof o.href !== "string" || typeof o.label !== "string") return null;
  const href = o.href.trim();
  const label = o.label.trim();
  if (!href || !label) return null;
  return { href, label };
}

function normalizeOption(raw: unknown): QuickOrderTileOption | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as {
    id?: unknown;
    label?: unknown;
    priceListItemId?: unknown;
    priceSummary?: unknown;
    checked?: unknown;
  };
  const label = String(r.label ?? "").trim().slice(0, MAX_OPTION_LABEL_LEN);
  const id =
    typeof r.id === "string" && r.id.trim()
      ? r.id.trim()
      : newEntityId("qo");
  const pid = String(r.priceListItemId ?? "").trim();
  const summary = String(r.priceSummary ?? "").trim();
  return {
    id,
    label,
    priceListItemId: pid || null,
    priceSummary: summary || null,
    checked: Boolean(r.checked),
  };
}

function normalizeTileV2(raw: unknown): QuickOrderTile | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as {
    id?: unknown;
    title?: unknown;
    accentColor?: unknown;
    basePriceListItemId?: unknown;
    basePriceSummary?: unknown;
    baseActive?: unknown;
    options?: unknown;
  };
  const title = String(r.title ?? "").trim().slice(0, MAX_TILE_TITLE_LEN);
  if (!title) return null;
  const id =
    typeof r.id === "string" && r.id.trim()
      ? r.id.trim()
      : newEntityId("qt");
  const baseId = String(r.basePriceListItemId ?? "").trim();
  const optsIn = Array.isArray(r.options) ? r.options : [];
  const options: QuickOrderTileOption[] = [];
  for (const o of optsIn) {
    const n = normalizeOption(o);
    if (n) options.push(n);
  }
  return {
    id,
    title,
    accentColor: normalizeAccentColor(String(r.accentColor ?? "")),
    basePriceListItemId: baseId || null,
    basePriceSummary: String(r.basePriceSummary ?? "").trim() || null,
    baseActive: Boolean(r.baseActive),
    options: options.slice(0, 30),
  };
}

function normalizeQuickOrderV2(partial: Record<string, unknown>): QuickOrderState {
  const tilesIn = Array.isArray(partial.tiles) ? partial.tiles : [];
  const tiles: QuickOrderTile[] = [];
  for (const t of tilesIn) {
    const n = normalizeTileV2(t);
    if (n) tiles.push(n);
  }
  return {
    v: QUICK_ORDER_VERSION,
    tiles: tiles.slice(0, MAX_QUICK_TILES),
    continueWork: parseContinueWork(partial.continueWork),
  };
}

/** Старый формат (v1): splint, customTiles[] и т.д. */
function migrateFromLegacyV1(p: Record<string, unknown>): QuickOrderState {
  const continueWork = parseContinueWork(p.continueWork);
  const tiles: QuickOrderTile[] = [];
  const custom = p.customTiles;
  if (Array.isArray(custom)) {
    for (const row of custom) {
      if (row == null || typeof row !== "object") continue;
      const r = row as { id?: unknown; label?: unknown; active?: unknown };
      const title = String(r.label ?? "").trim().slice(0, MAX_TILE_TITLE_LEN);
      if (!title) continue;
      const id =
        typeof r.id === "string" && r.id.trim()
          ? r.id.trim()
          : newEntityId("qt");
      tiles.push({
        id,
        title,
        accentColor: DEFAULT_QUICK_TILE_ACCENT,
        basePriceListItemId: null,
        basePriceSummary: null,
        baseActive: Boolean(r.active),
        options: [],
      });
    }
  }
  return {
    v: QUICK_ORDER_VERSION,
    tiles: tiles.slice(0, MAX_QUICK_TILES),
    continueWork,
  };
}

/** Черновики, API и миграция с v1. */
export function mergeQuickOrderFromSnapshot(partial?: unknown): QuickOrderState {
  const d = defaultQuickOrderState();
  if (partial == null || typeof partial !== "object") return d;
  const p = partial as Record<string, unknown>;
  if (p.v === QUICK_ORDER_VERSION && Array.isArray(p.tiles)) {
    return normalizeQuickOrderV2(p);
  }
  return migrateFromLegacyV1(p);
}
