"use client";

import { OrderAccountingFileDropZone } from "@/components/orders/OrderAccountingFileDropZone";

type Props = {
  orderId: string;
  /** После успешной загрузки (счёт или платёжка). */
  onSaved?: () => void;
};

/**
 * Модалка «Статус оплаты» (быстрый доступ): счёт PDF и платёжки — перетаскиванием на зону.
 */
export function OrderPaymentModalAccountingUpload({
  orderId,
  onSaved,
}: Props) {
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
            onUploaded={onSaved}
          />
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
            onUploaded={onSaved}
          />
        </div>
      </div>
    </div>
  );
}
