"use client";

import { OrderAccountingFileDropZone } from "@/components/orders/OrderAccountingFileDropZone";

type Props = {
  orderId: string;
  /** ID файла счёта — кнопка печати только если PDF уже есть. */
  invoiceAttachmentId?: string | null;
  updAttachmentId?: string | null;
  printBusy?: boolean;
  onPrintInvoice?: () => void;
  onPrintUpd?: () => void;
  /** После успешной загрузки (счёт, УПД или платёжка). */
  onSaved?: (meta?: {
    kind: "invoice" | "upd" | "payment-slip";
    id?: string;
  }) => void;
};

/**
 * Модалка «Статус оплаты» (быстрый доступ): счёт PDF, УПД и платёжки.
 */
export function OrderPaymentModalAccountingUpload({
  orderId,
  invoiceAttachmentId = null,
  updAttachmentId = null,
  printBusy = false,
  onPrintInvoice,
  onPrintUpd,
  onSaved,
}: Props) {
  const canPrintInvoice = Boolean((invoiceAttachmentId || "").trim());
  const canPrintUpd = Boolean((updAttachmentId || "").trim());
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
          {canPrintInvoice && onPrintInvoice ? (
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
            УПД
          </p>
          <OrderAccountingFileDropZone
            orderId={orderId}
            kind="upd"
            idleLabel="PDF · перетащите или Ctrl+V"
            onUploaded={(meta) => onSaved?.({ kind: "upd", id: meta?.id })}
          />
          {canPrintUpd && onPrintUpd ? (
            <button
              type="button"
              disabled={printBusy}
              title="Печать PDF УПД, затем отметка «УПД распечатан»"
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] hover:border-[var(--sidebar-blue)]/45 hover:bg-[var(--surface-hover)] disabled:opacity-40"
              onClick={() => onPrintUpd()}
            >
              {printBusy ? "Печать…" : "печать УПД"}
            </button>
          ) : null}
        </div>
        <div className="min-w-0 space-y-1 sm:col-span-2">
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
