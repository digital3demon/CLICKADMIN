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
  lastModified: number;
  blob: Blob;
  createdAt: number;
};

const DB_NAME = "crm-order-attachment-queue";
const DB_VERSION = 1;
const STORE = "uploads";
const IDX_ORDER = "byOrderId";

let dbPromise: Promise<IDBDatabase> | null = null;
let processorRunning = false;
let processorRequested = false;
const trackerByOrderId = new Map<
  string,
  { trackerId: string; uploaded: number; total: number; orderNumber: string }
>();

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
    req.onsuccess = () => resolve((req.result as QueuedUploadRow[]) ?? []);
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
    req.onsuccess = () => resolve((req.result as QueuedUploadRow[]) ?? []);
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
  const trackerId = startBackgroundOrderUpload({ orderId, orderNumber, total });
  const next = { trackerId, uploaded: 0, total, orderNumber };
  trackerByOrderId.set(orderId, next);
  return next;
}

async function processOrderQueue(orderId: string): Promise<void> {
  const rows = (await txGetByOrder(orderId)).sort((a, b) => a.createdAt - b.createdAt);
  if (rows.length === 0) {
    trackerByOrderId.delete(orderId);
    return;
  }

  const tracker = ensureOrderTracker(orderId, rows[0]!.orderNumber, rows.length);
  const fails: Array<{ id: string; error: string }> = [];
  let uploaded = 0;

  for (const row of rows) {
    const file = new File([row.blob], row.fileName, {
      type: row.mimeType || "application/octet-stream",
      lastModified: row.lastModified || Date.now(),
    });
    const res = await postOrderAttachmentWithRetries(orderId, file);
    if (res.ok) {
      await txDeleteOne(row.id);
      uploaded += 1;
      setBackgroundOrderUploadProgress(tracker.trackerId, uploaded);
      continue;
    }
    fails.push({ id: row.id, error: res.error });
  }

  if (fails.length === 0) {
    completeBackgroundOrderUpload(tracker.trackerId, { success: true });
    trackerByOrderId.delete(orderId);
    return;
  }

  const failMsg = `Не удалось загрузить ${fails.length} файл(ов)`;
  failBackgroundOrderUpload(tracker.trackerId, {
    error: failMsg,
    total: fails.length,
    onRetry: async () => {
      trackerByOrderId.set(orderId, {
        trackerId: tracker.trackerId,
        uploaded: 0,
        total: fails.length,
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
  const rows: QueuedUploadRow[] = params.files.map((file) => ({
    id: uid("q"),
    orderId: params.orderId,
    orderNumber: params.orderNumber?.trim() || params.orderId,
    fileName: file.name || "file",
    mimeType: file.type || "application/octet-stream",
    lastModified: file.lastModified || Date.now(),
    blob: file,
    createdAt: Date.now(),
  }));
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
        const rows = await txGetAll(STORE);
        const orderIds = [...new Set(rows.map((r) => r.orderId))];
        for (const orderId of orderIds) {
          await processOrderQueue(orderId);
        }
      } while (processorRequested);
    } finally {
      processorRunning = false;
    }
  })();
}

