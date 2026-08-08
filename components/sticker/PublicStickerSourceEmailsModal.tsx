"use client";

import { useEffect, useState } from "react";
import { OrderSourceEmailView } from "@/components/orders/OrderSourceEmailView";
import type { OrderSourceEmailRow } from "@/lib/mail/order-source-emails";

export function PublicStickerSourceEmailsModal({
  tenantSlug,
  token,
  orderNumber,
  onClose,
}: {
  tenantSlug: string;
  token: string;
  orderNumber: string;
  onClose: () => void;
}) {
  const [emails, setEmails] = useState<OrderSourceEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const slug = encodeURIComponent(tenantSlug);
    const tok = encodeURIComponent(token);
    void fetch(`/api/public/sticker/${slug}/${tok}/source-emails`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          emails?: OrderSourceEmailRow[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (!cancelled) setEmails(data.emails ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Не удалось загрузить письма",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantSlug, token]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-900/45 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Письма от заказа"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92dvh,880px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Письма от заказа
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Наряд № {orderNumber}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50/80 px-4 py-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Загрузка писем…</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : emails.length === 0 ? (
            <p className="text-sm text-zinc-500">
              К этому наряду не привязано писем.
            </p>
          ) : (
            <div className="space-y-3">
              {emails.map((email, index) => (
                <div
                  key={email.id}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
                >
                  <OrderSourceEmailView email={email} index={index} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
