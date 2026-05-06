/**
 * Повторы загрузки вложения к наряду (новый заказ / редактирование): сеть, таймаут, занятость БД, всплески.
 */

const MAX_ATTEMPTS = 6;

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
    signal?: AbortSignal;
  },
): Promise<PostOrderAttachmentResult> {
  let lastError = "Не удалось сохранить файл";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (options?.signal?.aborted) {
      return { ok: false, error: "Отменено" };
    }
    try {
      const headers: Record<string, string> = {
        "content-type": "application/octet-stream",
        "x-upload-filename": encodeURIComponent(file.name || "file"),
        "x-upload-mime": file.type || "application/octet-stream",
      };
      if (options?.asInvoice) {
        headers["x-as-invoice"] = "1";
      }
      const res = await fetch(`/api/orders/${orderId}/attachments`, {
        method: "POST",
        credentials: "include",
        headers,
        body: file,
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
        if (w) {
          return { ok: true, data, warning: w };
        }
        return { ok: true, data };
      }
      lastError =
        errStr || detailsStr || `Ошибка загрузки (${res.status})`;
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
    const wait = jitterMs(Math.min(10_000, 280 * 2 ** attempt));
    await sleepMs(wait);
  }
  return { ok: false, error: lastError };
}
