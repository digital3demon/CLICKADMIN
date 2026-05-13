"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PAYROLL_WORK_KIND_LABELS, PAYROLL_WORK_KIND_VALUES, type PayrollWorkKindValue } from "@/lib/payroll";

type PriceItem = {
  id: string;
  code: string;
  name: string;
  sectionTitle: string | null;
  subsectionTitle: string | null;
};

type ConfigRow = {
  id: string;
  priceListItemId: string;
  kind: PayrollWorkKindValue;
  kindLabel: string;
  amountRub: number;
  description: string;
  priceCode: string;
  priceName: string;
  sectionTitle: string | null;
  subsectionTitle: string | null;
};

type Draft = {
  id?: string;
  priceListItemIds: string[];
  kind: PayrollWorkKindValue;
  amountRub: string;
  description: string;
};

const emptyDraft: Draft = {
  priceListItemIds: [],
  kind: "CAD",
  amountRub: "",
  description: "",
};

function draftFromRow(row: ConfigRow): Draft {
  return {
    id: row.id,
    priceListItemIds: [row.priceListItemId],
    kind: row.kind,
    amountRub: String(row.amountRub),
    description: row.description,
  };
}

function parseRubText(value: string): number | null {
  const text = value.replace(/\s/g, "").trim();
  if (!text) return null;
  const n = Number.parseInt(text, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function itemLabel(item: PriceItem) {
  return `${item.code} · ${item.name}`;
}

function normalizeConfig(row: ConfigRow): ConfigRow {
  return {
    ...row,
    kindLabel: row.kindLabel || PAYROLL_WORK_KIND_LABELS[row.kind],
  };
}

export function PayrollConfigClient() {
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okId, setOkId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payroll/config", { cache: "no-store" });
      const data = (await res.json()) as {
        priceItems?: PriceItem[];
        configs?: ConfigRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить ФОТ");
      setPriceItems(Array.isArray(data.priceItems) ? data.priceItems : []);
      setRows((Array.isArray(data.configs) ? data.configs : []).map(normalizeConfig));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.priceCode, r.priceName, r.description, r.kindLabel, r.sectionTitle, r.subsectionTitle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, query]);

  const saveDraft = async () => {
    if (!draft) return;
    const amountRub = parseRubText(draft.amountRub);
    setSaving(true);
    setError(null);
    setOkId(null);
    try {
      const res = await fetch("/api/payroll/config", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          priceListItemId: draft.id ? draft.priceListItemIds[0] ?? "" : undefined,
          priceListItemIds: draft.id ? undefined : draft.priceListItemIds,
          kind: draft.kind,
          amountRub,
          description: draft.description.trim(),
        }),
      });
      const data = (await res.json()) as { config?: ConfigRow; configs?: ConfigRow[]; error?: string };
      const created = (Array.isArray(data.configs) ? data.configs : data.config ? [data.config] : []).map(normalizeConfig);
      if (!res.ok || created.length === 0) throw new Error(data.error || "Не удалось сохранить");
      setRows((prev) =>
        draft.id
          ? prev.map((r) => (r.id === created[0].id ? created[0] : r))
          : [...created, ...prev],
      );
      setDraft(null);
      setOkId(created[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row: ConfigRow) => {
    if (!window.confirm(`Удалить строку ФОТ "${row.description}"?`)) return;
    setDeletingId(row.id);
    setError(null);
    setOkId(null);
    try {
      const res = await fetch("/api/payroll/config", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось удалить");
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      if (draft?.id === row.id) setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Загрузка ФОТ…</p>;
  }

  const inputCls =
    "rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--sidebar-blue)]";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по позиции, типу или описанию"
          className="min-w-[260px] flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--sidebar-blue)]"
        />
        <button
          type="button"
          onClick={() => setDraft({ ...emptyDraft, priceListItemIds: priceItems[0]?.id ? [priceItems[0].id] : [] })}
          className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Добавить
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
        >
          Обновить
        </button>
      </div>

      {error ? <p className="text-sm font-medium text-red-600 dark:text-red-300">{error}</p> : null}

      {draft ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
          <div className="mb-2 text-sm font-semibold text-[var(--text-strong)]">
            {draft.id ? "Редактировать строку ФОТ" : "Новая строка ФОТ"}
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_150px_120px_minmax(220px,1fr)_auto]">
            <div className="min-w-0">
              <select
                multiple={!draft.id}
                size={draft.id ? undefined : 6}
                value={draft.id ? draft.priceListItemIds[0] ?? "" : draft.priceListItemIds}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          priceListItemIds: draft.id
                            ? [e.target.value]
                            : Array.from(e.target.selectedOptions, (option) => option.value),
                        }
                      : prev,
                  )
                }
                className={`${inputCls} w-full`}
              >
                {priceItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {itemLabel(item)}
                  </option>
                ))}
              </select>
              {!draft.id ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Можно выбрать несколько позиций: Ctrl/Shift + клик.
                </p>
              ) : null}
            </div>
            <select
              value={draft.kind}
              onChange={(e) =>
                setDraft((prev) =>
                  prev ? { ...prev, kind: e.target.value as PayrollWorkKindValue } : prev,
                )
              }
              className={inputCls}
            >
              {PAYROLL_WORK_KIND_VALUES.map((kind) => (
                <option key={kind} value={kind}>
                  {PAYROLL_WORK_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
            <input
              value={draft.amountRub}
              onChange={(e) => setDraft((prev) => (prev ? { ...prev, amountRub: e.target.value } : prev))}
              placeholder="Цена"
              inputMode="numeric"
              className={inputCls}
            />
            <input
              value={draft.description}
              onChange={(e) => setDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
              placeholder="Описание для плашки"
              className={inputCls}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDraft()}
                className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Сохр…" : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="rounded-md border border-[var(--input-border)] px-3 py-2 text-sm font-medium text-[var(--text-strong)]"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface-subtle)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">Тип</th>
              <th className="px-3 py-2">Цена</th>
              <th className="px-3 py-2">Описание</th>
              <th className="px-3 py-2">Позиция прайса</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {filtered.map((row) => (
              <tr key={row.id} className={okId === row.id ? "bg-emerald-500/10" : ""}>
                <td className="px-3 py-2 font-medium text-[var(--text-strong)]">{row.kindLabel}</td>
                <td className="px-3 py-2 text-[var(--text-strong)]">{row.amountRub.toLocaleString("ru-RU")} ₽</td>
                <td className="max-w-[320px] px-3 py-2 text-[var(--text-strong)]">{row.description}</td>
                <td className="max-w-[420px] px-3 py-2">
                  <div className="font-semibold text-[var(--text-strong)]">
                    {row.priceCode} · {row.priceName}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {[row.sectionTitle, row.subsectionTitle].filter(Boolean).join(" / ") || "Без раздела"}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDraft(draftFromRow(row))}
                      className="rounded-md border border-[var(--input-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === row.id}
                      onClick={() => void deleteRow(row)}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      {deletingId === row.id ? "Удал…" : "Удалить"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">
                  Строк ФОТ пока нет. Нажмите «Добавить», чтобы создать первую.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
