"use client";

import type { UserRole } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type PayrollKind = "CAD" | "CAD_SURGERY" | "MANUAL" | "PROCESSING";

type PayrollOption = {
  priceListItemId: string;
  code: string;
  name: string;
  sectionTitle: string | null;
  subsectionTitle: string | null;
  kinds: Array<{ kind: PayrollKind; label: string; amountRub: number }>;
};

type PayrollEntry = {
  id: string;
  priceListItemId: string;
  kind: PayrollKind;
  kindLabel: string;
  quantity: number;
  amountRub: number;
  userDisplayName: string;
  createdAt: string;
  priceCode: string;
  priceName: string;
};

function rub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateShort(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PayrollDonePanel({
  orderId,
  kanbanCardId,
  sessionRole,
}: {
  orderId: string | null | undefined;
  kanbanCardId: string;
  sessionRole: UserRole | null;
}) {
  const [options, setOptions] = useState<PayrollOption[]>([]);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [quantityDraft, setQuantityDraft] = useState("1");
  const [entryQuantityDrafts, setEntryQuantityDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyKind, setBusyKind] = useState<PayrollKind | null>(null);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSenior = sessionRole === "SENIOR_TECHNICIAN" || sessionRole === "OWNER";
  const selected = useMemo(
    () => options.find((x) => x.priceListItemId === selectedId) ?? options[0] ?? null,
    [options, selectedId],
  );

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const [optRes, entRes] = await Promise.all([
        fetch("/api/payroll/options", { cache: "no-store" }),
        fetch(`/api/payroll/entries?orderId=${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        }),
      ]);
      const optJson = (await optRes.json()) as { items?: PayrollOption[]; error?: string };
      const entJson = (await entRes.json()) as { entries?: PayrollEntry[]; error?: string };
      if (!optRes.ok) throw new Error(optJson.error || "Не удалось загрузить ФОТ");
      if (!entRes.ok) throw new Error(entJson.error || "Не удалось загрузить начисления");
      const nextOptions = Array.isArray(optJson.items) ? optJson.items : [];
      const nextEntries = Array.isArray(entJson.entries) ? entJson.entries : [];
      setOptions(nextOptions);
      setEntries(nextEntries);
      setEntryQuantityDrafts(
        Object.fromEntries(nextEntries.map((e) => [e.id, String(e.quantity || 1)])),
      );
      setSelectedId((prev) =>
        prev && nextOptions.some((x) => x.priceListItemId === prev)
          ? prev
          : (nextOptions[0]?.priceListItemId ?? ""),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addEntry = async (kind: PayrollKind) => {
    if (!orderId || !selected) return;
    const quantity = Math.max(1, Math.min(999, Number.parseInt(quantityDraft, 10) || 1));
    setBusyKind(kind);
    setError(null);
    try {
      const res = await fetch("/api/payroll/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          kanbanCardId,
          priceListItemId: selected.priceListItemId,
          kind,
          quantity,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setBusyKind(null);
    }
  };

  const updateEntryQuantity = async (entry: PayrollEntry) => {
    const quantity = Math.max(
      1,
      Math.min(999, Number.parseInt(entryQuantityDrafts[entry.id] ?? String(entry.quantity), 10) || 1),
    );
    if (quantity === entry.quantity) return;
    setBusyEntryId(entry.id);
    setError(null);
    try {
      const res = await fetch(`/api/payroll/entries/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось изменить количество");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения количества");
      setEntryQuantityDrafts((prev) => ({ ...prev, [entry.id]: String(entry.quantity) }));
    } finally {
      setBusyEntryId(null);
    }
  };

  const deleteEntry = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/payroll/entries/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось удалить");
      setEntries((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    }
  };

  if (!orderId) {
    return (
      <div className="p-3 text-sm text-[var(--kaiten-modal-muted)]">
        Для начислений нужна карточка, связанная с нарядом.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-[var(--kaiten-modal-border)] p-2">
        <label className="block text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
          Позиция прайса
        </label>
        <select
          value={selected?.priceListItemId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={loading || options.length === 0}
          className="mt-1 w-full rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.78rem] text-[var(--kaiten-modal-text)] outline-none"
        >
          {options.length === 0 ? (
            <option value="">ФОТ не настроен</option>
          ) : (
            options.map((opt) => (
              <option key={opt.priceListItemId} value={opt.priceListItemId}>
                {opt.code} · {opt.name}
              </option>
            ))
          )}
        </select>
        {selected ? (
          <>
            <label className="mt-2 block text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
              Количество
            </label>
            <input
              type="number"
              min={1}
              max={999}
              step={1}
              value={quantityDraft}
              onChange={(e) => setQuantityDraft(e.target.value)}
              className="mt-1 w-24 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.78rem] text-[var(--kaiten-modal-text)] outline-none"
            />
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {selected.kinds.map((k) => {
                const qty = Math.max(1, Math.min(999, Number.parseInt(quantityDraft, 10) || 1));
                return (
                  <button
                    key={k.kind}
                    type="button"
                    disabled={busyKind === k.kind}
                    onClick={() => void addEntry(k.kind)}
                    className="rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] px-2 py-2 text-left text-[0.72rem] text-[var(--kaiten-modal-text)] hover:border-[var(--kaiten-accent)] disabled:opacity-55"
                  >
                    <span className="block font-semibold">{k.label}</span>
                    <span className="text-[var(--kaiten-modal-muted)]">
                      {rub(k.amountRub)} × {qty} = {rub(k.amountRub * qty)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
        {error ? (
          <p className="mt-2 text-[0.72rem] font-medium text-red-300">{error}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[0.72rem] font-semibold uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
            Плашки
          </h3>
          <button
            type="button"
            onClick={() => void load()}
            className="text-[0.7rem] text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)]"
          >
            Обновить
          </button>
        </div>
        {loading ? (
          <p className="text-[0.78rem] text-[var(--kaiten-modal-muted)]">Загрузка…</p>
        ) : entries.length === 0 ? (
          <p className="text-[0.78rem] text-[var(--kaiten-modal-muted)]">
            Пока нет отмеченных работ.
          </p>
        ) : (
          <div className="space-y-1.5">
            {entries.map((e) => (
              <div
                key={e.id}
                className="rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[0.78rem] font-semibold text-[var(--kaiten-modal-text)]">
                      {e.kindLabel} · {rub(e.amountRub)}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[0.68rem] text-[var(--kaiten-modal-muted)]">
                      <span>Кол-во</span>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        step={1}
                        value={entryQuantityDrafts[e.id] ?? String(e.quantity)}
                        disabled={busyEntryId === e.id}
                        onChange={(ev) =>
                          setEntryQuantityDrafts((prev) => ({
                            ...prev,
                            [e.id]: ev.target.value,
                          }))
                        }
                        onBlur={() => void updateEntryQuantity(e)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") {
                            ev.currentTarget.blur();
                          }
                        }}
                        className="w-16 rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] px-1.5 py-0.5 text-[0.72rem] text-[var(--kaiten-modal-text)] outline-none"
                      />
                    </div>
                    <div className="mt-0.5 truncate text-[0.68rem] text-[var(--kaiten-modal-muted)]">
                      {e.priceCode} · {e.priceName}
                    </div>
                    {isSenior ? (
                      <div className="mt-0.5 truncate text-[0.68rem] text-[var(--kaiten-modal-muted)]">
                        {e.userDisplayName} · {dateShort(e.createdAt)}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-[0.68rem] text-[var(--kaiten-modal-muted)]">
                        {dateShort(e.createdAt)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteEntry(e.id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-[0.68rem] text-[var(--kaiten-modal-muted)] hover:bg-red-500/10 hover:text-red-300"
                  >
                    Убрать
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
