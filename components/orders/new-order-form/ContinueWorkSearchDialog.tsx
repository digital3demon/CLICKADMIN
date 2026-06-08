"use client";

import { orderPathById } from "@/lib/order-public-ref";
import { useEffect, useMemo, useState } from "react";

export type PickedOrder = {
  id: string;
  number: string;
  label: string;
  href: string;
};

type ContinueWorkSearchDialogProps = {
  open: boolean;
  onClose: () => void;
  onPick: (order: PickedOrder) => void;
  doctorId: string | null;
  patientName: string;
  clinicId?: string | null;
  excludeOrderId?: string | null;
};

type ApiOrder = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  clinicName: string | null;
  adminShippedOtpr: boolean;
};

function toPicked(o: ApiOrder): PickedOrder {
  const patient = (o.patientName ?? "").trim() || "—";
  const clinic = o.clinicName?.trim();
  const suffix = clinic ? `${patient} · ${clinic}` : patient;
  return {
    id: o.id,
    number: o.orderNumber,
    label: `Наряд ${o.orderNumber} · ${suffix}`,
    href: orderPathById(o.id),
  };
}

export function ContinueWorkSearchDialog({
  open,
  onClose,
  onPick,
  doctorId,
  patientName,
  clinicId = null,
  excludeOrderId = null,
}: ContinueWorkSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const canSearch = Boolean(doctorId?.trim() && patientName.trim());

  useEffect(() => {
    if (!open) {
      setQuery("");
      setOrders([]);
      setFetchError(null);
      return;
    }
    if (!canSearch) {
      setOrders([]);
      setFetchError("Укажите врача и пациента");
      return;
    }

    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setFetchError(null);
        try {
          const params = new URLSearchParams({
            doctorId: doctorId!.trim(),
            patientName: patientName.trim(),
          });
          if (clinicId) params.set("clinicId", clinicId);
          if (excludeOrderId) params.set("excludeOrderId", excludeOrderId);
          if (query.trim()) params.set("q", query.trim());
          const res = await fetch(
            `/api/orders/continuation-search?${params.toString()}`,
            { signal: ac.signal },
          );
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            orders?: ApiOrder[];
          };
          if (!res.ok) {
            setFetchError(data.error ?? "Не удалось выполнить поиск");
            setOrders([]);
            return;
          }
          setOrders(data.orders ?? []);
        } catch (e) {
          if (ac.signal.aborted) return;
          setFetchError("Сеть или сервер недоступны");
          setOrders([]);
        } finally {
          if (!ac.signal.aborted) setLoading(false);
        }
      })();
    }, query.trim() ? 250 : 0);

    return () => {
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [open, canSearch, doctorId, patientName, clinicId, excludeOrderId, query]);

  const filtered = useMemo(() => orders.map(toPicked), [orders]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="continue-work-search-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(80vh,520px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
          <h2
            id="continue-work-search-title"
            className="text-sm font-semibold text-[var(--app-text)]"
          >
            Поиск наряда для продолжения
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <div className="border-b border-[var(--border-subtle)] p-3">
          <input
            type="search"
            className="w-full rounded-md border border-[var(--input-border)] px-3 py-2 text-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
            placeholder="Номер наряда, ФИО…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <li className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
              Поиск…
            </li>
          ) : fetchError ? (
            <li className="px-3 py-6 text-center text-sm text-red-600" role="alert">
              {fetchError}
            </li>
          ) : filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
              Ничего не найдено
            </li>
          ) : (
            filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-hover)]"
                  onClick={() => onPick(o)}
                >
                  <span className="font-medium text-[var(--sidebar-blue)]">
                    Наряд {o.number}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                    {o.label.includes("·")
                      ? o.label.split("·").slice(1).join("·").trim()
                      : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
