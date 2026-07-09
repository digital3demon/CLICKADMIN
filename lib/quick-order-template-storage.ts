import {
  QUICK_ORDER_VERSION,
  mergeQuickOrderFromSnapshot,
  type QuickOrderState,
  type QuickOrderTile,
} from "@/components/orders/new-order-form/quick-order-types";
import { readClientStorageBucket } from "@/lib/client-storage-bucket";
import {
  deleteClientState,
  readClientState,
  writeClientState,
} from "@/lib/client-state-client";

const STORAGE_PREFIX = "dental-lab-crm:quick-order-template:v1";

function templateStorageKey(): string {
  return `${STORAGE_PREFIX}:${readClientStorageBucket()}`;
}

let cachedTemplate: QuickOrderState | null = null;
let bootstrappedKey: string | null = null;
/** Инкремент при каждом save — чтобы поздний ответ read не откатил удаление. */
let storageGeneration = 0;

function resetTileSelections(tiles: QuickOrderTile[]): QuickOrderTile[] {
  return tiles.map((t) => ({
    ...t,
    baseActive: false,
    blockOnSave: false,
    blockReason: "",
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
  const genAtStart = storageGeneration;
  const raw = await readClientState<unknown>("user", key);
  // Пока ждали сеть, пользователь уже сохранили/удалили шаблон — не откатываем.
  if (storageGeneration !== genAtStart) {
    return cachedTemplate;
  }
  if (!raw) {
    cachedTemplate = null;
    return null;
  }
  const q = mergeQuickOrderFromSnapshot(raw);
  // Пустой список в storage = шаблон удалён.
  cachedTemplate = q.tiles.length > 0 ? q : null;
  if (!cachedTemplate) {
    void deleteClientState("user", key);
  }
  return cachedTemplate;
}

/**
 * Сохраняет плашки для следующих окон «Новый наряд».
 * Пустой список — удаляет шаблон (иначе удалённые плашки «воскресают»).
 */
export function saveQuickOrderTemplate(q: QuickOrderState): void {
  storageGeneration += 1;
  const tiles = JSON.parse(JSON.stringify(q.tiles ?? [])) as QuickOrderTile[];
  if (tiles.length === 0) {
    cachedTemplate = null;
    void deleteClientState("user", templateStorageKey());
    return;
  }
  const payload: QuickOrderState = {
    v: QUICK_ORDER_VERSION,
    tiles,
    continueWork: null,
  };
  cachedTemplate = payload;
  void writeClientState("user", templateStorageKey(), payload);
}

/** Только для тестов. */
export function __resetQuickOrderTemplateStorageForTests(): void {
  cachedTemplate = null;
  bootstrappedKey = null;
  storageGeneration = 0;
}
