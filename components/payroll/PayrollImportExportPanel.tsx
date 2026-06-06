"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { PayrollImportPreviewRow } from "@/lib/payroll-xlsx";

type PreviewPayload = {
  parseIssues: string[];
  rows: PayrollImportPreviewRow[];
  summary: {
    total: number;
    toCreate: number;
    toUpdate: number;
    unchanged: number;
    withIssues: number;
  };
};

type Props = {
  onApplied: () => void;
};

function actionLabel(action: PayrollImportPreviewRow["action"]): string {
  if (action === "create") return "Создать";
  if (action === "update") return "Обновить";
  return "Без изменений";
}

export function PayrollImportExportPanel({ onApplied }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [draftRows, setDraftRows] = useState<PayrollImportPreviewRow[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const exportTemplate = () => {
    window.location.assign("/api/payroll/config/export");
  };

  const uploadPreview = async (file: File) => {
    setLoading(true);
    setError(null);
    setOk(null);
    setConfirmed(false);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/payroll/config/import/preview", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as PreviewPayload & { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось разобрать файл");
      setPreview(data);
      setDraftRows(data.rows.filter((r) => r.action !== "unchanged"));
      if (data.rows.length === 0 && data.parseIssues.length === 0) {
        setError("В файле нет строк с ценами для импорта");
      }
    } catch (e) {
      setPreview(null);
      setDraftRows([]);
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const applyRows = async () => {
    if (!confirmed) return;
    setApplying(true);
    setError(null);
    setOk(null);
    try {
      const payload = draftRows
        .filter(
          (r) =>
            r.issues.length === 0 &&
            r.priceListItemId &&
            r.amountRub > 0 &&
            r.description.trim(),
        )
        .map((r) => ({
          priceListItemId: r.priceListItemId,
          kind: r.kind,
          amountRub: r.amountRub,
          description: r.description.trim(),
          existingConfigId: r.existingConfigId,
        }));
      if (payload.length === 0) {
        throw new Error("Нет строк для применения");
      }
      const res = await fetch("/api/payroll/config/import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true, rows: payload }),
      });
      const data = (await res.json()) as {
        error?: string;
        created?: number;
        updated?: number;
        skipped?: number;
      };
      if (!res.ok) throw new Error(data.error || "Импорт не выполнен");
      setOk(
        `Импорт выполнен: создано ${data.created ?? 0}, обновлено ${data.updated ?? 0}.`,
      );
      setPreview(null);
      setDraftRows([]);
      setConfirmed(false);
      if (fileRef.current) fileRef.current.value = "";
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка импорта");
    } finally {
      setApplying(false);
    }
  };

  const patchRow = useCallback(
    (rowNumber: number, kind: string, patch: Partial<PayrollImportPreviewRow>) => {
      setDraftRows((prev) =>
        prev.map((row) =>
          row.rowNumber === rowNumber && row.kind === kind ? { ...row, ...patch } : row,
        ),
      );
      setConfirmed(false);
    },
    [],
  );

  const displayRows = useMemo(() => preview?.rows ?? [], [preview]);

  const inputCls =
    "w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-sm text-[var(--text-strong)]";

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <h2 className="text-base font-semibold text-[var(--text-strong)]">
        Импорт и выгрузка цен
      </h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Скачайте шаблон с позициями активного прайса, заполните столбцы CAD, CAD
        Хирургия, Мануал и Обработка. Внизу листа — блок «Без категории»
        (название плашки и цена). Загрузите файл, проверьте таблицу и подтвердите
        импорт.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportTemplate}
          className="rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-hover)]"
        >
          Скачать шаблон Excel
        </button>
        <label className="cursor-pointer rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
          {loading ? "Чтение…" : "Загрузить заполненный файл"}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadPreview(f);
            }}
          />
        </label>
      </div>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-300">{error}</p>
      ) : null}
      {ok ? (
        <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">{ok}</p>
      ) : null}

      {preview ? (
        <div className="mt-4 space-y-3">
          {preview.parseIssues.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
              {preview.parseIssues.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-sm text-[var(--text-secondary)]">
            К импорту: создать {preview.summary.toCreate}, обновить{" "}
            {preview.summary.toUpdate}, без изменений {preview.summary.unchanged}.
            {preview.summary.withIssues > 0
              ? ` Строк с ошибками: ${preview.summary.withIssues} — исправьте в Excel или в таблице ниже.`
              : null}
          </p>

          <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="px-2 py-2">Действие</th>
                  <th className="px-2 py-2">Тип</th>
                  <th className="px-2 py-2">Код</th>
                  <th className="px-2 py-2">Позиция</th>
                  <th className="px-2 py-2">Цена ₽</th>
                  <th className="px-2 py-2">Описание плашки</th>
                  <th className="px-2 py-2">Замечания</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {displayRows.map((row) => {
                  const draft =
                    draftRows.find(
                      (d) => d.rowNumber === row.rowNumber && d.kind === row.kind,
                    ) ?? row;
                  const editable = row.action !== "unchanged";
                  const inDraft =
                    editable && draft.issues.length === 0 && Boolean(draft.priceListItemId);
                  return (
                    <tr
                      key={`${row.rowNumber}-${row.kind}-${row.description}`}
                      className={
                        row.issues.length > 0
                          ? "bg-red-500/5"
                          : row.action === "unchanged"
                            ? "opacity-60"
                            : inDraft
                              ? "bg-emerald-500/5"
                              : ""
                      }
                    >
                      <td className="px-2 py-2">{actionLabel(row.action)}</td>
                      <td className="px-2 py-2">{row.kindLabel}</td>
                      <td className="px-2 py-2 font-mono text-xs">{row.priceCode}</td>
                      <td className="max-w-[200px] px-2 py-2">{row.priceName}</td>
                      <td className="px-2 py-2">
                        {editable ? (
                          <input
                            className={inputCls}
                            inputMode="numeric"
                            value={draft.amountRub}
                            onChange={(e) => {
                              const n = Number.parseInt(
                                e.target.value.replace(/\s/g, ""),
                                10,
                              );
                              patchRow(row.rowNumber, row.kind, {
                                amountRub: Number.isFinite(n) ? n : draft.amountRub,
                              });
                            }}
                          />
                        ) : (
                          row.amountRub.toLocaleString("ru-RU")
                        )}
                      </td>
                      <td className="max-w-[220px] px-2 py-2">
                        {editable ? (
                          <input
                            className={inputCls}
                            value={draft.description}
                            onChange={(e) =>
                              patchRow(row.rowNumber, row.kind, {
                                description: e.target.value,
                              })
                            }
                          />
                        ) : (
                          row.description
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs text-red-600 dark:text-red-300">
                        {row.issues.map((i) => i.message).join("; ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {draftRows.some((r) => r.issues.length === 0 && r.priceListItemId) ? (
            <div className="flex flex-wrap items-center gap-4 border-t border-[var(--card-border)] pt-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-strong)]">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--input-border)]"
                />
                Данные корректны, применить в ФОТ
              </label>
              <button
                type="button"
                disabled={!confirmed || applying}
                onClick={() => void applyRows()}
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                {applying ? "Применение…" : "Применить импорт"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setDraftRows([]);
                  setConfirmed(false);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="rounded-md border border-[var(--input-border)] px-3 py-2 text-sm text-[var(--text-strong)]"
              >
                Отмена
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
