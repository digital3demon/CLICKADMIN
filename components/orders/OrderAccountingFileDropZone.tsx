"use client";

import { useCallback, useRef, useState } from "react";
import {
  looksLikePdfFileDeep,
  looksLikePaymentSlipFileDeep,
} from "@/lib/order-accounting-upload-file-kind";
import { postOrderAttachmentWithRetries } from "@/lib/order-attachment-upload-client";
import {
  CRM_UPLOAD_MAX_BYTES,
  formatCrmUploadMaxShortRu,
} from "@/lib/crm-upload-limits";

const UPLOAD_TIMEOUT_MS = 300_000;

export type OrderAccountingDropKind = "invoice" | "payment-slip";

type Props = {
  orderId: string;
  kind: OrderAccountingDropKind;
  /** Платёжки — несколько файлов за раз. */
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  idleLabel: string;
  onUploaded?: (meta?: { id: string }) => void | Promise<void>;
  onHint?: (msg: string | null) => void;
};

async function fileMatchesKind(
  file: File,
  kind: OrderAccountingDropKind,
): Promise<boolean> {
  return kind === "invoice"
    ? looksLikePdfFileDeep(file)
    : looksLikePaymentSlipFileDeep(file);
}

function kindMismatchHint(kind: OrderAccountingDropKind): string {
  return kind === "invoice"
    ? "Счёт — только PDF."
    : "Платёжка — изображение или PDF.";
}

export function OrderAccountingFileDropZone({
  orderId,
  kind,
  multiple = false,
  disabled = false,
  className,
  idleLabel,
  onUploaded,
  onHint,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localHint, setLocalHint] = useState<string | null>(null);

  const setHint = useCallback(
    (msg: string | null) => {
      setLocalHint(msg);
      onHint?.(msg);
    },
    [onHint],
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled) return;
      const arr = Array.from(files).filter(
        (f) => f.size > 0 && f.size <= CRM_UPLOAD_MAX_BYTES,
      );
      if (arr.length === 0) {
        setHint(`Нет подходящего файла (макс. ${formatCrmUploadMaxShortRu()})`);
        return;
      }
      if (!multiple && arr.length > 1) {
        setHint("Загружайте по одному файлу.");
        return;
      }

      setBusy(true);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
      try {
        let uploaded = 0;
        for (let i = 0; i < arr.length; i++) {
          const file = arr[i]!;
          if (i > 0) await new Promise((r) => setTimeout(r, 70));
          if (!(await fileMatchesKind(file, kind))) {
            setHint(kindMismatchHint(kind));
            continue;
          }
          setHint(
            kind === "invoice" ? "Загрузка счёта…" : "Сохранение платёжки…",
          );
          const result = await postOrderAttachmentWithRetries(orderId, file, {
            asInvoice: kind === "invoice",
            paymentSlip: kind === "payment-slip",
            signal: ctrl.signal,
          });
          if (!result.ok) throw new Error(result.error);
          const j = result.data as { id?: string };
          if (!j.id || typeof j.id !== "string") {
            throw new Error("Сервер не вернул id вложения");
          }
          uploaded += 1;

          if (kind === "invoice") {
            setHint("Разбор PDF счёта…");
            await fetch(`/api/orders/${orderId}/invoice-parse`, {
              method: "POST",
              credentials: "include",
            }).catch(() => {});
          }
        }
        if (uploaded > 0) {
          setHint(
            kind === "invoice"
              ? "Счёт сохранён."
              : uploaded === 1
                ? "Платёжка сохранена."
                : `Сохранено платёжек: ${uploaded}.`,
          );
          await Promise.resolve(onUploaded?.({ id: j.id }));
        }
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
    [disabled, kind, multiple, onUploaded, orderId, setHint],
  );

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current += 1;
      if (e.dataTransfer?.types.includes("Files")) {
        setDragOver(true);
      }
    },
    [disabled],
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setDragOver(false);
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    },
    [disabled],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current = 0;
      setDragOver(false);
      const fl = e.dataTransfer?.files;
      if (fl?.length) void uploadFiles(fl);
    },
    [disabled, uploadFiles],
  );

  const accept =
    kind === "invoice"
      ? "application/pdf,.pdf"
      : "application/pdf,image/*,.heic,.heif";

  return (
    <div className="min-w-0 space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={disabled || busy}
        onChange={(e) => {
          const fl = e.target.files;
          e.target.value = "";
          if (fl?.length) void uploadFiles(fl);
        }}
      />
      <div
        ref={zoneRef}
        data-order-accounting-upload="true"
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-busy={busy}
        aria-label={idleLabel}
        title="Перетащите файл на зону; при наведении курсора — Ctrl+V из буфера; клик — выбор файла"
        onMouseEnter={() => {
          if (disabled || busy) return;
          zoneRef.current?.focus({ preventScroll: true });
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onPaste={(e) => {
          if (disabled) return;
          const fl = e.clipboardData?.files;
          if (fl?.length) {
            e.preventDefault();
            e.stopPropagation();
            void uploadFiles(fl);
          }
        }}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => {
          if (!disabled && !busy) inputRef.current?.click();
        }}
        className={[
          "flex min-h-[4.25rem] cursor-pointer items-center justify-center rounded-md border border-dashed px-2 py-2 text-center text-xs leading-snug outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-500/80 disabled:cursor-not-allowed disabled:opacity-60",
          dragOver
            ? "border-[var(--sidebar-blue)] bg-sky-50/80 text-[var(--sidebar-blue)] dark:bg-sky-950/40"
            : "border-[var(--card-border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[var(--sidebar-blue)] hover:text-[var(--text-strong)]",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {busy ? localHint ?? "Подождите…" : dragOver ? "Отпустите файл" : idleLabel}
      </div>
      {localHint && !busy ? (
        <p className="text-[0.65rem] text-[var(--text-muted)] sm:text-xs">
          {localHint}
        </p>
      ) : null}
    </div>
  );
}
