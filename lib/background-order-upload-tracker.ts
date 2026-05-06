"use client";

export type BackgroundOrderUploadItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  total: number;
  uploaded: number;
  status: "uploading" | "success" | "failed";
  error?: string;
};

type Listener = () => void;

const items = new Map<string, BackgroundOrderUploadItem>();
const listeners = new Set<Listener>();
const clearTimers = new Map<string, ReturnType<typeof setTimeout>>();
const retryHandlers = new Map<string, () => Promise<void>>();
let snapshotCache: BackgroundOrderUploadItem[] = [];

function refreshSnapshotCache(): void {
  snapshotCache = [...items.values()];
}

function emit(): void {
  refreshSnapshotCache();
  listeners.forEach((l) => l());
}

function uid(): string {
  return `bg-upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function subscribeBackgroundOrderUploads(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function snapshotBackgroundOrderUploads(): BackgroundOrderUploadItem[] {
  return snapshotCache;
}

export function hasUploadingBackgroundOrderUploads(): boolean {
  return snapshotCache.some((item) => item.status === "uploading");
}

export function startBackgroundOrderUpload(input: {
  orderId: string;
  orderNumber: string | null | undefined;
  total: number;
}): string {
  const id = uid();
  items.set(id, {
    id,
    orderId: input.orderId,
    orderNumber: input.orderNumber?.trim() || input.orderId,
    total: Math.max(0, input.total),
    uploaded: 0,
    status: "uploading",
  });
  emit();
  return id;
}

export function setBackgroundOrderUploadProgress(
  id: string,
  uploaded: number,
): void {
  const row = items.get(id);
  if (!row) return;
  const nextUploaded = Math.max(0, Math.min(uploaded, row.total));
  if (nextUploaded === row.uploaded) return;
  items.set(id, { ...row, uploaded: nextUploaded });
  emit();
}

export function completeBackgroundOrderUpload(
  id: string,
  opts: { success: boolean },
): void {
  const row = items.get(id);
  if (!row) return;
  const prevTimer = clearTimers.get(id);
  if (prevTimer) {
    clearTimeout(prevTimer);
    clearTimers.delete(id);
  }
  if (!opts.success) {
    items.delete(id);
    retryHandlers.delete(id);
    emit();
    return;
  }
  items.set(id, {
    ...row,
    uploaded: row.total,
    status: "success",
  });
  emit();
  const timer = setTimeout(() => {
    clearTimers.delete(id);
    if (!items.has(id)) return;
    items.delete(id);
    retryHandlers.delete(id);
    emit();
  }, 2600);
  clearTimers.set(id, timer);
}

export function failBackgroundOrderUpload(
  id: string,
  opts: {
    error: string;
    total: number;
    onRetry: () => Promise<void>;
  },
): void {
  const row = items.get(id);
  if (!row) return;
  const prevTimer = clearTimers.get(id);
  if (prevTimer) {
    clearTimeout(prevTimer);
    clearTimers.delete(id);
  }
  retryHandlers.set(id, opts.onRetry);
  items.set(id, {
    ...row,
    total: Math.max(1, opts.total),
    uploaded: 0,
    status: "failed",
    error: opts.error.trim() || "Не удалось загрузить файлы",
  });
  emit();
}

export async function retryBackgroundOrderUpload(id: string): Promise<void> {
  const row = items.get(id);
  if (!row || row.status !== "failed") return;
  const handler = retryHandlers.get(id);
  if (!handler) return;
  items.set(id, { ...row, status: "uploading", uploaded: 0, error: undefined });
  emit();
  await handler();
}

