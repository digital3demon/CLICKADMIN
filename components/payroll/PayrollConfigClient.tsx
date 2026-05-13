"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Config = {
  priceListItemId: string;
  cadRub: number | null;
  cadSurgeryRub: number | null;
  manualRub: number | null;
  processingRub: number | null;
};

type Row = {
  id: string;
  code: string;
  name: string;
  sectionTitle: string | null;
  subsectionTitle: string | null;
  config: Config;
};

type Draft = Record<keyof Omit<Config, "priceListItemId">, string>;

function draftFromConfig(config: Config): Draft {
  return {
    cadRub: config.cadRub == null ? "" : String(config.cadRub),
    cadSurgeryRub: config.cadSurgeryRub == null ? "" : String(config.cadSurgeryRub),
    manualRub: config.manualRub == null ? "" : String(config.manualRub),
    processingRub: config.processingRub == null ? "" : String(config.processingRub),
  };
}

function parseRubText(value: string): number | null {
  const text = value.replace(/\s/g, "").trim();
  if (!text) return null;
  const n = Number.parseInt(text, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export function PayrollConfigClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okId, setOkId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payroll/config", { cache: "no-store" });
      const data = (await res.json()) as { items?: Row[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить ФОТ");
      const items = Array.isArray(data.items) ? data.items : [];
      setRows(items);
      setDrafts(Object.fromEntries(items.map((r) => [r.id, draftFromConfig(r.config)])));
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
      [r.code, r.name, r.sectionTitle, r.subsectionTitle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, query]);

  const patchDraft = (rowId: string, key: keyof Draft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] ?? draftFromConfig(rows.find((r) => r.id === rowId)!.config)), [key]: value },
    }));
    setOkId(null);
  };

  const save = async (row: Row) => {
    const d = drafts[row.id] ?? draftFromConfig(row.config);
    setSavingId(row.id);
    setError(null);
    setOkId(null);
    try {
      const res = await fetch("/api/payroll/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceListItemId: row.id,
          cadRub: parseRubText(d.cadRub),
          cadSurgeryRub: parseRubText(d.cadSurgeryRub),
          manualRub: parseRubText(d.manualRub),
          processingRub: parseRubText(d.processingRub),
        }),
      });
      const data = (await res.json()) as { config?: Config | null; error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить");
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                config: data.config ?? {
                  priceListItemId: row.id,
                  cadRub: null,
                  cadSurgeryRub: null,
                  manualRub: null,
                  processingRub: null,
                },
              }
            : r,
        ),
      );
      setOkId(row.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Загрузка ФОТ…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по коду, названию или разделу"
          className="min-w-[260px] flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--sidebar-blue)]"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
        >
          Обновить
        </button>
      </div>
      {error ? <p className="text-sm font-medium text-red-600 dark:text-red-300">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface-subtle)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">Позиция прайса</th>
              <th className="px-3 py-2">CAD</th>
              <th className="px-3 py-2">CAD Хирургия</th>
              <th className="px-3 py-2">Мануал</th>
              <th className="px-3 py-2">Обработка</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {filtered.map((row) => {
              const d = drafts[row.id] ?? draftFromConfig(row.config);
              const inputCls =
                "w-24 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--sidebar-blue)]";
              return (
                <tr key={row.id} className="align-top">
                  <td className="max-w-[360px] px-3 py-2">
                    <div className="font-semibold text-[var(--text-strong)]">
                      {row.code} · {row.name}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {[row.sectionTitle, row.subsectionTitle].filter(Boolean).join(" / ") || "Без раздела"}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input className={inputCls} value={d.cadRub} onChange={(e) => patchDraft(row.id, "cadRub", e.target.value)} inputMode="numeric" />
                  </td>
                  <td className="px-3 py-2">
                    <input className={inputCls} value={d.cadSurgeryRub} onChange={(e) => patchDraft(row.id, "cadSurgeryRub", e.target.value)} inputMode="numeric" />
                  </td>
                  <td className="px-3 py-2">
                    <input className={inputCls} value={d.manualRub} onChange={(e) => patchDraft(row.id, "manualRub", e.target.value)} inputMode="numeric" />
                  </td>
                  <td className="px-3 py-2">
                    <input className={inputCls} value={d.processingRub} onChange={(e) => patchDraft(row.id, "processingRub", e.target.value)} inputMode="numeric" />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={savingId === row.id}
                      onClick={() => void save(row)}
                      className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {savingId === row.id ? "Сохр…" : okId === row.id ? "Сохранено" : "Сохранить"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
