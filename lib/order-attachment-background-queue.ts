"use client";

import {
  completeBackgroundOrderUpload,
  failBackgroundOrderUpload,
  setBackgroundOrderUploadProgress,
  startBackgroundOrderUpload,
} from "@/lib/background-order-upload-tracker";
import { postOrderAttachmentWithRetries } from "@/lib/order-attachment-upload-client";

type QueuedUploadRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  fileName: string;
  mimeType: string;
  size: number;
  lastModified: number;
  blob: Blob;
  createdAt: number;
  attempts: number;
  failed: boolean;
  lastError: string | null;
  fallbackTried: boolean;
};

const DB_NAME = "crm-order-attachment-queue";
const DB_VERSION = 3;
const STORE = "uploads";
const IDX_ORDER = "byOrderId";
const MAX_QUEUE_ATTEMPTS = 3;
// Держим локальную очередь короткой: старые записи очищаем через 72 часа.
const STALE_UPLOAD_TTL_MS = 72 * 60 * 60 * 1000;

function resolveOrderProcessConcurrency(): number {
  if (typeof navigator === "undefined") return 4;
  const raw = Number((navigator as { hardwareConcurrency?: unknown }).hardwareConcurrency);
  if (!Number.isFinite(raw) || raw <= 0) return 4;
  if (raw <= 4) return 4;
  if (raw <= 8) return 6;
  return 8;
}

const ORDER_PROCESS_CONCURRENCY = resolveOrderProcessConcurrency();

let dbPromise: Promise<IDBDatabase> | null = null;
let processorRunning = false;
let processorRequested = false;
const canceledOrderIds = new Set<string>();
const orderAbortControllers = new Map<string, AbortController>();
const trackerByOrderId = new Map<
  string,
  { trackerId: string; uploaded: number; total: number; orderNumber: string }
>();

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function uploadFingerprint(input: {
  fileName: string;
  size: number;
  lastModified: number;
}): string {
  return `${input.fileName}::${input.size}::${input.lastModified}`;
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const st = db.createObjectStore(STORE, { keyPath: "id" });
        st.createIndex(IDX_ORDER, "orderId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
  });
  return dbPromise;
}

async function txGetAll(storeName: string): Promise<QueuedUploadRow[]> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const st = tx.objectStore(storeName);
    const req = st.getAll();
    req.onsuccess = () =>
      resolve(((req.result as QueuedUploadRow[]) ?? []).map(normalizeQueuedRow));
    req.onerror = () => reject(req.error ?? new Error("IDB getAll failed"));
  });
}

async function txGetByOrder(orderId: string): Promise<QueuedUploadRow[]> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const st = tx.objectStore(STORE);
    const idx = st.index(IDX_ORDER);
    const req = idx.getAll(orderId);
    req.onsuccess = () =>
      resolve(((req.result as QueuedUploadRow[]) ?? []).map(normalizeQueuedRow));
    req.onerror = () => reject(req.error ?? new Error("IDB getByOrder failed"));
  });
}

async function txPutMany(rows: QueuedUploadRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const st = tx.objectStore(STORE);
    rows.forEach((r) => st.put(r));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB putMany failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IDB putMany aborted"));
  });
}

function normalizeQueuedRow(row: QueuedUploadRow): QueuedUploadRow {
  return {
    ...row,
    size: Number.isFinite(row.size) ? Math.max(0, Number(row.size)) : row.blob.size,
    attempts: Number.isFinite(row.attempts) ? Math.max(0, Math.round(row.attempts)) : 0,
    failed: row.failed === true,
    lastError:
      typeof row.lastError === "string" && row.lastError.trim() ? row.lastError.trim() : null,
    fallbackTried: row.fallbackTried === true,
  };
}

async function txDeleteOne(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB delete failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IDB delete aborted"));
  });
}

async function txDeleteMany(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const st = tx.objectStore(STORE);
    for (const id of ids) st.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB deleteMany failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IDB deleteMany aborted"));
  });
}

async function txDeleteByOrder(orderId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const st = tx.objectStore(STORE);
    const idx = st.index(IDX_ORDER);
    const req = idx.openCursor(IDBKeyRange.only(orderId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
    req.onerror = () => reject(req.error ?? new Error("IDB deleteByOrder failed"));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB deleteByOrder tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IDB deleteByOrder tx aborted"));
  });
}

function isExpiredQueuedUpload(row: QueuedUploadRow, nowMs: number): boolean {
  const createdAt = Number(row.createdAt);
  if (!Number.isFinite(createdAt) || createdAt <= 0) return true;
  return nowMs - createdAt > STALE_UPLOAD_TTL_MS;
}

async function pruneExpiredQueuedUploads(): Promise<number> {
  const nowMs = Date.now();
  const rows = await txGetAll(STORE);
  const staleIds = rows
    .filter((row) => isExpiredQueuedUpload(row, nowMs))
    .map((row) => row.id)
    .filter(Boolean);
  if (staleIds.length === 0) return 0;
  await txDeleteMany(staleIds);
  return staleIds.length;
}

function ensureOrderTracker(orderId: string, orderNumber: string, total: number): {
  trackerId: string;
  uploaded: number;
  total: number;
  orderNumber: string;
} {
  const existing = trackerByOrderId.get(orderId);
  if (existing && existing.total === total) {
    return existing;
  }
  if (existing) {
    completeBackgroundOrderUpload(existing.trackerId, { success: false });
  }
  const trackerId = startBackgroundOrderUpload({ orderId, orderNumber, total });
  const next = { trackerId, uploaded: 0, total, orderNumber };
  trackerByOrderId.set(orderId, next);
  return next;
}

function isOrderMissingError(message: string | null | undefined): boolean {
  const text = String(message || "")
    .trim()
    .toLowerCase();
  if (!text) return false;
  return text.includes("заказ не найден") || text.includes("некорректный id наряда");
}

async function processOrderQueue(orderId: string): Promise<void> {
  if (canceledOrderIds.has(orderId)) {
    await txDeleteByOrder(orderId);
    canceledOrderIds.delete(orderId);
    trackerByOrderId.delete(orderId);
    return;
  }
  const rows = (await txGetByOrder(orderId)).sort((a, b) => a.createdAt - b.createdAt);
  if (rows.length === 0) {
    trackerByOrderId.delete(orderId);
    return;
  }

  const tracker = ensureOrderTracker(orderId, rows[0]!.orderNumber, rows.length);
  const abortController = new AbortController();
  orderAbortControllers.set(orderId, abortController);
  const fails: Array<{ id: string; error: string }> = [];
  let uploaded = 0;
  let dropped = 0;

  try {
    for (const row of rows) {
      if (canceledOrderIds.has(orderId)) {
        break;
      }
    if (row.failed && row.attempts >= MAX_QUEUE_ATTEMPTS) {
      if (!row.fallbackTried) {
        const file = new File([row.blob], row.fileName, {
          type: row.mimeType || "application/octet-stream",
          lastModified: row.lastModified || Date.now(),
        });
        const fallback = await postOrderAttachmentWithRetries(orderId, file, {
          maxAttempts: 1,
          signal: abortController.signal,
        });
        if (fallback.ok) {
          await txDeleteOne(row.id);
          uploaded += 1;
          setBackgroundOrderUploadProgress(tracker.trackerId, uploaded + dropped);
          continue;
        }
        const fallbackError = fallback.error?.trim() || row.lastError || "Загрузка не удалась";
        await txPutMany([
          {
            ...row,
            failed: true,
            lastError: fallbackError,
            fallbackTried: true,
          },
        ]);
      }
      if (isOrderMissingError(row.lastError)) {
        await txDeleteOne(row.id);
        dropped += 1;
        setBackgroundOrderUploadProgress(tracker.trackerId, uploaded + dropped);
        continue;
      }
      fails.push({ id: row.id, error: row.lastError ?? "Загрузка не удалась" });
      continue;
    }
    const file = new File([row.blob], row.fileName, {
      type: row.mimeType || "application/octet-stream",
      lastModified: row.lastModified || Date.now(),
    });
    const res = await postOrderAttachmentWithRetries(orderId, file, {
      signal: abortController.signal,
    });
    if (res.ok) {
      await txDeleteOne(row.id);
      uploaded += 1;
      setBackgroundOrderUploadProgress(tracker.trackerId, uploaded + dropped);
      continue;
    }
    if (isOrderMissingError(res.error)) {
      await txDeleteOne(row.id);
      dropped += 1;
      setBackgroundOrderUploadProgress(tracker.trackerId, uploaded + dropped);
      continue;
    }
    const nextAttempts = row.attempts + 1;
    const finalError = res.error?.trim() || "Загрузка не удалась";
    await txPutMany([
      {
        ...row,
        attempts: nextAttempts,
        failed: true,
        lastError: finalError,
        fallbackTried: false,
      },
    ]);
    fails.push({ id: row.id, error: res.error });
  }
  } finally {
    orderAbortControllers.delete(orderId);
  }

  if (canceledOrderIds.has(orderId)) {
    await txDeleteByOrder(orderId);
    canceledOrderIds.delete(orderId);
    completeBackgroundOrderUpload(tracker.trackerId, { success: false });
    trackerByOrderId.delete(orderId);
    return;
  }

  if (fails.length === 0) {
    completeBackgroundOrderUpload(tracker.trackerId, { success: true });
    trackerByOrderId.delete(orderId);
    return;
  }

  const failMsg =
    fails.length === 1 ? "Загрузка не удалась" : `Загрузка не удалась (${fails.length} файлов)`;
  failBackgroundOrderUpload(tracker.trackerId, {
    error: failMsg,
    total: fails.length,
    onRetry: async () => {
      const latest = await txGetByOrder(orderId);
      const resetRows = latest
        .filter((r) => r.failed)
        .map((r) => ({
          ...r,
          attempts: 0,
          failed: false,
          lastError: null,
          fallbackTried: false,
        }));
      if (resetRows.length > 0) {
        await txPutMany(resetRows);
      }
      trackerByOrderId.set(orderId, {
        trackerId: tracker.trackerId,
        uploaded: 0,
        total: (await txGetByOrder(orderId)).length || fails.length,
        orderNumber: tracker.orderNumber,
      });
      await processOrderQueue(orderId);
    },
  });
}

export async function enqueueOrderAttachmentFiles(params: {
  orderId: string;
  orderNumber: string | null | undefined;
  files: File[];
}): Promise<number> {
  await pruneExpiredQueuedUploads();
  const existing = await txGetByOrder(params.orderId);
  const existingFp = new Set(existing.map((row) => uploadFingerprint(row)));
  const rows: QueuedUploadRow[] = [];
  for (const file of params.files) {
    const row: QueuedUploadRow = {
      id: uid("q"),
      orderId: params.orderId,
      orderNumber: params.orderNumber?.trim() || params.orderId,
      fileName: file.name || "file",
      mimeType: file.type || "application/octet-stream",
      size: file.size || 0,
      lastModified: file.lastModified || Date.now(),
      blob: file,
      createdAt: Date.now(),
      attempts: 0,
      failed: false,
      lastError: null,
      fallbackTried: false,
    };
    const fp = uploadFingerprint(row);
    if (existingFp.has(fp)) continue;
    existingFp.add(fp);
    rows.push(row);
  }
  if (rows.length === 0) return 0;
  await txPutMany(rows);
  kickOrderAttachmentBackgroundProcessor();
  return rows.length;
}

export function kickOrderAttachmentBackgroundProcessor(): void {
  if (processorRunning) {
    processorRequested = true;
    return;
  }
  processorRunning = true;
  void (async () => {
    try {
      do {
        processorRequested = false;
        await pruneExpiredQueuedUploads();
        const rows = await txGetAll(STORE);
        const orderIds = [...new Set(rows.map((r) => r.orderId))];
        for (let i = 0; i < orderIds.length; i += ORDER_PROCESS_CONCURRENCY) {
          const batch = orderIds.slice(i, i + ORDER_PROCESS_CONCURRENCY);
          const settled = await Promise.allSettled(
            batch.map(async (orderId) => {
              await processOrderQueue(orderId);
            }),
          );
          for (const result of settled) {
            if (result.status === "rejected") {
              console.error("[order-attachment-queue] order batch item failed", result.reason);
            }
          }
        }
      } while (processorRequested);
    } finally {
      processorRunning = false;
    }
  })();
}

export async function cancelOrderAttachmentBackgroundUpload(orderId: string): Promise<void> {
  const key = String(orderId || "").trim();
  if (!key) return;
  canceledOrderIds.add(key);
  const abort = orderAbortControllers.get(key);
  if (abort) {
    try {
      abort.abort();
    } catch {
      /* noop */
    }
  }
  await txDeleteByOrder(key);
  const tracker = trackerByOrderId.get(key);
  if (tracker) {
    completeBackgroundOrderUpload(tracker.trackerId, { success: false });
    trackerByOrderId.delete(key);
  }
}

export type QueuedOrderAttachmentMeta = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  failed: boolean;
  attempts: number;
  error: string | null;
};

export async function listQueuedOrderAttachmentFiles(
  orderId: string,
): Promise<QueuedOrderAttachmentMeta[]> {
  const rows = await txGetByOrder(orderId);
  return rows
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((row) => ({
      id: row.id,
      fileName: row.fileName,
      mimeType: row.mimeType,
      size: row.size,
      createdAt: new Date(row.createdAt).toISOString(),
      failed: row.failed,
      attempts: row.attempts,
      error: row.lastError,
    }));
}

