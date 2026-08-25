"use client";

import { useEffect, useState } from "react";
import type {
  FinanceOfficeCompositionLine,
  FinanceOfficeOrderSearchHit,
} from "@/lib/finance-office-order-search";
import { formatDocumentCopyMoneyRu } from "@/lib/order-document-copy";

type Props = {
  disabled?: boolean;
  selectedId: string | null;
  selectedNumber: string;
  selectedLabel: string | null;
  onPick: (hit: FinanceOfficeOrderSearchHit) => void;
  onClear: () => void;
};

function customerLine(hit: FinanceOfficeOrderSearchHit) {
  return [hit.clinicName, hit.doctorName, hit.patientName]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" · ");
}

function CompositionTiles({
  lines,
}: {
  lines: FinanceOfficeCompositionLine[];
}) {
  return (
    <div className="min-w-0 flex-[2]">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        Состав заказа
        {lines.length > 0 ? ` · ${lines.length}` : ""}
      </p>
      {lines.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Нет позиций в составе</p>
      ) : (
        <div className="grid max-h-40 min-w-0 grid-cols-2 gap-1.5 overflow-y-auto pb-0.5 shell-laptop:grid-cols-3">
          {lines.map((line, idx) => (
            <div
              key={`${line.title}-${idx}`}
              className="flex min-w-0 flex-col gap-1 rounded-md border border-[var(--card-border)] bg-[var(--surface-muted)] px-2 py-1.5"
            >
              <p
                className="min-w-0 truncate text-[11px] font-semibold leading-tight text-[var(--text-strong)]"
                title={line.title}
              >
                {line.title}
              </p>
              <p className="flex items-baseline justify-between gap-2 text-[10px] tabular-nums text-[var(--text-secondary)]">
                <span>×{line.quantity}</span>
                <span className="min-w-0 truncate font-medium text-[var(--text-strong)]">
                  {formatDocumentCopyMoneyRu(line.amountRub)}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const summaryLabel =
    shown?.label ?? selectedLabel ?? selectedNumber ?? "Наряд";

  return (
    <div className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Поиск наряда
      </p>
      {selectedId ? (
        <div className="mt-1.5 space-y-1.5">
          <details className="group rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-1.5 select-none hover:brightness-105 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 truncate text-sm font-medium text-[var(--text-strong)]">
                {summaryLabel}
              </span>
              <span
                aria-hidden
                className="shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-180"
              >
                ▾
              </span>
            </summary>
            <div className="space-y-2 border-t border-[var(--card-border)] px-2.5 py-2">
              {shown ? (
                <div className="flex min-w-0 flex-col gap-2 shell-laptop:flex-row shell-laptop:items-start">
                  <div className="min-w-0 shrink-0 text-[11px] leading-snug text-[var(--text-body)] shell-laptop:max-w-[16rem]">
                    <div>
                      Заказчик: {customerLine(shown) || "—"}
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
                  <CompositionTiles lines={shown.composition ?? []} />
                </div>
              ) : (
                <div className="text-[11px] text-[var(--text-muted)]">
                  Загружаю предпросмотр…
                </div>
              )}
            </div>
          </details>
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
                        {customerLine(o) || "—"}
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
