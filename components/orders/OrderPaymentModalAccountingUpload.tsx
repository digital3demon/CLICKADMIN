"use client";

import { OrderAccountingFileDropZone } from "@/components/orders/OrderAccountingFileDropZone";

type Props = {
  orderId: string;
  /** ID файла счёта — кнопка печати только если PDF уже есть. */
  invoiceAttachmentId?: string | null;
  printBusy?: boolean;
  onPrintInvoice?: () => void;
  /** После успешной загрузки (счёт или платёжка). */
  onSaved?: (meta?: {
    kind: "invoice" | "payment-slip";
    id?: string;
  }) => void;
};

/**
 * Модалка «Статус оплаты» (быстрый доступ): счёт PDF и платёжки — перетаскиванием на зону.
 */
export function OrderPaymentModalAccountingUpload({
  orderId,
  invoiceAttachmentId = null,
  printBusy = false,
  onPrintInvoice,
  onSaved,
}: Props) {
  const canPrint = Boolean((invoiceAttachmentId || "").trim());
  return (
    <div className="mt-4 min-w-0 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Файлы бух-блока
      </p>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Счёт
          </p>
          <OrderAccountingFileDropZone
            orderId={orderId}
            kind="invoice"
            idleLabel="PDF · перетащите или Ctrl+V"
            onUploaded={(meta) =>
              onSaved?.({ kind: "invoice", id: meta?.id })
            }
          />
          {canPrint && onPrintInvoice ? (
            <button
              type="button"
              disabled={printBusy}
              title="Печать PDF счёта, затем отметка «Счёт распечатан»"
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] hover:border-[var(--sidebar-blue)]/45 hover:bg-[var(--surface-hover)] disabled:opacity-40"
              onClick={() => onPrintInvoice()}
            >
              {printBusy ? "Печать…" : "печать счета"}
            </button>
          ) : null}
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Платёжка
          </p>
          <OrderAccountingFileDropZone
            orderId={orderId}
            kind="payment-slip"
            multiple
            idleLabel="Скрин/PDF · перетащите или Ctrl+V"
            onUploaded={(meta) =>
              onSaved?.({ kind: "payment-slip", id: meta?.id })
            }
          />
        </div>
      </div>
    </div>
  );
}
