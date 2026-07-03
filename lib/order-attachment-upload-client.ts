/**
 * Повторы загрузки вложения к наряду (новый заказ / редактирование): сеть, таймаут, занятость БД, всплески.
 */

import { normalizeOrderAttachmentImage } from "@/lib/order-attachment-image-normalize.client";
import { requestOrderKaitenAttachmentSync } from "@/lib/order-kaiten-attachment-sync-client";

const MAX_ATTEMPTS = 3;

export const ORDER_ATTACHMENT_PAYLOAD_TOO_LARGE_MESSAGE =
  "Файл слишком большой для сервера. Для фото мы сжимаем автоматически — если ошибка остаётся, уменьшите файл или проверьте лимит загрузки на сервере (nginx client_max_body_size).";

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jitterMs(base: number): number {
  return base + Math.floor(Math.random() * 80);
}

/** Статусы, при которых имеет смысл повторить POST целиком. */
export function isRetryableAttachmentUploadHttpStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

export type PostOrderAttachmentResult =
  | {
      ok: true;
      /** Тело успешного ответа API (есть id вложения и пр.). */
      data: Record<string, unknown>;
      warning?: string;
    }
  | { ok: false; error: string };

export type NormalizeOrderAttachmentQueueResult = {
  queue: File[];
  skippedTooLarge: boolean;
  skippedEmpty: boolean;
};

/**
 * Очередь для POST и для счётчика прогресса: без пустых файлов, без превышения лимита,
 * без дубликатов с одинаковыми name+size (двойной paste/drag иногда дублирует записи).
 */
export function normalizeOrderAttachmentUploadQueue(
  files: FileList | File[],
  maxBytes: number,
): NormalizeOrderAttachmentQueueResult {
  const raw = Array.from(files);
  let skippedTooLarge = false;
  let skippedEmpty = false;
  const candidates: File[] = [];
  for (const f of raw) {
    if (f.size === 0) {
      skippedEmpty = true;
      continue;
    }
    if (f.size > maxBytes) {
      skippedTooLarge = true;
      continue;
    }
    candidates.push(f);
  }
  const seen = new Set<string>();
  const queue: File[] = [];
  for (const f of candidates) {
    const key = `${f.name}-${f.size}`;
    if (!seen.has(key)) {
      seen.add(key);
      queue.push(f);
    }
  }
  return { queue, skippedTooLarge, skippedEmpty };
}

/**
 * POST `/api/orders/:id/attachments` с повторами и экспоненциальной паузой.
 */
export async function postOrderAttachmentWithRetries(
  orderId: string,
  file: File,
  options?: {
    asInvoice?: boolean;
    /** Только бух-блок: не в общем списке файлов и без Kaiten. */
    paymentSlip?: boolean;
    /** После сохранения в CRM — отдельно догрузить в Kaiten (если карточка уже есть). */
    syncKaitenAfter?: boolean;
    signal?: AbortSignal;
    maxAttempts?: number;
  },
): Promise<PostOrderAttachmentResult> {
  let lastError = "Не удалось сохранить файл";
  const limit = Number.isFinite(options?.maxAttempts)
    ? Math.max(1, Math.min(MAX_ATTEMPTS, Math.round(Number(options?.maxAttempts))))
    : MAX_ATTEMPTS;
  let prepared: File;
  try {
    prepared = await normalizeOrderAttachmentImage(file);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Не удалось подготовить изображение",
    };
  }

  for (let attempt = 0; attempt < limit; attempt++) {
    if (options?.signal?.aborted) {
      return { ok: false, error: "Отменено" };
    }
    try {
      const headers: Record<string, string> = {
        "content-type": "application/octet-stream",
        "x-upload-filename": encodeURIComponent(prepared.name || "file"),
        "x-upload-mime": prepared.type || "application/octet-stream",
      };
      if (options?.asInvoice) {
        headers["x-as-invoice"] = "1";
      }
      if (options?.paymentSlip) {
        headers["x-attachment-scope"] = "payment-slip";
      }
      const res = await fetch(`/api/orders/${orderId}/attachments`, {
        method: "POST",
        credentials: "include",
        headers,
        body: prepared,
        signal: options?.signal,
      });
      let data: Record<string, unknown> = {};
      try {
        const text = await res.text();
        if (text.trim()) {
          data = JSON.parse(text) as Record<string, unknown>;
        }
      } catch {
        data = {};
      }
      const errStr =
        typeof data.error === "string" && data.error.trim()
          ? data.error.trim()
          : "";
      const detailsStr =
        typeof data.details === "string" && data.details.trim()
          ? data.details.trim()
          : "";
      if (res.ok) {
        const w =
          typeof data.warning === "string" && data.warning.trim()
            ? data.warning.trim()
            : undefined;
        const syncKaiten =
          options?.syncKaitenAfter !== false &&
          !options?.asInvoice &&
          !options?.paymentSlip;
        if (syncKaiten) {
          void requestOrderKaitenAttachmentSync(orderId);
        }
        if (w) {
          return { ok: true, data, warning: w };
        }
        return { ok: true, data };
      }
      if (res.status === 413) {
        return { ok: false, error: ORDER_ATTACHMENT_PAYLOAD_TOO_LARGE_MESSAGE };
      }
      if (errStr && detailsStr && /^не удалось сохранить файл$/i.test(errStr)) {
        lastError = `${errStr}: ${detailsStr}`;
      } else {
        lastError = errStr || detailsStr || `Ошибка загрузки (${res.status})`;
      }
      if (!isRetryableAttachmentUploadHttpStatus(res.status)) {
        return { ok: false, error: lastError };
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return { ok: false, error: "Отменено" };
      }
      lastError =
        e instanceof Error ? e.message : "Сеть недоступна — попробуйте снова";
    }
    if (attempt + 1 < limit) {
      const wait = jitterMs(Math.min(10_000, 280 * 2 ** attempt));
      await sleepMs(wait);
    }
  }
  return { ok: false, error: lastError };
}
