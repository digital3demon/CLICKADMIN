"use client";

import { useCallback, useEffect, useState } from "react";
import { OrderAccountingFileDropZone } from "@/components/orders/OrderAccountingFileDropZone";

type SlipRow = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

type Props = { orderId: string };

export function OrderPaymentSlipsBlock({ orderId }: Props) {
  const [slips, setSlips] = useState<SlipRow[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadErr(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/payment-slips`, {
        credentials: "include",
      });
      const j = (await res.json()) as SlipRow[] | { error?: string };
      if (!res.ok || !Array.isArray(j)) {
        setLoadErr(
          typeof j === "object" && j && "error" in j && typeof j.error === "string"
            ? j.error
            : "Не удалось загрузить список",
        );
        setSlips([]);
        return;
      }
      setSlips(j);
    } catch {
      setLoadErr("Сеть недоступна");
      setSlips([]);
    }
  }, [orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const removeSlip = useCallback(
    async (attachmentId: string) => {
      setDeletingId(attachmentId);
      try {
        const res = await fetch(
          `/api/orders/${orderId}/attachments/${attachmentId}`,
          { method: "DELETE", credentials: "include" },
        );
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j?.error ?? "Не удалось удалить");
        }
        await refresh();
      } catch (e) {
        setHint(e instanceof Error ? e.message : "Ошибка удаления");
      } finally {
        setDeletingId(null);
      }
    },
    [orderId, refresh],
  );

  return (
    <div className="min-w-0 space-y-2">
      <p className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        Платёжки
      </p>
      <OrderAccountingFileDropZone
        orderId={orderId}
        kind="payment-slip"
        multiple
        idleLabel="Перетащите или Ctrl+V · скрин/PDF"
        onUploaded={() => refresh()}
        onHint={setHint}
      />
      {hint ? (
        <p className="text-[0.65rem] text-[var(--text-muted)] sm:text-xs">{hint}</p>
      ) : null}
      {loadErr ? (
        <p className="text-[0.65rem] text-red-600">{loadErr}</p>
      ) : null}
      {slips && slips.length > 0 ? (
        <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] p-1.5">
          {slips.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-1 text-[0.65rem] text-[var(--text-strong)] sm:text-xs"
            >
              <a
                href={`/api/orders/${orderId}/attachments/${s.id}`}
                download={s.fileName}
                className="min-w-0 flex-1 truncate underline decoration-[var(--text-muted)]/50 underline-offset-2 hover:decoration-[var(--sidebar-blue)]"
                title={s.fileName}
              >
                {s.fileName}
              </a>
              <button
                type="button"
                disabled={deletingId === s.id}
                onClick={() => void removeSlip(s.id)}
                className="shrink-0 text-red-600 hover:underline disabled:opacity-50"
              >
                {deletingId === s.id ? "…" : "×"}
              </button>
            </li>
          ))}
        </ul>
      ) : slips && slips.length === 0 ? (
        <p className="text-[0.65rem] text-[var(--text-muted)]">Пока нет</p>
      ) : null}
    </div>
  );
}
