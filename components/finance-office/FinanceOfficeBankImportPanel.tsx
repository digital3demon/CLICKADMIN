"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  classifyFinanceOfficeDropFiles,
  type FinanceInvoiceImportApplyResult,
  type FinanceInvoiceImportPreviewRow,
} from "@/lib/finance-office-invoice-import";

type BankPreviewRow = {
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

type BankApplyResult = {
  sourceRow: number;
  orderNumber: string;
  ok: boolean;
  message: string;
};

export function FinanceOfficeBankImportPanel({
  className = "",
  compact = false,
}: {
  className?: string;
  /** Компактная зона загрузки в шапке ФинОтдела. */
  compact?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"bank" | "invoices" | null>(null);
  const [bankRows, setBankRows] = useState<BankPreviewRow[]>([]);
  const [invoiceRows, setInvoiceRows] = useState<FinanceInvoiceImportPreviewRow[]>(
    [],
  );
  const [bankResults, setBankResults] = useState<BankApplyResult[]>([]);
  const [invoiceResults, setInvoiceResults] = useState<
    FinanceInvoiceImportApplyResult[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRows = bankRows.length > 0 || invoiceRows.length > 0;

  const patchBankRow = (idx: number, patch: Partial<BankPreviewRow>) => {
    setBankRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
    setBankResults([]);
  };

  const patchInvoiceRow = (
    idx: number,
    patch: Partial<FinanceInvoiceImportPreviewRow>,
  ) => {
    setInvoiceRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
    setInvoiceResults([]);
  };

  const previewBank = async (file: File) => {
    const form = new FormData();
    form.set("file", file);
    const res = await fetch("/api/finance-office/bank-import/preview", {
      method: "POST",
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as {
      rows?: BankPreviewRow[];
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || "Не удалось прочитать выгрузку");
    setBankRows(Array.isArray(data.rows) ? data.rows : []);
    setInvoiceRows([]);
    setMode("bank");
  };

  const previewInvoices = async (pack: File[]) => {
    const form = new FormData();
    for (const f of pack) form.append("files", f);
    const res = await fetch("/api/finance-office/invoice-import/preview", {
      method: "POST",
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as {
      rows?: FinanceInvoiceImportPreviewRow[];
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || "Не удалось прочитать счета");
    setInvoiceRows(Array.isArray(data.rows) ? data.rows : []);
    setBankRows([]);
    setMode("invoices");
  };

  const onFiles = (list: FileList | File[] | null) => {
    const next = list ? Array.from(list).filter((f) => f.size > 0) : [];
    setFiles(next);
    setBankRows([]);
    setInvoiceRows([]);
    setBankResults([]);
    setInvoiceResults([]);
    setError(null);
    setMode(null);
    if (next.length === 0) return;
    void runPreview(next);
  };

  const runPreview = async (pack: File[]) => {
    const kind = classifyFinanceOfficeDropFiles(
      pack.map((f) => ({ name: f.name, type: f.type })),
    );
    if (kind.kind === "mixed") {
      setError("Оплаты (Excel) и счета (PDF/ZIP) загружайте отдельно");
      return;
    }
    if (kind.kind === "unknown") {
      setError("Поддерживаются Excel оплат или PDF/ZIP счетов");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (kind.kind === "bank") {
        await previewBank(pack[0]!);
      } else {
        await previewInvoices(pack);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка чтения файла");
    } finally {
      setBusy(false);
    }
  };

  const applyBank = async () => {
    const res = await fetch("/api/finance-office/bank-import/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: bankRows }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      results?: BankApplyResult[];
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || "Не удалось сохранить оплату");
    setBankResults(Array.isArray(data.results) ? data.results : []);
  };

  const applyInvoices = async () => {
    const form = new FormData();
    for (const f of files) form.append("files", f);
    form.set("rows", JSON.stringify(invoiceRows));
    const res = await fetch("/api/finance-office/invoice-import/apply", {
      method: "POST",
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as {
      results?: FinanceInvoiceImportApplyResult[];
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || "Не удалось прикрепить счета");
    setInvoiceResults(Array.isArray(data.results) ? data.results : []);
  };

  const apply = async () => {
    setBusy(true);
    setError(null);
    setBankResults([]);
    setInvoiceResults([]);
    try {
      if (mode === "invoices") await applyInvoices();
      else await applyBank();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  };

  const fileLabel =
    files.length === 0
      ? ""
      : files.length === 1
        ? files[0]!.name
        : `${files.length} файла`;

  return (
    <section
      className={[
        "rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm",
        compact ? "flex min-h-[3.25rem] flex-col" : "",
        hasRows ? "col-span-2 xl:col-span-2" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={
          compact
            ? "flex min-h-0 flex-1 flex-col rounded-lg bg-[var(--surface-subtle)] p-1"
            : "rounded-lg bg-[var(--surface-subtle)] p-2.5"
        }
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
        onPaste={(e) => onFiles(e.clipboardData.files)}
        tabIndex={0}
      >
        <div
          className={
            compact
              ? "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center rounded-md border border-dashed border-[var(--card-border)] px-2 py-1 text-center outline-none transition-colors focus-within:border-[var(--sidebar-blue)] focus-within:ring-2 focus-within:ring-[var(--sidebar-blue)]/25"
              : "rounded-xl border-2 border-dashed border-[var(--card-border)] px-4 py-4 text-center outline-none transition-colors focus-within:border-[var(--sidebar-blue)] focus-within:ring-2 focus-within:ring-[var(--sidebar-blue)]/25"
          }
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".xls,.xlsx,.pdf,.zip,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={
              compact
                ? "rounded-md bg-[var(--sidebar-blue)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 sm:text-xs"
                : "rounded-lg bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            }
            disabled={busy}
          >
            {busy
              ? mode === "invoices"
                ? "Читаю счета…"
                : "Читаю файл…"
              : "Выбрать файлы · Ctrl+V"}
          </button>
          {compact ? null : (
            <p className="mt-2 text-xs leading-snug text-[var(--text-muted)]">
              Excel — оплаты. PDF или ZIP — счета на наряды. Несколько файлов
              и архивы можно сразу.
            </p>
          )}
          {files.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
              <span className="max-w-full truncate text-xs text-[var(--text-muted)]">
                {fileLabel}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runPreview(files)}
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
              >
                Перечитать
              </button>
            </div>
          ) : compact ? (
            <p className="mt-0.5 text-[10px] leading-tight text-[var(--text-muted)]">
              Перетащите или Ctrl+V
            </p>
          ) : null}
        </div>
        {error ? (
          <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-300">
            {error}
          </p>
        ) : null}
      </div>

      {bankRows.length > 0 ? (
        <div className="space-y-3 p-3">
          <div className="max-h-[min(72dvh,760px)] overflow-auto rounded-md border border-[var(--card-border)]">
            <table className="min-w-[58rem] table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[5.5rem]" />
                <col className="w-[4.5rem]" />
                <col className="w-[15rem]" />
                <col className="w-[10rem]" />
                <col className="w-[10rem]" />
                <col className="w-[5rem]" />
                <col className="w-[8rem]" />
              </colgroup>
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
                {bankRows.map((row, idx) => (
                  <tr key={`${row.sourceRow}-${idx}`} className={row.errors.length ? "bg-amber-500/10" : ""}>
                    <td className="px-2 py-2 align-top text-center">
                      <input
                        type="checkbox"
                        checked={row.apply}
                        onChange={(e) => patchBankRow(idx, { apply: e.target.checked })}
                      />
                    </td>
                    <td className="px-2 py-2 align-top font-mono">{row.sourceRow}</td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={row.orderNumber}
                        onChange={(e) =>
                          patchBankRow(idx, { orderNumber: e.target.value, errors: [] })
                        }
                        className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1"
                      />
                      <div className="mt-1 max-h-20 overflow-y-auto whitespace-normal break-words text-[10px] leading-snug text-[var(--text-muted)]">
                        {row.orderLabel ?? row.originalText}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={row.invoiceNumberRaw}
                        onChange={(e) =>
                          patchBankRow(idx, {
                            invoiceNumberRaw: e.target.value,
                            errors: [],
                          })
                        }
                        className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={row.invoiceDate || row.dateRaw}
                        onChange={(e) =>
                          patchBankRow(idx, { invoiceDate: e.target.value, errors: [] })
                        }
                        className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1"
                      />
                    </td>
                    <td className="px-2 py-2 align-top text-center">
                      <input
                        type="checkbox"
                        checked={row.paid}
                        onChange={(e) =>
                          patchBankRow(idx, { paid: e.target.checked, errors: [] })
                        }
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

      {invoiceRows.length > 0 ? (
        <div className="space-y-3 p-3">
          <div className="max-h-[min(72dvh,760px)] overflow-auto rounded-md border border-[var(--card-border)]">
            <table className="min-w-[58rem] table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[5.5rem]" />
                <col className="w-[16rem]" />
                <col className="w-[10rem]" />
                <col className="w-[12rem]" />
                <col className="w-[14rem]" />
                <col className="w-[10rem]" />
              </colgroup>
              <thead className="bg-[var(--surface-subtle)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="px-2 py-2">Применить</th>
                  <th className="px-2 py-2">Файл</th>
                  <th className="px-2 py-2">№ счёта</th>
                  <th className="px-2 py-2">Наряд</th>
                  <th className="px-2 py-2">Найден</th>
                  <th className="px-2 py-2">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {invoiceRows.map((row, idx) => (
                  <tr
                    key={row.key}
                    className={row.errors.length ? "bg-amber-500/10" : ""}
                  >
                    <td className="px-2 py-2 align-top text-center">
                      <input
                        type="checkbox"
                        checked={row.apply}
                        onChange={(e) =>
                          patchInvoiceRow(idx, { apply: e.target.checked })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="break-words font-medium text-[var(--text-strong)]">
                        {row.fileName}
                      </div>
                      {row.sourceArchive ? (
                        <div className="text-[10px] text-[var(--text-muted)]">
                          из {row.sourceArchive}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={row.invoiceNumberRaw}
                        onChange={(e) =>
                          patchInvoiceRow(idx, {
                            invoiceNumberRaw: e.target.value,
                            errors: [],
                          })
                        }
                        className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={row.orderNumber}
                        onChange={(e) =>
                          patchInvoiceRow(idx, {
                            orderNumber: e.target.value,
                            errors: [],
                            apply: true,
                          })
                        }
                        className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 font-mono"
                      />
                      {row.basisSnippet ? (
                        <div className="mt-1 max-h-16 overflow-y-auto text-[10px] leading-snug text-[var(--text-muted)]">
                          {row.basisSnippet}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 align-top text-[10px] leading-snug text-[var(--text-muted)]">
                      {row.orderLabel ?? "—"}
                      {row.alreadyHasInvoice ? (
                        <div className="mt-1 font-medium text-amber-700 dark:text-amber-300">
                          Заменит старый счёт
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 align-top">
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
              {busy ? "Сохранение…" : "Прикрепить счета"}
            </button>
          </div>
        </div>
      ) : null}

      {bankResults.length > 0 ? (
        <div className="border-t border-[var(--card-border)] p-3">
          <h3 className="text-sm font-semibold text-[var(--text-strong)]">
            Результат сохранения
          </h3>
          <ul className="mt-2 space-y-1 text-xs">
            {bankResults.map((r, idx) => (
              <li
                key={`${r.sourceRow}-${idx}`}
                className={
                  r.ok
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
                }
              >
                Строка {r.sourceRow || "?"}, наряд {r.orderNumber || "?"}: {r.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {invoiceResults.length > 0 ? (
        <div className="border-t border-[var(--card-border)] p-3">
          <h3 className="text-sm font-semibold text-[var(--text-strong)]">
            Результат счетов
          </h3>
          <ul className="mt-2 space-y-1 text-xs">
            {invoiceResults.map((r) => (
              <li
                key={r.key}
                className={
                  r.ok
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
                }
              >
                {r.orderNumber || "—"}: {r.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
