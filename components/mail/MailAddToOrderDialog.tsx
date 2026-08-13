"use client";

import { useEffect, useMemo, useState } from "react";
import { orderPathById } from "@/lib/order-public-ref";

type OrderHit = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  doctorName?: string | null;
  clinicName?: string | null;
  kaitenBlocked?: boolean;
};

type OrdersApiRow = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  kaitenBlocked?: boolean;
  doctor?: { fullName?: string | null } | null;
  clinic?: { name?: string | null } | null;
};

function mapOrderHit(o: OrdersApiRow): OrderHit {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    patientName: o.patientName,
    doctorName: o.doctor?.fullName ?? null,
    clinicName: o.clinic?.name ?? null,
    kaitenBlocked: o.kaitenBlocked === true,
  };
}

export type MailAddToOrderDialogProps = {
  open: boolean;
  emailIds: string[];
  onClose: () => void;
  onDone: (info: { orderId: string; orderNumber: string }) => void;
};

function orderLabel(o: OrderHit): string {
  const patient = (o.patientName ?? "").trim() || "—";
  const doctor = (o.doctorName ?? "").trim();
  const clinic = (o.clinicName ?? "").trim();
  const bits = [patient, doctor, clinic].filter(Boolean);
  return `Наряд ${o.orderNumber} · ${bits.join(" · ")}`;
}

export function MailAddToOrderDialog({
  open,
  emailIds,
  onClose,
  onDone,
}: MailAddToOrderDialogProps) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<OrderHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrderHit | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = Boolean(selected) && !busy && emailIds.length > 0;
  const showUnblock = selected?.kaitenBlocked === true;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
      setFetchError(null);
      setSelected(null);
      setComment("");
      setBusy(false);
      setSubmitError(null);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setFetchError(null);
      return;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setFetchError(null);
        try {
          const params = new URLSearchParams({
            q,
            limit: "20",
            hideShipped: "1",
          });
          const res = await fetch(`/api/orders?${params.toString()}`, {
            credentials: "include",
            signal: ac.signal,
          });
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            orders?: OrdersApiRow[];
          };
          if (!res.ok) {
            setFetchError(data.error ?? "Не удалось найти наряды");
            setHits([]);
            return;
          }
          setHits(
            Array.isArray(data.orders) ? data.orders.map(mapOrderHit) : [],
          );
        } catch (e) {
          if (ac.signal.aborted) return;
          setFetchError("Сеть недоступна");
          setHits([]);
        } finally {
          if (!ac.signal.aborted) setLoading(false);
        }
      })();
    }, 280);
    return () => {
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const selectedId = selected?.id ?? null;
  const list = useMemo(() => hits, [hits]);

  async function submit(unblock: boolean) {
    if (!selected || busy) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(selected.id)}/source-emails`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailIds,
            comment: comment.trim() || undefined,
            unblock,
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        orderNumber?: string;
        commentError?: string | null;
        unblockError?: string | null;
      };
      if (!res.ok) {
        setSubmitError(data.error ?? "Не удалось добавить письма");
        return;
      }
      const warnings = [data.commentError, data.unblockError]
        .filter(Boolean)
        .join("; ");
      if (warnings) {
        /* Связь уже создана — оставляем модалку, чтобы увидеть предупреждение */
        setSubmitError(
          `Письма привязаны к наряду ${data.orderNumber ?? selected.orderNumber}, но: ${warnings}`,
        );
        return;
      }
      onDone({
        orderId: selected.id,
        orderNumber: data.orderNumber ?? selected.orderNumber,
      });
    } catch {
      setSubmitError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mail-add-to-order-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
          <div className="min-w-0">
            <h2
              id="mail-add-to-order-title"
              className="text-base font-semibold text-[var(--app-text)]"
            >
              Добавить в заказ
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Писем: {emailIds.length}. Найдите наряд и при необходимости
              оставьте комментарий в Kaiten.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            disabled={busy}
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <label className="block text-xs font-medium text-[var(--text-secondary)]">
            Поиск наряда
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Номер, пациент, врач, клиника…"
              className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)]"
            />
          </label>

          {selected ? (
            <div className="rounded-md border border-[var(--sidebar-blue)]/40 bg-[var(--accent-selection-bg)] px-3 py-2 text-sm">
              <div className="font-medium text-[var(--app-text)]">
                {orderLabel(selected)}
              </div>
              {selected.kaitenBlocked ? (
                <div className="mt-0.5 text-xs font-semibold text-red-600 dark:text-red-300">
                  Карточка заблокирована
                </div>
              ) : null}
              <button
                type="button"
                className="mt-1 text-xs text-[var(--sidebar-blue)] hover:underline"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Сменить наряд
              </button>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-md border border-[var(--card-border)]">
              {loading ? (
                <p className="px-3 py-4 text-sm text-[var(--text-muted)]">
                  Поиск…
                </p>
              ) : fetchError ? (
                <p className="px-3 py-4 text-sm text-red-600 dark:text-red-300">
                  {fetchError}
                </p>
              ) : query.trim().length < 2 ? (
                <p className="px-3 py-4 text-sm text-[var(--text-muted)]">
                  Введите минимум 2 символа
                </p>
              ) : list.length === 0 ? (
                <p className="px-3 py-4 text-sm text-[var(--text-muted)]">
                  Ничего не найдено
                </p>
              ) : (
                <ul>
                  {list.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        className={`flex w-full flex-col items-start gap-0.5 border-b border-[var(--card-border)] px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[var(--surface-hover)] ${
                          selectedId === o.id
                            ? "bg-[var(--accent-selection-bg)]"
                            : ""
                        }`}
                        onClick={() => setSelected(o)}
                      >
                        <span className="font-mono font-semibold text-[var(--sidebar-blue)]">
                          {o.orderNumber}
                        </span>
                        <span className="text-[var(--text-body)]">
                          {orderLabel(o).replace(/^Наряд [^·]+ · /, "")}
                        </span>
                        {o.kaitenBlocked ? (
                          <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
                            Заблокирован
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <label className="block text-xs font-medium text-[var(--text-secondary)]">
            Комментарий в Kaiten (необязательно)
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Текст уйдёт в карточку после добавления…"
              className="mt-1 w-full resize-y rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)]"
            />
          </label>

          {submitError ? (
            <p className="text-sm text-red-600 dark:text-red-300" role="alert">
              {submitError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--card-border)] px-4 py-3">
          <button
            type="button"
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            disabled={busy}
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="rounded-lg bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-40"
            disabled={!canSubmit}
            onClick={() => void submit(false)}
          >
            {busy ? "…" : "Добавить"}
          </button>
          {showUnblock ? (
            <button
              type="button"
              className="rounded-lg border border-emerald-500/60 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-700/70 dark:bg-emerald-950/40 dark:text-emerald-100"
              disabled={!canSubmit}
              title="Привязать письма и снять блокировку в Kaiten"
              onClick={() => void submit(true)}
            >
              {busy ? "…" : "Добавить и разблокировать"}
            </button>
          ) : null}
          {selected ? (
            <a
              href={orderPathById(selected.id)}
              className="ml-auto text-xs text-[var(--sidebar-blue)] hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Открыть наряд
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
