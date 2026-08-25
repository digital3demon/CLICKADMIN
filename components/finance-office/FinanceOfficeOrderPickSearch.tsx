"use client";

import { useEffect, useState } from "react";
import type { FinanceOfficeOrderSearchHit } from "@/lib/finance-office-order-search";

type Props = {
  disabled?: boolean;
  selectedId: string | null;
  selectedNumber: string;
  selectedLabel: string | null;
  onPick: (hit: FinanceOfficeOrderSearchHit) => void;
  onClear: () => void;
};

export function FinanceOfficeOrderPickSearch({
  disabled = false,
  selectedId,
  selectedNumber,
  selectedLabel,
  onPick,
  onClear,
}: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FinanceOfficeOrderSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FinanceOfficeOrderSearchHit | null>(
    null,
  );

  useEffect(() => {
    if (!selectedId) {
      setPreview(null);
      return;
    }
    if (preview?.id === selectedId) return;
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/finance-office/order-search?id=${encodeURIComponent(selectedId)}`,
          { credentials: "include", signal: ac.signal },
        );
        const data = (await res.json().catch(() => ({}))) as {
          items?: FinanceOfficeOrderSearchHit[];
        };
        if (!res.ok || ac.signal.aborted) return;
        const hit = Array.isArray(data.items) ? data.items[0] : null;
        if (hit) setPreview(hit);
      } catch {
        /* сеть — оставим label из строки */
      }
    })();
    return () => ac.abort();
    // preview.id — чтобы не дёргать повторно тот же наряд
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (selectedId || disabled) {
      setHits([]);
      setFetchError(null);
      return;
    }
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
          const res = await fetch(
            `/api/finance-office/order-search?q=${encodeURIComponent(q)}`,
            { credentials: "include", signal: ac.signal },
          );
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            items?: FinanceOfficeOrderSearchHit[];
          };
          if (!res.ok) {
            setFetchError(data.error ?? "Не удалось найти наряды");
            setHits([]);
            return;
          }
          setHits(Array.isArray(data.items) ? data.items : []);
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
  }, [query, selectedId, disabled]);

  const shown = preview;

  return (
    <div className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Поиск наряда
      </p>
      {selectedId ? (
        <div className="mt-1.5 space-y-1.5">
          <div className="text-sm font-medium text-[var(--text-strong)]">
            {shown?.label ?? selectedLabel ?? selectedNumber}
          </div>
          {shown ? (
            <div className="text-[11px] leading-snug text-[var(--text-body)]">
              <div>
                Заказчик:{" "}
                {[shown.clinicName, shown.doctorName, shown.patientName]
                  .map((s) => (s ?? "").trim())
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </div>
              <div className="mt-1">
                Состав:{" "}
                {shown.compositionLines.length
                  ? shown.compositionLines.join("; ")
                  : "не заполнен"}
              </div>
              {shown.alreadyHasInvoice ? (
                <div className="mt-1 font-medium text-amber-700 dark:text-amber-300">
                  В наряде уже есть счёт
                </div>
              ) : null}
              {shown.alreadyHasUpd ? (
                <div className="font-medium text-amber-700 dark:text-amber-300">
                  В наряде уже есть УПД
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-[11px] text-[var(--text-muted)]">
              Загружаю предпросмотр…
            </div>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setQuery("");
              setPreview(null);
              onClear();
            }}
            className="text-[11px] font-semibold text-[var(--sidebar-blue)] hover:underline disabled:opacity-50"
          >
            Сменить наряд
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Номер, пациент, врач, клиника…"
            className="mt-1 w-full max-w-xl rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm disabled:opacity-60"
          />
          <div className="mt-1.5 max-h-40 overflow-y-auto rounded border border-[var(--card-border)] bg-[var(--card-bg)]">
            {loading ? (
              <p className="px-2 py-2 text-xs text-[var(--text-muted)]">Поиск…</p>
            ) : fetchError ? (
              <p className="px-2 py-2 text-xs text-red-600 dark:text-red-300">
                {fetchError}
              </p>
            ) : query.trim().length < 2 ? (
              <p className="px-2 py-2 text-xs text-[var(--text-muted)]">
                Введите минимум 2 символа — счёт и/или УПД привяжутся к выбранному
                наряду
              </p>
            ) : hits.length === 0 ? (
              <p className="px-2 py-2 text-xs text-[var(--text-muted)]">
                Ничего не найдено
              </p>
            ) : (
              <ul>
                {hits.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setPreview(o);
                        onPick(o);
                      }}
                      className="flex w-full flex-col items-start gap-0.5 border-b border-[var(--card-border)] px-2 py-1.5 text-left last:border-b-0 hover:bg-[var(--table-row-hover)]"
                    >
                      <span className="font-mono text-xs font-semibold text-[var(--sidebar-blue)]">
                        {o.orderNumber}
                      </span>
                      <span className="text-[11px] text-[var(--text-body)]">
                        {[o.clinicName, o.doctorName, o.patientName]
                          .map((s) => (s ?? "").trim())
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                      <span className="text-[10px] leading-snug text-[var(--text-muted)]">
                        {o.compositionLines.length
                          ? o.compositionLines.join("; ")
                          : "Состав не заполнен"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
