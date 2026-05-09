"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  looksLikePdfFile,
  looksLikePaymentSlipImageFile,
} from "@/lib/order-accounting-upload-file-kind";
import { postOrderAttachmentWithRetries } from "@/lib/order-attachment-upload-client";
import {
  CRM_UPLOAD_MAX_BYTES,
  formatCrmUploadMaxShortRu,
} from "@/lib/crm-upload-limits";

const UPLOAD_TIMEOUT_MS = 300_000;

type SlipRow = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

type Props = { orderId: string };

export function OrderPaymentSlipsBlock({ orderId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [slips, setSlips] = useState<SlipRow[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadErr(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/payment-slips`, {
        credentials: "include",
      });
      const j = (await res.json()) as SlipRow[] | { error?: string };
      if (!res.ok || !Array.isArray(j)) {
        setLoadErr(
          typeof j === "object" && j && "error" in j && typeof j.error === "string"
            ? j.error
            : "Не удалось загрузить список",
        );
        setSlips([]);
        return;
      }
      setSlips(j);
    } catch {
      setLoadErr("Сеть недоступна");
      setSlips([]);
    }
  }, [orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter(
        (f) => f.size > 0 && f.size <= CRM_UPLOAD_MAX_BYTES,
      );
      if (arr.length === 0) {
        setHint(`Нет файла (макс. ${formatCrmUploadMaxShortRu()})`);
        return;
      }
      setBusy(true);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
      try {
        let uploadedCount = 0;
        for (let i = 0; i < arr.length; i++) {
          const file = arr[i]!;
          if (i > 0) await new Promise((r) => setTimeout(r, 70));
          if (looksLikePdfFile(file)) {
            setHint("PDF счёта загрузите в поле «Файл счёта» выше.");
            continue;
          }
          if (!looksLikePaymentSlipImageFile(file)) {
            setHint("Платёжка — только изображение.");
            continue;
          }
          setHint("Загрузка…");
          const result = await postOrderAttachmentWithRetries(orderId, file, {
            paymentSlip: true,
            signal: ctrl.signal,
          });
          if (!result.ok) throw new Error(result.error);
          uploadedCount += 1;
        }
        if (uploadedCount > 0) {
          setHint(null);
          await refresh();
        }
      } catch (e) {
        const aborted =
          (e instanceof DOMException && e.name === "AbortError") ||
          (e instanceof Error && e.name === "AbortError");
        setHint(
          aborted
            ? "Таймаут загрузки."
            : e instanceof Error
              ? e.message
              : "Ошибка",
        );
      } finally {
        clearTimeout(timer);
        setBusy(false);
      }
    },
    [orderId, refresh],
  );

  const removeSlip = useCallback(
    async (attachmentId: string) => {
      setDeletingId(attachmentId);
      try {
        const res = await fetch(
          `/api/orders/${orderId}/attachments/${attachmentId}`,
          { method: "DELETE", credentials: "include" },
        );
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j?.error ?? "Не удалось удалить");
        }
        await refresh();
      } catch (e) {
        setHint(e instanceof Error ? e.message : "Ошибка удаления");
      } finally {
        setDeletingId(null);
      }
    },
    [orderId, refresh],
  );

  return (
    <div className="min-w-0 space-y-2">
      <p className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        Платёжки
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const fl = e.target.files;
          e.target.value = "";
          if (fl?.length) void uploadFiles(fl);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-label="Добавить платёжки"
        title="Изображение платёжки; PDF счёта загружается полем «Файл счёта»"
        className="flex w-full min-h-[4.25rem] items-center justify-center rounded-md border border-dashed border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-2 text-center text-[0.65rem] leading-snug text-[var(--text-secondary)] shadow-sm hover:border-[var(--sidebar-blue)] hover:text-[var(--text-strong)] disabled:opacity-60 sm:text-xs"
      >
        {busy ? hint ?? "Загрузка…" : "↓ Добавить скрины платежей"}
      </button>
      {hint && !busy ? (
        <p className="text-[0.65rem] text-[var(--text-muted)]">{hint}</p>
      ) : null}
      {loadErr ? (
        <p className="text-[0.65rem] text-red-600">{loadErr}</p>
      ) : null}
      {slips && slips.length > 0 ? (
        <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] p-1.5">
          {slips.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-1 text-[0.65rem] text-[var(--text-strong)] sm:text-xs"
            >
              <a
                href={`/api/orders/${orderId}/attachments/${s.id}`}
                download={s.fileName}
                className="min-w-0 flex-1 truncate underline decoration-[var(--text-muted)]/50 underline-offset-2 hover:decoration-[var(--sidebar-blue)]"
                title={s.fileName}
              >
                {s.fileName}
              </a>
              <button
                type="button"
                disabled={deletingId === s.id}
                onClick={() => void removeSlip(s.id)}
                className="shrink-0 text-red-600 hover:underline disabled:opacity-50"
              >
                {deletingId === s.id ? "…" : "×"}
              </button>
            </li>
          ))}
        </ul>
      ) : slips && slips.length === 0 ? (
        <p className="text-[0.65rem] text-[var(--text-muted)]">Пока нет</p>
      ) : null}
    </div>
  );
}
