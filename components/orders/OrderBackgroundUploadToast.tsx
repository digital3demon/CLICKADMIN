"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  dismissBackgroundOrderUpload,
  hasUploadingBackgroundOrderUploads,
  retryBackgroundOrderUpload,
  snapshotBackgroundOrderUploads,
  subscribeBackgroundOrderUploads,
} from "@/lib/background-order-upload-tracker";
import {
  cancelOrderAttachmentBackgroundUpload,
  kickOrderAttachmentBackgroundProcessor,
} from "@/lib/order-attachment-background-queue";

export function OrderBackgroundUploadToast() {
  const items = useSyncExternalStore(
    subscribeBackgroundOrderUploads,
    snapshotBackgroundOrderUploads,
    snapshotBackgroundOrderUploads,
  );

  useEffect(() => {
    // Resume unfinished uploads after hard refresh/reopen.
    kickOrderAttachmentBackgroundProcessor();
  }, []);

  useEffect(() => {
    if (!hasUploadingBackgroundOrderUploads()) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[120] flex max-w-[min(92vw,26rem)] flex-col gap-2 shell-short:bottom-2 shell-short:left-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={[
            "pointer-events-auto flex items-center gap-3 rounded-xl border px-3 py-2.5 shadow-lg",
            item.status === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-100"
              : item.status === "failed"
                ? "border-red-300 bg-red-50 text-red-950 dark:border-red-700 dark:bg-red-950/35 dark:text-red-100"
              : "border-[var(--card-border)] bg-[var(--card-bg)]",
          ].join(" ")}
        >
          {item.status === "uploading" ? (
            <button
              type="button"
              className="self-start rounded border border-[var(--card-border)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              title="Отменить загрузку"
              onClick={() => {
                void cancelOrderAttachmentBackgroundUpload(item.orderId);
                dismissBackgroundOrderUpload(item.id);
              }}
            >
              ✕
            </button>
          ) : null}
          {item.status === "success" ? (
            <svg
              viewBox="0 0 20 20"
              aria-hidden
              className="h-6 w-6 text-emerald-600 dark:text-emerald-300"
            >
              <path
                fill="currentColor"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.1 7.1a1 1 0 0 1-1.4 0L3.3 8.9a1 1 0 1 1 1.4-1.4l4.2 4.2 6.4-6.4a1 1 0 0 1 1.4 0Z"
              />
            </svg>
          ) : item.status === "failed" ? (
            <svg
              viewBox="0 0 20 20"
              aria-hidden
              className="h-6 w-6 text-red-600 dark:text-red-300"
            >
              <path
                fill="currentColor"
                d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 4a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V7a1 1 0 0 0-1-1Zm0 8a1.125 1.125 0 1 0 0-2.25A1.125 1.125 0 0 0 10 14Z"
              />
            </svg>
          ) : (
            <>
              <img
                src="/favicons/favicon-blue-48.png"
                alt=""
                aria-hidden
                className="h-6 w-6 animate-spin dark:hidden"
              />
              <img
                src="/favicons/favicon-white-48.png"
                alt=""
                aria-hidden
                className="hidden h-6 w-6 animate-spin dark:block"
              />
            </>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--app-text)]">
              {item.status === "success"
                ? `Файлы по заказу ${item.orderNumber} загружены`
                : item.status === "failed"
                  ? `Файлы по заказу ${item.orderNumber} не загрузились`
                : `Файлы по заказу ${item.orderNumber} загружаются...`}
            </p>
            {item.status === "uploading" ? (
              <p className="text-xs text-[var(--text-secondary)]">
                {`${item.uploaded}/${item.total}`}
              </p>
            ) : item.status === "failed" ? (
              <div className="mt-1 flex items-center gap-2">
                <p className="line-clamp-1 text-xs text-[var(--text-secondary)]">
                  {item.error ?? "Ошибка загрузки"}
                </p>
                <button
                  type="button"
                  className="rounded-md border border-red-300 bg-white/80 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-white dark:border-red-600 dark:bg-transparent dark:text-red-200"
                  onClick={() => {
                    void retryBackgroundOrderUpload(item.id);
                  }}
                >
                  Попробовать еще раз
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

