"use client";

import { useEffect, useState } from "react";
import { OrderSourceEmailView } from "@/components/orders/OrderSourceEmailView";
import type { OrderSourceEmailRow } from "@/lib/mail/order-source-emails";

/** Список писем наряда — модалка или боковая колонка в списке канбана. */
export function OrderSourceEmailsPanel({
  orderId,
  orderNumber,
  hideReplyStatus = false,
  compact = false,
  className = "",
}: {
  orderId: string;
  orderNumber?: string | null;
  hideReplyStatus?: boolean;
  /** Уже в колонке списка — без лишних отступов. */
  compact?: boolean;
  className?: string;
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

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      {!compact ? (
        <div className="shrink-0 border-b border-[var(--card-border)] px-3 py-2">
          <h2 className="text-sm font-semibold text-[var(--app-text)]">Письма наряда</h2>
          {orderNumber ? (
            <p className="mt-0.5 text-[0.75rem] text-[var(--text-secondary)]">
              № {orderNumber}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="shrink-0 border-b border-[var(--kaiten-modal-border)] px-2.5 py-1.5">
          <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
            Письма наряда
            {orderNumber ? (
              <span className="ml-1.5 normal-case tracking-normal text-[var(--kaiten-modal-text)]">
                № {orderNumber}
              </span>
            ) : null}
          </div>
        </div>
      )}
      <div
        className={[
          "min-h-0 flex-1",
          compact ? "flex flex-col p-2" : "p-4",
          many ? "overflow-x-auto overflow-y-hidden" : compact ? "overflow-hidden" : "overflow-y-auto",
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
          <div
            className={[
              "flex h-full snap-x snap-mandatory gap-3",
              compact ? "min-h-[18rem] flex-row" : "min-h-[12rem]",
            ].join(" ")}
          >
            {emails.map((email, index) => (
              <div
                key={email.id}
                className={[
                  "flex h-full shrink-0 snap-start flex-col",
                  compact
                    ? "w-[min(22rem,100%)]"
                    : "w-[min(22rem,calc(100vw-3.5rem))]",
                ].join(" ")}
              >
                <OrderSourceEmailView
                  email={email}
                  index={index}
                  fillHeight
                  compact={compact}
                  hideReplyStatus={hideReplyStatus}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={compact ? "flex min-h-0 w-full flex-1 flex-col" : undefined}>
            <OrderSourceEmailView
              email={emails[0]!}
              index={0}
              fillHeight={compact}
              compact={compact}
              hideReplyStatus={hideReplyStatus}
            />
          </div>
        )}
      </div>
    </div>
  );
}
