"use client";

import { useEffect, useState } from "react";
import { orderPathById } from "@/lib/order-public-ref";

export function ClientOrderPreviewButton({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const href = orderPathById(orderId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="font-mono font-medium text-[var(--sidebar-blue)] underline-offset-2 hover:underline"
        onClick={() => setOpen(true)}
      >
        {orderNumber}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/55 p-3 sm:p-5"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Наряд ${orderNumber}`}
            className="flex h-[min(92vh,980px)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-[var(--app-text)]">
                  Наряд {orderNumber}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                >
                  Открыть отдельно
                </a>
                <button
                  type="button"
                  className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                  onClick={() => setOpen(false)}
                >
                  Закрыть
                </button>
              </div>
            </div>
            <iframe
              title={`Наряд ${orderNumber}`}
              src={href}
              className="min-h-0 flex-1 bg-[var(--app-bg)]"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
