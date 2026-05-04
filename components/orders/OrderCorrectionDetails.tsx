"use client";

import type { OrderCorrectionTrackValue } from "@/lib/order-correction-track";

type OrderCorrectionDetailsProps = {
  track: OrderCorrectionTrackValue | null;
  reason: string;
  paid: boolean;
  reasonId: string;
  onReasonChange: (value: string) => void;
  onPaidChange: (value: boolean) => void;
};

export function OrderCorrectionDetails({
  track,
  reason,
  paid,
  reasonId,
  onReasonChange,
  onPaidChange,
}: OrderCorrectionDetailsProps) {
  if (track == null) return null;

  return (
    <div className="mt-2 space-y-2 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 py-2">
      <label
        className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
        htmlFor={reasonId}
      >
        {track === "REWORK" ? "Причина переделки" : "Причина коррекции"}
      </label>
      <textarea
        id={reasonId}
        className="min-h-16 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="Кратко опишите причину"
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <label className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
          <input
            type="radio"
            className="h-3.5 w-3.5"
            checked={paid}
            onChange={() => onPaidChange(true)}
          />
          Платно
        </label>
        <label className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
          <input
            type="radio"
            className="h-3.5 w-3.5"
            checked={!paid}
            onChange={() => onPaidChange(false)}
          />
          Бесплатно
        </label>
      </div>
      <p className="text-[10px] leading-snug text-[var(--text-muted)]">
        Платно — за счёт заказчика; сумму укажите в составе заказа строкой
        прайса «КП · Коррекция / переделка». Бесплатно — за счёт лаборатории.
      </p>
    </div>
  );
}
