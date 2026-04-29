"use client";

import { useEffect, useMemo, useState } from "react";

type PriceItemRow = {
  id: string;
  code: string;
  name: string;
  priceRub: number;
  basePriceRub: number;
  individualPriceRub: number | null;
};

type SelectedRow = {
  priceListItemId: string;
  code: string;
  name: string;
  basePriceRub: number;
  individualPriceRub: number;
};

function normalizePrice(v: unknown): number {
  return Math.max(0, Math.round(Number(v) || 0));
}

function selectedRowsFromItems(items: PriceItemRow[]): SelectedRow[] {
  return items
    .filter((it) => it.individualPriceRub != null)
    .map((it) => ({
      priceListItemId: it.id,
      code: it.code,
      name: it.name,
      basePriceRub: it.basePriceRub,
      individualPriceRub: it.individualPriceRub ?? it.basePriceRub,
    }));
}

function money(v: number): string {
  return `${v.toLocaleString("ru-RU")} руб.`;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function discountLabel(basePriceRub: number, individualPriceRub: number): string {
  if (basePriceRub <= 0 || individualPriceRub === basePriceRub) return "0%";
  if (individualPriceRub < basePriceRub) {
    const p = round1(((basePriceRub - individualPriceRub) / basePriceRub) * 100);
    return `${p}%`;
  }
  const p = round1(((individualPriceRub - basePriceRub) / basePriceRub) * 100);
  return `+${p}%`;
}

export function ClinicPriceOverridesPanel({ clinicId }: { clinicId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okText, setOkText] = useState<string | null>(null);

  const [allItems, setAllItems] = useState<PriceItemRow[]>([]);
  const [rows, setRows] = useState<SelectedRow[]>([]);

  const [pickOpen, setPickOpen] = useState(false);
  const [pickSearch, setPickSearch] = useState("");
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setOkText(null);
      try {
        const res = await fetch(
          `/api/price-list-items?clinicId=${encodeURIComponent(clinicId)}`,
          { cache: "no-store" },
        );
        const data = (await res.json().catch(() => ({}))) as
          | { error?: string }
          | PriceItemRow[];
        if (!res.ok) {
          if (!cancelled) {
            setError(
              typeof (data as { error?: string }).error === "string"
                ? (data as { error?: string }).error!
                : "Не удалось загрузить прайс",
            );
          }
          return;
        }
        const items = Array.isArray(data) ? data : [];
        if (cancelled) return;
        setAllItems(items);
        setRows(selectedRowsFromItems(items));
      } catch {
        if (!cancelled) setError("Сеть или сервер недоступны");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  const selectedIdSet = useMemo(
    () => new Set(rows.map((r) => r.priceListItemId)),
    [rows],
  );

  const pickFiltered = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (it) => it.code.toLowerCase().includes(q) || it.name.toLowerCase().includes(q),
    );
  }, [allItems, pickSearch]);

  const openPicker = () => {
    setPickedIds(new Set(selectedIdSet));
    setPickSearch("");
    setPickOpen(true);
  };

  const updateRowPrice = (rowId: string, nextPrice: number) => {
    setRows((prev) =>
      prev.map((x) =>
        x.priceListItemId === rowId ? { ...x, individualPriceRub: nextPrice } : x,
      ),
    );
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((x) => x.priceListItemId !== rowId));
  };

  const applyPicked = () => {
    const nextRows: SelectedRow[] = [...rows];
    const nextSet = new Set(nextRows.map((r) => r.priceListItemId));

    for (const itemId of pickedIds) {
      if (nextSet.has(itemId)) continue;
      const it = allItems.find((x) => x.id === itemId);
      if (!it) continue;
      nextRows.push({
        priceListItemId: it.id,
        code: it.code,
        name: it.name,
        basePriceRub: it.basePriceRub,
        individualPriceRub: it.basePriceRub,
      });
    }

    const filtered = nextRows.filter((r) => pickedIds.has(r.priceListItemId));
    filtered.sort((a, b) => a.code.localeCompare(b.code, "ru"));
    setRows(filtered);
    setPickOpen(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setOkText(null);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/price-overrides`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrides: rows.map((r) => ({
            priceListItemId: r.priceListItemId,
            priceRub: normalizePrice(r.individualPriceRub),
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить индивидуальные цены");
        setSaving(false);
        return;
      }
      setOkText("Сохранено");
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <p className="text-sm text-[var(--text-secondary)]">Загрузка прайса...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Индивидуальные цены клиники
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-strong)] transition-colors hover:border-[var(--input-border)] hover:bg-[var(--card-bg)] sm:text-sm"
            onClick={openPicker}
          >
            Выбрать позиции
          </button>
          <button
            type="button"
            disabled={saving}
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 sm:text-sm"
            onClick={() => void save()}
          >
            {saving ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>
      </div>

      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Выберите одну или несколько позиций из текущего активного прайса и задайте
        индивидуальную цену. Скидка считается автоматически как разница между базовой
        и индивидуальной ценой.
      </p>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {okText ? <p className="mt-3 text-sm text-emerald-700">{okText}</p> : null}

      {rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Индивидуальных цен пока нет. Нажмите "Выбрать позиции".
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--card-border)]">
          <table className="w-full min-w-[840px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                <th className="px-3 py-2 text-left">Код</th>
                <th className="px-3 py-2 text-left">Позиция</th>
                <th className="px-3 py-2 text-right">Цена</th>
                <th className="px-3 py-2 text-right">Цена индивидуальная</th>
                <th className="px-3 py-2 text-right">Скидка, %</th>
                <th className="px-3 py-2 text-center">Действие</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.priceListItemId}
                  className="border-b border-[var(--border-subtle)] last:border-b-0"
                >
                  <td className="px-3 py-2 font-mono text-[var(--text-body)]">{row.code}</td>
                  <td className="px-3 py-2 text-[var(--text-strong)]">{row.name}</td>
                  <td className="px-3 py-2 text-right text-[var(--text-body)]">
                    {money(row.basePriceRub)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.individualPriceRub}
                      onChange={(e) => {
                        updateRowPrice(
                          row.priceListItemId,
                          normalizePrice(e.target.value),
                        );
                      }}
                      className="w-28 rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-right text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--text-strong)]">
                    {discountLabel(row.basePriceRub, row.individualPriceRub)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      className="text-xs text-red-600 underline hover:no-underline"
                      onClick={() => removeRow(row.priceListItemId)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pickOpen ? (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-zinc-900/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-[var(--app-text)]">Выбор позиций</h3>
            <input
              type="search"
              className="mt-3 rounded-md border border-[var(--input-border)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
              placeholder="Поиск по коду или названию"
              value={pickSearch}
              onChange={(e) => setPickSearch(e.target.value)}
              autoFocus
            />
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-[var(--card-border)]">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {pickFiltered.map((it) => {
                    const checked = pickedIds.has(it.id);
                    return (
                      <tr key={it.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                        <td className="px-3 py-2">
                          <label className="flex cursor-pointer items-start gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setPickedIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(it.id);
                                  else next.delete(it.id);
                                  return next;
                                });
                              }}
                              className="mt-0.5 h-4 w-4 rounded border-[var(--input-border)]"
                            />
                            <span className="min-w-0">
                              <span className="font-mono text-xs text-[var(--text-body)]">{it.code}</span>
                              <span className="ml-2 text-[var(--text-strong)]">{it.name}</span>
                            </span>
                          </label>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-[var(--text-secondary)]">
                          {money(it.basePriceRub)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                onClick={() => setPickOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-95"
                onClick={applyPicked}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
