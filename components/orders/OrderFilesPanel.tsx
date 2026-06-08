"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CRM_UPLOAD_MAX_BYTES,
  CRM_UPLOAD_TOO_LARGE_MESSAGE,
} from "@/lib/crm-upload-limits";
import {
  normalizeOrderAttachmentUploadQueue,
} from "@/lib/order-attachment-upload-client";
import {
  enqueueOrderAttachmentFiles,
  listQueuedOrderAttachmentFiles,
  type QueuedOrderAttachmentMeta,
} from "@/lib/order-attachment-background-queue";

const MAX_BYTES = CRM_UPLOAD_MAX_BYTES;

type AttachmentMeta = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedToKaitenAt: string | null;
};

type PendingLoadingFile = {
  key: string;
  name: string;
  size: number;
};

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Превью в списке: по MIME или расширению (HEIC в браузере может не отрисоваться). */
function isOrderAttachmentImage(mimeType: string, fileName: string): boolean {
  const t = (mimeType || "").trim().toLowerCase();
  if (t.startsWith("image/")) return true;
  const n = (fileName || "").trim();
  return /\.(jpe?g|png|gif|webp|bmp|tif|tiff|heic|heif)$/i.test(n);
}

type OrderImageViewerItem = { id: string; fileName: string; url: string };
type OrderImageViewerState = { images: OrderImageViewerItem[]; index: number };

function OrderAttachmentThumbButton({
  href,
  fileName,
  onOpen,
}: {
  href: string;
  fileName: string;
  onOpen: () => void;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-[var(--card-border)] bg-[var(--surface-muted)] text-[0.65rem] leading-tight text-[var(--text-muted)] sm:h-12 sm:w-12"
        title={`Просмотр: ${fileName}`}
        aria-label={`Просмотр: ${fileName}`}
      >
        …
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative mt-0.5 shrink-0 overflow-hidden rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] shadow-sm outline-none ring-offset-2 ring-offset-[var(--card-bg)] focus-visible:ring-2 focus-visible:ring-[var(--sidebar-blue)]"
      aria-label={`Просмотр: ${fileName}`}
      title="Просмотр"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={href}
        alt=""
        loading="lazy"
        className="h-11 w-11 object-cover sm:h-12 sm:w-12"
        onError={() => setBroken(true)}
      />
    </button>
  );
}

function OrderAttachmentsImageViewerOverlay({
  state,
  onClose,
  onPrev,
  onNext,
}: {
  state: OrderImageViewerState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const current = state.images[state.index];
  if (!current) return null;
  const count = state.images.length;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр изображения"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-3xl rounded-xl border border-white/10 bg-zinc-950 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-white">
          <p
            className="min-w-0 truncate text-xs font-medium sm:text-sm"
            title={current.fileName}
          >
            {current.fileName}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={current.url}
              download={current.fileName}
              className="rounded-md border border-white/20 px-2 py-1 text-[11px] text-white/90 hover:bg-white/10 sm:text-xs"
            >
              Скачать
            </a>
            {count > 1 ? (
              <span className="tabular-nums text-[11px] text-white/60">
                {state.index + 1}/{count}
              </span>
            ) : null}
            <button
              type="button"
              className="rounded-md bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20 sm:text-xs"
              onClick={onClose}
            >
              Закрыть
            </button>
          </div>
        </header>
        <div className="relative flex min-h-[12rem] items-center justify-center p-2 sm:min-h-[16rem] sm:p-4">
          {count > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70 sm:left-2"
                aria-label="Предыдущее"
                onClick={onPrev}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70 sm:right-2"
                aria-label="Следующее"
                onClick={onNext}
              >
                ›
              </button>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.fileName}
            className="max-h-[min(70vh,620px)] max-w-full rounded-md object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export function OrderFilesPanel({
  orderId,
  orderNumber,
  listenPaste,
  pendingFiles,
  pendingLoadingFiles = [],
  onPendingChange,
  onServerListChange,
}: {
  /** null — черновик: файлы только в pendingFiles до сохранения наряда */
  orderId: string | null;
  orderNumber?: string | null;
  /** Вешать обработчик вставки на window (только если в буфере есть файлы) */
  listenPaste: boolean;
  pendingFiles?: File[];
  pendingLoadingFiles?: PendingLoadingFile[];
  onPendingChange?: (files: File[]) => void;
  /** После загрузки/удаления на сервере */
  onServerListChange?: () => void;
}) {
  const [list, setList] = useState<AttachmentMeta[]>([]);
  const [queued, setQueued] = useState<QueuedOrderAttachmentMeta[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadWarn, setUploadWarn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kaitenPushId, setKaitenPushId] = useState<string | null>(null);
  const [kaitenPushError, setKaitenPushError] = useState<string | null>(null);
  const [imageViewer, setImageViewer] = useState<OrderImageViewerState | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const listInFlightRef = useRef(false);
  const nextListPollAllowedAtRef = useRef(0);
  const listErrorBackoffMsRef = useRef(0);

  const parseRetryAfterMs = (value: string | null): number => {
    const raw = String(value || "").trim();
    if (!raw) return 0;
    const asSeconds = Number.parseInt(raw, 10);
    if (Number.isFinite(asSeconds) && asSeconds > 0) {
      return asSeconds * 1000;
    }
    const dateMs = Date.parse(raw);
    if (Number.isFinite(dateMs)) {
      return Math.max(0, dateMs - Date.now());
    }
    return 0;
  };

  const refreshList = useCallback(async () => {
    if (!orderId) return;
    const now = Date.now();
    if (listInFlightRef.current) return;
    if (nextListPollAllowedAtRef.current > now) return;
    listInFlightRef.current = true;
    setLoadError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/attachments`);
      if (!res.ok) {
        if (res.status === 429) {
          const retryMs = Math.max(
            30_000,
            parseRetryAfterMs(res.headers.get("Retry-After")),
          );
          nextListPollAllowedAtRef.current = Date.now() + retryMs;
          // Список уже мог быть загружен, поэтому 429 от фонового обновления не показываем как ошибку.
          setLoadError(null);
          return;
        }
        throw new Error("fail");
      }
      const data = (await res.json()) as AttachmentMeta[];
      setList(data);
      listErrorBackoffMsRef.current = 0;
      nextListPollAllowedAtRef.current = 0;
    } catch {
      listErrorBackoffMsRef.current = Math.min(
        60_000,
        Math.max(4000, listErrorBackoffMsRef.current * 2 || 4000),
      );
      nextListPollAllowedAtRef.current = Date.now() + listErrorBackoffMsRef.current;
      setLoadError("Не удалось загрузить список файлов");
    } finally {
      listInFlightRef.current = false;
    }
  }, [orderId]);

  const refreshQueueList = useCallback(async () => {
    if (!orderId) {
      setQueued([]);
      return;
    }
    try {
      const rows = await listQueuedOrderAttachmentFiles(orderId);
      setQueued(rows);
    } catch {
      setQueued([]);
    }
  }, [orderId]);

  useEffect(() => {
    void refreshList();
    void refreshQueueList();
  }, [refreshList, refreshQueueList]);

  useEffect(() => {
    if (!orderId) return;
    const hasQueue = queued.length > 0;
    const pollMs = hasQueue || busy ? 7000 : 20_000;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshList();
      void refreshQueueList();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [orderId, queued.length, busy, refreshList, refreshQueueList]);

  const addPending = useCallback(
    (files: FileList | File[]) => {
      const raw = Array.from(files);
      const arr = raw.filter((f) => f.size > 0 && f.size <= MAX_BYTES);
      const tooLargeFound = raw.some((f) => f.size > MAX_BYTES);
      if (tooLargeFound) {
        setLoadError(CRM_UPLOAD_TOO_LARGE_MESSAGE);
      }
      if (arr.length === 0) return;
      if (!onPendingChange) return;
      const cur = pendingFiles ?? [];
      const names = new Set(cur.map((f) => `${f.name}-${f.size}`));
      const next = [...cur];
      for (const f of arr) {
        const key = `${f.name}-${f.size}`;
        if (!names.has(key)) {
          names.add(key);
          next.push(f);
        }
      }
      onPendingChange(next);
    },
    [onPendingChange, pendingFiles],
  );

  const uploadServer = useCallback(
    async (files: FileList | File[]) => {
      if (!orderId) return;
      const normalized = normalizeOrderAttachmentUploadQueue(files, MAX_BYTES);
      const arr = normalized.queue;
      setBusy(true);
      setUploadWarn(null);
      setLoadError(null);
      if (normalized.skippedTooLarge) {
        setLoadError(CRM_UPLOAD_TOO_LARGE_MESSAGE);
      }
      if (arr.length === 0) {
        setBusy(false);
        return;
      }
      try {
        const enqueued = await enqueueOrderAttachmentFiles({
          orderId,
          orderNumber: orderNumber ?? orderId,
          files: arr,
        });
        await refreshQueueList();
        if (enqueued > 0) {
          setUploadWarn(
            enqueued === 1
              ? "Файл поставлен в очередь загрузки."
              : `Файлы поставлены в очередь загрузки (${enqueued}).`,
          );
        } else {
          setUploadWarn("Такой файл уже есть в очереди загрузки.");
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setBusy(false);
      }
    },
    [orderId, orderNumber, refreshQueueList],
  );

  const onPickFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fl = e.target.files;
      e.target.value = "";
      if (!fl?.length) return;
      if (orderId) void uploadServer(fl);
      else addPending(fl);
    },
    [orderId, uploadServer, addPending],
  );

  useEffect(() => {
    if (!listenPaste) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (!files?.length) return;
      e.preventDefault();
      if (orderId) void uploadServer(files);
      else addPending(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [listenPaste, orderId, uploadServer, addPending]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const fl = e.dataTransfer?.files;
      if (!fl?.length) return;
      if (orderId) void uploadServer(fl);
      else addPending(fl);
    },
    [orderId, uploadServer, addPending],
  );

  const handlePasteZone = useCallback(
    (e: React.ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (!files?.length) return;
      e.preventDefault();
      if (orderId) void uploadServer(files);
      else addPending(files);
    },
    [orderId, uploadServer, addPending],
  );

  const removePending = useCallback(
    (idx: number) => {
      if (!onPendingChange || !pendingFiles) return;
      onPendingChange(pendingFiles.filter((_, i) => i !== idx));
    },
    [onPendingChange, pendingFiles],
  );

  const deleteServer = useCallback(
    async (attachmentId: string) => {
      if (!orderId) return;
      setBusy(true);
      try {
        const res = await fetch(
          `/api/orders/${orderId}/attachments/${attachmentId}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Не удалось удалить");
        await refreshList();
        await refreshQueueList();
        onServerListChange?.();
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Ошибка удаления");
      } finally {
        setBusy(false);
      }
    },
    [orderId, refreshList, refreshQueueList, onServerListChange],
  );

  const retryKaitenPush = useCallback(
    async (attachmentId: string) => {
      if (!orderId) return;
      setKaitenPushId(attachmentId);
      setKaitenPushError(null);
      try {
        const res = await fetch(
          `/api/orders/${orderId}/attachments/${attachmentId}/kaiten-push`,
          { method: "POST" },
        );
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setKaitenPushError(data.error ?? "Не удалось выгрузить в Kaiten");
          return;
        }
        await refreshList();
        onServerListChange?.();
      } catch {
        setKaitenPushError("Сеть недоступна");
      } finally {
        setKaitenPushId(null);
      }
    },
    [orderId, refreshList, onServerListChange],
  );

  const imageAttachments = useMemo(() => {
    if (!orderId) return [];
    return list.filter((a) =>
      isOrderAttachmentImage(a.mimeType, a.fileName),
    );
  }, [list, orderId]);

  const openImageViewer = useCallback(
    (attachmentId: string) => {
      if (!orderId) return;
      const images: OrderImageViewerItem[] = imageAttachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        url: `/api/orders/${orderId}/attachments/${a.id}`,
      }));
      const index = images.findIndex((x) => x.id === attachmentId);
      if (index < 0) return;
      setImageViewer({ images, index });
    },
    [orderId, imageAttachments],
  );

  useEffect(() => {
    if (!imageViewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setImageViewer(null);
        return;
      }
      if (imageViewer.images.length < 2) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setImageViewer((s) =>
          s
            ? {
                ...s,
                index:
                  (s.index - 1 + s.images.length) % s.images.length,
              }
            : s,
        );
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setImageViewer((s) =>
          s
            ? {
                ...s,
                index: (s.index + 1) % s.images.length,
              }
            : s,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imageViewer]);

  return (
    <div className="space-y-4">
      <div
        tabIndex={0}
        role="group"
        aria-label="Зона загрузки файлов: выбор, перетаскивание, вставка из буфера"
        title="Перетащите файлы сюда, нажмите кнопку или вставьте файлы (Ctrl+V) при фокусе на этой зоне"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPaste={listenPaste ? undefined : handlePasteZone}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!busy) inputRef.current?.click();
          }
        }}
        className="rounded-xl border-2 border-dashed border-[var(--input-border)] bg-[var(--surface-muted)] px-4 py-6 text-center outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
        >
          {busy ? "Загрузка…" : "Выбрать файлы · Ctrl+V"}
        </button>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          Перетащите файлы в рамку или сфокусируйте её (Tab) и вставьте из буфера
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : null}

      {kaitenPushError ? (
        <p className="text-sm text-red-600">{kaitenPushError}</p>
      ) : null}

      {uploadWarn ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100">
          {uploadWarn}
        </p>
      ) : null}

      {!orderId &&
      ((pendingFiles && pendingFiles.length > 0) || pendingLoadingFiles.length > 0) ? (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            К отправке после сохранения наряда
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {pendingLoadingFiles.map((f) => (
              <li
                key={f.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-amber-50/50 px-3 py-2"
              >
                <span className="truncate text-[var(--text-strong)]">{f.name}</span>
                <span className="text-[var(--text-muted)]">{formatSize(f.size)}</span>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  title="Файл добавляется"
                  aria-label="Файл добавляется"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/favicons/favicon-blue-48.png"
                    alt=""
                    className="h-6 w-6 animate-spin rounded-full object-contain"
                  />
                </span>
              </li>
            ))}
            {(pendingFiles ?? []).map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-amber-50/50 px-3 py-2"
              >
                <span className="truncate text-[var(--text-strong)]">{f.name}</span>
                <span className="text-[var(--text-muted)]">{formatSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => removePending(i)}
                  className="text-xs text-red-600 underline"
                >
                  Убрать
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {orderId && (list.length > 0 || queued.length > 0) ? (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Файлы в наряде
          </h3>
          <ul className="mt-2 divide-y divide-[var(--card-border)] rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
            {list.map((a) => {
              const thumb = isOrderAttachmentImage(a.mimeType, a.fileName);
              const href = `/api/orders/${orderId}/attachments/${a.id}`;
              return (
                <li
                  key={a.id}
                  className="flex items-start gap-2 px-3 py-2 text-sm"
                >
                  {thumb ? (
                    <OrderAttachmentThumbButton
                      href={href}
                      fileName={a.fileName}
                      onOpen={() => openImageViewer(a.id)}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <a
                      href={href}
                      className="block truncate font-medium text-[var(--sidebar-blue)] hover:underline"
                      title={a.fileName}
                      download={a.fileName}
                    >
                      {a.fileName}
                    </a>
                    <div className="text-xs text-[var(--text-muted)]">
                      {formatSize(a.size)}
                      <span className="ml-2 text-emerald-700 dark:text-emerald-400">
                        · в CRM/канбан
                      </span>
                      {a.uploadedToKaitenAt ? (
                        <span className="ml-2 text-emerald-700 dark:text-emerald-400">
                          · в Kaiten
                        </span>
                      ) : (
                        <span className="ml-2 text-amber-700 dark:text-amber-400">
                          · не в Kaiten
                        </span>
                      )}
                    </div>
                    {!a.uploadedToKaitenAt ? (
                      <button
                        type="button"
                        disabled={busy || kaitenPushId === a.id}
                        onClick={() => void retryKaitenPush(a.id)}
                        className="text-xs font-medium text-[var(--sidebar-blue)] hover:underline disabled:opacity-50"
                      >
                        {kaitenPushId === a.id
                          ? "Выгрузка в Kaiten…"
                          : "Повторить выгрузку в Kaiten"}
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={busy || kaitenPushId != null}
                    onClick={() => void deleteServer(a.id)}
                    className="shrink-0 pt-0.5 text-xs text-red-600 underline disabled:opacity-50"
                  >
                    Удалить
                  </button>
                </li>
              );
            })}
            {queued.map((q) => (
              <li
                key={`queued-${q.id}`}
                className="flex items-start gap-2 px-3 py-2 text-sm opacity-90"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span
                    className="block truncate font-medium text-[var(--text-strong)]"
                    title={q.fileName}
                  >
                    {q.fileName}
                  </span>
                  {q.failed && q.error ? (
                    <p className="break-words text-xs font-normal leading-snug text-red-600 dark:text-red-400">
                      {q.error}
                    </p>
                  ) : null}
                  <div className="text-xs text-[var(--text-muted)]">
                    {formatSize(q.size)}
                    {q.failed ? (
                      <span className="ml-2 text-red-700 dark:text-red-400">
                        · не в CRM/канбан · не в Kaiten · загрузка не удалась
                      </span>
                    ) : (
                      <span className="ml-2 text-amber-700 dark:text-amber-400">
                        · не в CRM/канбан · не в Kaiten · загружается
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {orderId && list.length === 0 && queued.length === 0 && !loadError ? (
        <p className="text-sm text-[var(--text-muted)]">Пока нет прикреплённых файлов.</p>
      ) : null}

      {imageViewer && typeof document !== "undefined"
        ? createPortal(
            <OrderAttachmentsImageViewerOverlay
              state={imageViewer}
              onClose={() => setImageViewer(null)}
              onPrev={() =>
                setImageViewer((s) =>
                  s && s.images.length > 1
                    ? {
                        ...s,
                        index:
                          (s.index - 1 + s.images.length) %
                          s.images.length,
                      }
                    : s,
                )
              }
              onNext={() =>
                setImageViewer((s) =>
                  s && s.images.length > 1
                    ? {
                        ...s,
                        index: (s.index + 1) % s.images.length,
                      }
                    : s,
                )
              }
            />,
            document.body,
          )
        : null}
    </div>
  );
}
