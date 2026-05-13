"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PreviewRow = {
  sourceRow: number;
  originalText: string;
  orderNumber: string;
  invoiceNumberRaw: string;
  dateRaw: string;
  invoiceDate: string;
  paid: boolean;
  apply: boolean;
  errors: string[];
  orderId: string | null;
  orderLabel: string | null;
};

type ApplyResult = {
  sourceRow: number;
  orderNumber: string;
  ok: boolean;
  message: string;
};

export function FinanceOfficeBankImportPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [results, setResults] = useState<ApplyResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchRow = (idx: number, patch: Partial<PreviewRow>) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
    setResults([]);
  };

  const preview = async (nextFile = file) => {
    if (!nextFile) return;
    setBusy(true);
    setError(null);
    setResults([]);
    try {
      const form = new FormData();
      form.set("file", nextFile);
      const res = await fetch("/api/finance-office/bank-import/preview", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as {
        rows?: PreviewRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Не удалось прочитать выгрузку");
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка чтения файла");
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    setBusy(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch("/api/finance-office/bank-import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        results?: ApplyResult[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить оплату");
      setResults(Array.isArray(data.results) ? data.results : []);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  };

  const onFile = (next: File | null) => {
    setFile(next);
    setRows([]);
    setResults([]);
    setError(null);
    if (next) void preview(next);
  };

  return (
    <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
      <div
        className="rounded-t-lg border-b border-dashed border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-4"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-strong)]">
              Банковская выгрузка
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Загрузите Excel. Сначала строки появятся для проверки и исправления,
              оплата применится только после кнопки «Сохранить».
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".xls,.xlsx,.pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
            >
              Выбрать файл
            </button>
            {file ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void preview()}
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
              >
                Перечитать
              </button>
            ) : null}
          </div>
        </div>
        {file ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">Файл: {file.name}</p>
        ) : null}
        {error ? <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-300">{error}</p> : null}
      </div>

      {rows.length > 0 ? (
        <div className="space-y-3 p-3">
          <div className="overflow-x-auto rounded-md border border-[var(--card-border)]">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[var(--surface-subtle)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="px-2 py-2">Применить</th>
                  <th className="px-2 py-2">Строка</th>
                  <th className="px-2 py-2">Наряд</th>
                  <th className="px-2 py-2">Номер счёта</th>
                  <th className="px-2 py-2">Дата</th>
                  <th className="px-2 py-2">Оплата</th>
                  <th className="px-2 py-2">Распознавание</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {rows.map((row, idx) => (
                  <tr key={`${row.sourceRow}-${idx}`} className={row.errors.length ? "bg-amber-500/10" : ""}>
                    <td className="px-2 py-2 align-top text-center">
                      <input
                        type="checkbox"
                        checked={row.apply}
                        onChange={(e) => patchRow(idx, { apply: e.target.checked })}
                      />
                    </td>
                    <td className="px-2 py-2 align-top font-mono">{row.sourceRow}</td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={row.orderNumber}
                        onChange={(e) => patchRow(idx, { orderNumber: e.target.value, errors: [] })}
                        className="w-28 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1"
                      />
                      <div className="mt-1 max-w-[16rem] text-[10px] text-[var(--text-muted)]">
                        {row.orderLabel ?? row.originalText}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={row.invoiceNumberRaw}
                        onChange={(e) => patchRow(idx, { invoiceNumberRaw: e.target.value, errors: [] })}
                        className="w-32 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={row.invoiceDate || row.dateRaw}
                        onChange={(e) => patchRow(idx, { invoiceDate: e.target.value, errors: [] })}
                        className="w-32 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1"
                      />
                    </td>
                    <td className="px-2 py-2 align-top text-center">
                      <input
                        type="checkbox"
                        checked={row.paid}
                        onChange={(e) => patchRow(idx, { paid: e.target.checked, errors: [] })}
                      />
                    </td>
                    <td className="max-w-[20rem] px-2 py-2 align-top">
                      {row.errors.length ? (
                        <span className="font-medium text-amber-700 dark:text-amber-300">
                          {row.errors.join("; ")}
                        </span>
                      ) : (
                        <span className="font-medium text-emerald-700 dark:text-emerald-300">
                          Распознано
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => void apply()}
              className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Сохранение…" : "Сохранить оплаты"}
            </button>
          </div>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="border-t border-[var(--card-border)] p-3">
          <h3 className="text-sm font-semibold text-[var(--text-strong)]">Результат сохранения</h3>
          <ul className="mt-2 space-y-1 text-xs">
            {results.map((r, idx) => (
              <li key={`${r.sourceRow}-${idx}`} className={r.ok ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>
                Строка {r.sourceRow || "?"}, наряд {r.orderNumber || "?"}: {r.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
