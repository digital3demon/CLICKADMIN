"use client";

import { createPortal } from "react-dom";
import { OrderSourceEmailsPanel } from "@/components/orders/OrderSourceEmailsPanel";

export function OrderSourceEmailsModal({
  orderId,
  orderNumber,
  onClose,
  hideReplyStatus = false,
}: {
  orderId: string;
  orderNumber?: string | null;
  onClose: () => void;
  hideReplyStatus?: boolean;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Письма наряда"
      onClick={onClose}
    >
      <div
        className="flex h-[min(90dvh,820px)] w-full max-w-[min(96vw,88rem)] flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-end border-b border-[var(--card-border)] px-3 py-2">
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
        <OrderSourceEmailsPanel
          orderId={orderId}
          orderNumber={orderNumber}
          hideReplyStatus={hideReplyStatus}
        />
      </div>
    </div>,
    document.body,
  );
}
