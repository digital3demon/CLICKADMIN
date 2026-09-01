"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { OrderSourceEmailView } from "@/components/orders/OrderSourceEmailView";
import type { OrderSourceEmailRow } from "@/lib/mail/order-source-emails";

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
  const [emails, setEmails] = useState<OrderSourceEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/orders/${orderId}/source-emails`, { cache: "no-store" })
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
          setError(err instanceof Error ? err.message : "Не удалось загрузить письма");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const many = emails.length > 1;

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
        className={[
          "flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl",
          many
            ? "h-[min(90dvh,820px)] max-w-[min(96vw,88rem)]"
            : "max-h-[min(90dvh,820px)] max-w-2xl",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--app-text)]">
              Письма наряда
            </h2>
            {orderNumber ? (
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                № {orderNumber}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
        <div
          className={[
            "min-h-0 flex-1 p-4",
            many ? "overflow-x-auto overflow-y-hidden" : "overflow-y-auto",
          ].join(" ")}
        >
          {loading ? (
            <p className="text-sm text-[var(--text-secondary)]">Загрузка писем…</p>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : emails.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              К этому наряду не привязано писем.
            </p>
          ) : many ? (
            <div className="flex h-full snap-x snap-mandatory gap-3">
              {emails.map((email, index) => (
                <div
                  key={email.id}
                  className="flex h-full w-[min(28rem,calc(100vw-3.5rem))] shrink-0 snap-start flex-col"
                >
                  <OrderSourceEmailView
                    email={email}
                    index={index}
                    fillHeight
                    hideReplyStatus={hideReplyStatus}
                  />
                </div>
              ))}
            </div>
          ) : (
            <OrderSourceEmailView
              email={emails[0]!}
              index={0}
              hideReplyStatus={hideReplyStatus}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
