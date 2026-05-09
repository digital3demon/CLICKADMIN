"use client";

import { useCallback, useRef, useState } from "react";
import {
  looksLikePaymentSlipImageFile,
  looksLikePdfFile,
} from "@/lib/order-accounting-upload-file-kind";
import { postOrderAttachmentWithRetries } from "@/lib/order-attachment-upload-client";
import {
  CRM_UPLOAD_MAX_BYTES,
  formatCrmUploadMaxShortRu,
} from "@/lib/crm-upload-limits";

const UPLOAD_TIMEOUT_MS = 300_000;

type Props = {
  orderId: string;
  /** После успешной загрузки (счёт или платёжка). */
  onSaved?: () => void;
};

/**
 * Модалка «Статус оплаты»: PDF → как счёт (бух-логика + разбор), изображение → платёжка без разбора.
 */
export function OrderPaymentModalAccountingUpload({
  orderId,
  onSaved,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter(
        (f) => f.size > 0 && f.size <= CRM_UPLOAD_MAX_BYTES,
      );
      if (arr.length === 0) {
        setHint(`Нет подходящего файла (макс. ${formatCrmUploadMaxShortRu()})`);
        return;
      }
      if (arr.length > 1) {
        setHint("Загружайте по одному файлу.");
        return;
      }
      const file = arr[0]!;
      if (looksLikePdfFile(file)) {
        //
      } else if (!looksLikePaymentSlipImageFile(file)) {
        setHint("Для счёта — PDF; для платёжки — изображение (png, jpg, webp …).");
        return;
      }

      setBusy(true);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
      try {
        const asInvoice = looksLikePdfFile(file);
        setHint(asInvoice ? "Загрузка счёта…" : "Сохранение платёжки…");
        const result = await postOrderAttachmentWithRetries(orderId, file, {
          asInvoice,
          paymentSlip: !asInvoice,
          signal: ctrl.signal,
        });
        if (!result.ok) throw new Error(result.error);
        const j = result.data as { id?: string };
        if (!j.id || typeof j.id !== "string") {
          throw new Error("Сервер не вернул id вложения");
        }

        if (asInvoice) {
          setHint("Разбор PDF счёта…");
          await fetch(`/api/orders/${orderId}/invoice-parse`, {
            method: "POST",
            credentials: "include",
          }).catch(() => {});
        }

        setHint(asInvoice ? "Счёт сохранён и разобран." : "Платёжка сохранена.");
        onSaved?.();
      } catch (e) {
        const aborted =
          (e instanceof DOMException && e.name === "AbortError") ||
          (e instanceof Error && e.name === "AbortError");
        setHint(
          aborted
            ? "Сервер не ответил вовремя."
            : e instanceof Error
              ? e.message
              : "Ошибка загрузки",
        );
      } finally {
        clearTimeout(timer);
        setBusy(false);
      }
    },
    [orderId, onSaved],
  );

  return (
    <div className="mt-4 min-w-0 space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Файлы бух-блока
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*,.heic,.heif"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const fl = e.target.files;
          e.target.value = "";
          if (fl?.length) void uploadFiles(fl);
        }}
      />
      <div
        tabIndex={0}
        role="button"
        aria-busy={busy}
        aria-label="Загрузить счёт PDF или платёжку"
        title="PDF — счёт; изображение — платёжка. При фокусе — Ctrl+V."
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onPaste={(e) => {
          const fl = e.clipboardData?.files;
          if (fl?.length) {
            e.preventDefault();
            void uploadFiles(fl);
          }
        }}
        onClick={() => {
          if (!busy) inputRef.current?.click();
        }}
        className="cursor-pointer rounded-md border border-dashed border-[var(--card-border)] bg-[var(--surface-muted)] px-2 py-2 text-center text-xs leading-snug text-[var(--text-secondary)] hover:border-[var(--sidebar-blue)] hover:text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
      >
        {busy
          ? hint ?? "Подождите…"
          : "Счёт (PDF) или платёжка (картинка) — клик / Ctrl+V"}
      </div>
      {hint ? (
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
