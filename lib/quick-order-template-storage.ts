import {
  QUICK_ORDER_VERSION,
  mergeQuickOrderFromSnapshot,
  type QuickOrderState,
  type QuickOrderTile,
} from "@/components/orders/new-order-form/quick-order-types";
import { readClientStorageBucket } from "@/lib/client-storage-bucket";
import { readClientState, writeClientState } from "@/lib/client-state-client";

const STORAGE_PREFIX = "dental-lab-crm:quick-order-template:v1";

function templateStorageKey(): string {
  return `${STORAGE_PREFIX}:${readClientStorageBucket()}`;
}

let cachedTemplate: QuickOrderState | null = null;
let bootstrappedKey: string | null = null;

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
  return cachedTemplate;
}

export async function loadQuickOrderTemplateFromDb(): Promise<QuickOrderState | null> {
  const key = templateStorageKey();
  if (bootstrappedKey === key) return cachedTemplate;
  bootstrappedKey = key;
  const raw = await readClientState<unknown>("user", key);
  if (!raw) {
    cachedTemplate = null;
    return null;
  }
  const q = mergeQuickOrderFromSnapshot(raw);
  cachedTemplate = q.tiles.length > 0 ? q : null;
  return cachedTemplate;
}

/** Сохраняет плашки (и v) для следующих окон «Новый наряд». */
export function saveQuickOrderTemplate(q: QuickOrderState): void {
  const payload: QuickOrderState = {
    v: QUICK_ORDER_VERSION,
    tiles: JSON.parse(JSON.stringify(q.tiles)) as QuickOrderTile[],
    continueWork: null,
  };
  cachedTemplate = payload;
  void writeClientState("user", templateStorageKey(), payload);
}
