import type { OrderDraftSnapshot } from "@/lib/order-draft-snapshot";
import { readClientStorageBucket } from "@/lib/client-storage-bucket";

const STORAGE_PREFIX = "dental-lab-order-drafts-v1";

function draftsStorageKey(): string {
  return `${STORAGE_PREFIX}:${readClientStorageBucket()}`;
}

/** Стабильная ссылка для SSR и пустого списка (useSyncExternalStore). */
const EMPTY_DRAFTS: StoredOrderDraft[] = [];

export type StoredOrderDraft = {
  id: string;
  updatedAt: string;
  label: string;
  snapshot: OrderDraftSnapshot;
};

let cachedStorageKey: string | null = null;
let cachedSerialized: string | null = null;
let cachedList: StoredOrderDraft[] = EMPTY_DRAFTS;

function invalidateCacheIfBucketChanged(): void {
  const k = draftsStorageKey();
  if (cachedStorageKey !== k) {
    cachedStorageKey = k;
    cachedSerialized = null;
    cachedList = EMPTY_DRAFTS;
  }
}

function parse(raw: string | null): StoredOrderDraft[] {
  if (!raw) return EMPTY_DRAFTS;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return EMPTY_DRAFTS;
    const filtered = v.filter(
      (x): x is StoredOrderDraft =>
        x != null &&
        typeof x === "object" &&
        "id" in x &&
        "snapshot" in x &&
        typeof (x as StoredOrderDraft).id === "string",
    );
    return filtered.length === 0 ? EMPTY_DRAFTS : filtered;
  } catch {
    return EMPTY_DRAFTS;
  }
}

/** Снимок для useSyncExternalStore: одна и та же ссылка, пока localStorage не менялся. */
export function getDraftsSnapshot(): StoredOrderDraft[] {
  if (typeof window === "undefined") {
    return EMPTY_DRAFTS;
  }
  invalidateCacheIfBucketChanged();
  const raw = localStorage.getItem(draftsStorageKey());
  if (raw === cachedSerialized) {
    return cachedList;
  }
  cachedSerialized = raw;
  cachedList = parse(raw);
  return cachedList;
}

/** Кешированный снимок для getServerSnapshot (нельзя возвращать новый [] каждый раз). */
export function getDraftsServerSnapshot(): StoredOrderDraft[] {
  return EMPTY_DRAFTS;
}

export function loadDrafts(): StoredOrderDraft[] {
  return getDraftsSnapshot();
}

export function saveDrafts(list: StoredOrderDraft[]): void {
  if (typeof window === "undefined") return;
  invalidateCacheIfBucketChanged();
  const serialized = JSON.stringify(list);
  localStorage.setItem(draftsStorageKey(), serialized);
  cachedSerialized = serialized;
  cachedList = list.length === 0 ? EMPTY_DRAFTS : list;
  window.dispatchEvent(new Event("drafts-updated"));
}

export function addDraft(snapshot: OrderDraftSnapshot, label: string): string {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `d-${Date.now()}`;
  const next: StoredOrderDraft = {
    id,
    updatedAt: new Date().toISOString(),
    label,
    snapshot,
  };
  const list = loadDrafts();
  const merged = list === EMPTY_DRAFTS ? [next] : [next, ...list];
  saveDrafts(merged.slice(0, 20));
  return id;
}

export function removeDraft(id: string): void {
  const list = loadDrafts().filter((d) => d.id !== id);
  saveDrafts(list);
}

/** Удалить все сохранённые черновики нарядов из localStorage. */
export function clearAllDrafts(): void {
  saveDrafts([]);
}

export function subscribeDrafts(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("drafts-updated", cb);
  return () => window.removeEventListener("drafts-updated", cb);
}
