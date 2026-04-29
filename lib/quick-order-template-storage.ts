import {
  QUICK_ORDER_VERSION,
  mergeQuickOrderFromSnapshot,
  type QuickOrderState,
  type QuickOrderTile,
} from "@/components/orders/new-order-form/quick-order-types";
import { readClientStorageBucket } from "@/lib/client-storage-bucket";

const STORAGE_PREFIX = "dental-lab-crm:quick-order-template:v1";

function templateStorageKey(): string {
  return `${STORAGE_PREFIX}:${readClientStorageBucket()}`;
}

function resetTileSelections(tiles: QuickOrderTile[]): QuickOrderTile[] {
  return tiles.map((t) => ({
    ...t,
    baseActive: false,
    options: t.options.map((o) => ({ ...o, checked: false })),
  }));
}

/**
 * Шаблон для нового наряда: те же плашки и привязки к прайсу, без отметок в составе
 * и без «продолжения работы».
 */
export function quickOrderTemplateAsNewOrderDefaults(
  raw: QuickOrderState,
): QuickOrderState {
  const merged = mergeQuickOrderFromSnapshot(raw);
  return {
    v: QUICK_ORDER_VERSION,
    tiles: resetTileSelections(merged.tiles),
    continueWork: null,
  };
}

export function loadQuickOrderTemplate(): QuickOrderState | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(templateStorageKey());
    if (!s) return null;
    const parsed = JSON.parse(s) as unknown;
    const q = mergeQuickOrderFromSnapshot(parsed);
    if (q.tiles.length === 0) return null;
    return q;
  } catch {
    return null;
  }
}

/** Сохраняет плашки (и v) для следующих окон «Новый наряд». */
export function saveQuickOrderTemplate(q: QuickOrderState): void {
  if (typeof window === "undefined") return;
  try {
    const payload: QuickOrderState = {
      v: QUICK_ORDER_VERSION,
      tiles: JSON.parse(JSON.stringify(q.tiles)) as QuickOrderTile[],
      continueWork: null,
    };
    localStorage.setItem(templateStorageKey(), JSON.stringify(payload));
  } catch {
    /* квота / приватный режим */
  }
}
