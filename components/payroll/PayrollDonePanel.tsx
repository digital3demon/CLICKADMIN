"use client";

import type { UserRole } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type PayrollKind = "CAD" | "CAD_SURGERY" | "MANUAL" | "PROCESSING";

type PayrollOption = {
  payrollConfigId: string;
  priceListItemId: string;
  kind: PayrollKind;
  kindLabel: string;
  amountRub: number;
  description: string;
  code: string;
  name: string;
  sectionTitle: string | null;
  subsectionTitle: string | null;
};

type PayrollEntry = {
  id: string;
  payrollConfigId: string | null;
  priceListItemId: string;
  kind: PayrollKind;
  kindLabel: string;
  quantity: number;
  amountRub: number;
  userDisplayName: string;
  createdAt: string;
  priceCode: string;
  priceName: string;
  configDescription: string;
};

let payrollOptionsCache: PayrollOption[] | null = null;
let payrollOptionsInflight: Promise<PayrollOption[]> | null = null;
let payrollNextLoadAllowedAt = 0;

function retryAfterMs(value: string | null): number {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const dateMs = Date.parse(value);
  return Number.isFinite(dateMs) ? Math.max(0, dateMs - Date.now()) : 0;
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

async function loadPayrollOptions(): Promise<PayrollOption[]> {
  if (payrollOptionsCache) return payrollOptionsCache;
  if (payrollOptionsInflight) return payrollOptionsInflight;
  payrollOptionsInflight = (async () => {
    const res = await fetch("/api/payroll/options", { cache: "no-store" });
    const json = await readJson<{ items?: PayrollOption[]; error?: string }>(res);
    if (!res.ok) {
      const err = new Error(json.error || "Не удалось загрузить ФОТ");
      (err as Error & { status?: number; retryAfterMs?: number }).status = res.status;
      (err as Error & { status?: number; retryAfterMs?: number }).retryAfterMs = retryAfterMs(
        res.headers.get("Retry-After"),
      );
      throw err;
    }
    payrollOptionsCache = Array.isArray(json.items) ? json.items : [];
    return payrollOptionsCache;
  })();
  try {
    return await payrollOptionsInflight;
  } finally {
    payrollOptionsInflight = null;
  }
}

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
  const [busyConfigId, setBusyConfigId] = useState<string | null>(null);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSenior = sessionRole === "SENIOR_TECHNICIAN" || sessionRole === "OWNER";
  const selected = useMemo(
    () => options.find((x) => x.payrollConfigId === selectedId) ?? options[0] ?? null,
    [options, selectedId],
  );

  const load = useCallback(async () => {
    if (!orderId) return;
    if (Date.now() < payrollNextLoadAllowedAt) {
      setError(null);
      setNotice("Сервер временно ограничил обновление ФОТ, попробуем чуть позже.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const [nextOptions, entRes] = await Promise.all([
        loadPayrollOptions(),
        fetch(`/api/payroll/entries?orderId=${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        }),
      ]);
      const entJson = await readJson<{ entries?: PayrollEntry[]; error?: string }>(entRes);
      if (!entRes.ok) {
        const err = new Error(entJson.error || "Не удалось загрузить начисления");
        (err as Error & { status?: number; retryAfterMs?: number }).status = entRes.status;
        (err as Error & { status?: number; retryAfterMs?: number }).retryAfterMs = retryAfterMs(
          entRes.headers.get("Retry-After"),
        );
        throw err;
      }
      const nextEntries = Array.isArray(entJson.entries) ? entJson.entries : [];
      setOptions(nextOptions);
      setEntries(nextEntries);
      setEntryQuantityDrafts(
        Object.fromEntries(nextEntries.map((e) => [e.id, String(e.quantity || 1)])),
      );
      setSelectedId((prev) =>
        prev && nextOptions.some((x) => x.payrollConfigId === prev)
          ? prev
          : (nextOptions[0]?.payrollConfigId ?? ""),
      );
    } catch (e) {
      const status = (e as Error & { status?: number; retryAfterMs?: number })?.status;
      if (status === 429) {
        const retryMs =
          (e as Error & { retryAfterMs?: number }).retryAfterMs ?? 0;
        payrollNextLoadAllowedAt = Date.now() + Math.max(30_000, retryMs);
        setError(null);
        setNotice("Сервер временно ограничил обновление ФОТ, попробуем чуть позже.");
        return;
      }
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addEntry = async () => {
    if (!orderId || !selected) return;
    const quantity = Math.max(1, Math.min(999, Number.parseInt(quantityDraft, 10) || 1));
    setBusyConfigId(selected.payrollConfigId);
    setError(null);
    try {
      const res = await fetch("/api/payroll/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          kanbanCardId,
          payrollConfigId: selected.payrollConfigId,
          quantity,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setBusyConfigId(null);
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
          Что сделано
        </label>
        <select
          value={selected?.payrollConfigId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={loading || options.length === 0}
          className="mt-1 w-full rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.78rem] text-[var(--kaiten-modal-text)] outline-none"
        >
          {options.length === 0 ? (
            <option value="">ФОТ не настроен</option>
          ) : (
            options.map((opt) => (
              <option key={opt.payrollConfigId} value={opt.payrollConfigId}>
                {opt.kindLabel} · {opt.description} · {opt.code}
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
            <div className="mt-2 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] px-2 py-2 text-[0.72rem] text-[var(--kaiten-modal-text)]">
              <div className="font-semibold">{selected.kindLabel} · {selected.description}</div>
              <div className="mt-0.5 text-[var(--kaiten-modal-muted)]">
                {selected.code} · {selected.name}
              </div>
              <button
                type="button"
                disabled={busyConfigId === selected.payrollConfigId}
                onClick={() => void addEntry()}
                className="mt-2 w-full rounded-md bg-[var(--kaiten-accent)] px-2 py-1.5 text-center text-[0.72rem] font-semibold text-white hover:opacity-90 disabled:opacity-55"
              >
                {(() => {
                  const qty = Math.max(1, Math.min(999, Number.parseInt(quantityDraft, 10) || 1));
                  return `Добавить: ${rub(selected.amountRub)} × ${qty} = ${rub(selected.amountRub * qty)}`;
                })()}
              </button>
            </div>
          </>
        ) : null}
        {notice ? (
          <p className="mt-2 text-[0.72rem] font-medium text-[var(--kaiten-modal-muted)]">
            {notice}
          </p>
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
                      {e.kindLabel} · {e.configDescription} · {rub(e.amountRub)}
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
