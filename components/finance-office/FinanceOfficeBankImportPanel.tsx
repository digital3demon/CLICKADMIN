"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileAwareDialog } from "@/components/ui/MobileAwareDialog";
import { Spinner } from "@/components/ui/Spinner";
import { FinanceOfficeOrderPickSearch } from "@/components/finance-office/FinanceOfficeOrderPickSearch";
import {
  bindFinanceInvoiceRowToOrder,
  classifyFinanceOfficeDropFiles,
  filterInvoiceRowsForRetry,
  financeInvoiceRowCanApply,
  financeInvoiceRowIsRecognized,
  findUpdDtosByNumber,
  invoiceImportSourceFileNames,
  isFinanceInvoiceImportRetryable,
  readFinanceInvoiceImportApplyResponse,
  withPreviewRowUpdItems,
  type FinanceInvoiceImportApplyResult,
  type FinanceInvoiceImportPreviewRow,
  type FinanceUpdPoolItemDto,
} from "@/lib/finance-office-invoice-import";
import { blobForFinanceInvoicePreviewRow } from "@/lib/finance-office-invoice-preview-blob";

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

function invoiceSaveProgressLabel(opts: {
  phase: "upload" | "unpack" | "attach";
  done: number;
  total: number;
}): string {
  if (opts.phase === "upload") return "Отправляю файлы…";
  if (opts.phase === "unpack") return "Распаковываю архив…";
  if (opts.total > 0) return `Прикрепляю ${opts.done} из ${opts.total}`;
  return "Прикрепляю счета…";
}

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
  const moreDocsInputRef = useRef<HTMLInputElement>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const previewGenRef = useRef(0);
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"bank" | "invoices" | null>(null);
  const [bankRows, setBankRows] = useState<BankPreviewRow[]>([]);
  const [invoiceRows, setInvoiceRows] = useState<FinanceInvoiceImportPreviewRow[]>(
    [],
  );
  const [updPool, setUpdPool] = useState<FinanceUpdPoolItemDto[]>([]);
  const [bankResults, setBankResults] = useState<BankApplyResult[]>([]);
  const [invoiceResults, setInvoiceResults] = useState<
    FinanceInvoiceImportApplyResult[]
  >([]);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceResultOpen, setInvoiceResultOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [saveProgress, setSaveProgress] = useState<{
    phase: "upload" | "unpack" | "attach";
    done: number;
    total: number;
  } | null>(null);
  const [saveByKey, setSaveByKey] = useState<
    Record<string, FinanceInvoiceImportApplyResult>
  >({});
  const [moreDocsDrag, setMoreDocsDrag] = useState(false);
  const lastInvoiceRowsRef = useRef<FinanceInvoiceImportPreviewRow[]>([]);

  const busy = reading || saving;
  const hasRows = bankRows.length > 0;
  const invoicePreviewOpen = invoiceRows.length > 0 && !invoiceResultOpen;
  const savingInvoiceKey =
    saving && saveProgress?.phase === "attach"
      ? (invoiceRows.find((r) => r.apply && !saveByKey[r.key])?.key ?? null)
      : null;

  const abortPreview = () => {
    previewAbortRef.current?.abort();
    previewAbortRef.current = null;
    previewGenRef.current += 1;
    setReading(false);
  };

  const clearFileInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

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

  const previewBank = async (file: File, signal: AbortSignal) => {
    const form = new FormData();
    form.set("file", file);
    const res = await fetch("/api/finance-office/bank-import/preview", {
      method: "POST",
      body: form,
      signal,
    });
    const data = (await res.json().catch(() => ({}))) as {
      rows?: BankPreviewRow[];
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || "Не удалось прочитать выгрузку");
    return Array.isArray(data.rows) ? data.rows : [];
  };

  const previewInvoices = async (pack: File[], signal: AbortSignal) => {
    const form = new FormData();
    for (const f of pack) form.append("files", f);
    const res = await fetch("/api/finance-office/invoice-import/preview", {
      method: "POST",
      body: form,
      signal,
    });
    const data = (await res.json().catch(() => ({}))) as {
      rows?: FinanceInvoiceImportPreviewRow[];
      updPool?: FinanceUpdPoolItemDto[];
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || "Не удалось прочитать счета");
    return {
      rows: Array.isArray(data.rows) ? data.rows : [],
      updPool: Array.isArray(data.updPool) ? data.updPool : [],
    };
  };

  const onFiles = (list: FileList | File[] | null) => {
    const incoming = list ? Array.from(list).filter((f) => f.size > 0) : [];
    const kindIn = classifyFinanceOfficeDropFiles(
      incoming.map((f) => ({ name: f.name, type: f.type })),
    );
    const merging =
      invoiceRows.length > 0 &&
      !invoiceResultOpen &&
      kindIn.kind === "invoices";
    const next = merging
      ? [
          ...files,
          ...incoming.filter((f) => !files.some((p) => p.name === f.name && p.size === f.size)),
        ]
      : incoming;
    abortPreview();
    setFiles(next);
    if (!merging) {
      setBankRows([]);
      setInvoiceRows([]);
      setUpdPool([]);
      setBankResults([]);
      setInvoiceResults([]);
      setInvoiceResultOpen(false);
      setMode(null);
    }
    setError(null);
    if (next.length === 0) return;
    void runPreview(next);
  };

  const runPreview = async (pack: File[]) => {
    const kind = classifyFinanceOfficeDropFiles(
      pack.map((f) => ({ name: f.name, type: f.type })),
    );
    if (kind.kind === "mixed") {
      setInvoiceRows([]);
      setError("Оплаты (Excel) и счета (PDF/архив) загружайте отдельно");
      return;
    }
    if (kind.kind === "unknown") {
      setInvoiceRows([]);
      setError("Поддерживаются Excel оплат или PDF / ZIP / RAR / 7z счетов");
      return;
    }
    previewAbortRef.current?.abort();
    const ac = new AbortController();
    previewAbortRef.current = ac;
    const gen = ++previewGenRef.current;
    setReading(true);
    setError(null);
    try {
      if (kind.kind === "bank") {
        const rows = await previewBank(pack[0]!, ac.signal);
        if (gen !== previewGenRef.current) return;
        setBankRows(rows);
        setInvoiceRows([]);
        setMode("bank");
      } else {
        const preview = await previewInvoices(pack, ac.signal);
        if (gen !== previewGenRef.current) return;
        setInvoiceRows(preview.rows);
        setUpdPool(preview.updPool);
        setBankRows([]);
        setMode("invoices");
      }
    } catch (e) {
      if (ac.signal.aborted || gen !== previewGenRef.current) return;
      setInvoiceRows([]);
      setError(e instanceof Error ? e.message : "Ошибка чтения файла");
    } finally {
      if (gen === previewGenRef.current) setReading(false);
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
    lastInvoiceRowsRef.current = invoiceRows;
    const applyCount = invoiceRows.filter((r) => r.apply).length;
    setSaveByKey({});
    setSaveProgress({ phase: "upload", done: 0, total: applyCount });
    const form = new FormData();
    for (const f of files) form.append("files", f);
    form.set(
      "rows",
      JSON.stringify(
        invoiceRows.map((r) => ({
          ...r,
          updKeys: (r.updItems ?? []).map((i) => i.key),
        })),
      ),
    );
    const res = await fetch("/api/finance-office/invoice-import/apply", {
      method: "POST",
      headers: { Accept: "application/x-ndjson" },
      body: form,
    });
    const results = await readFinanceInvoiceImportApplyResponse(res, (ev) => {
      if (ev.type === "phase") {
        setSaveProgress((prev) => ({
          phase: ev.phase,
          done: prev?.done ?? 0,
          total: prev?.total ?? applyCount,
        }));
      }
      if (ev.type === "start") {
        setSaveProgress({ phase: "attach", done: 0, total: ev.total });
      }
      if (ev.type === "row") {
        setSaveByKey((prev) => ({ ...prev, [ev.result.key]: ev.result }));
        setSaveProgress({
          phase: "attach",
          done: ev.done,
          total: ev.total,
        });
      }
    });
    setInvoiceResults(results);
    setInvoiceRows([]);
    setInvoiceResultOpen(true);
  };

  const apply = async () => {
    setSaving(true);
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
      setSaving(false);
      setSaveProgress(null);
    }
  };

  const fileLabel =
    files.length === 0
      ? ""
      : files.length === 1
        ? files[0]!.name
        : `${files.length} файла`;

  const closePdfPreview = useCallback(() => {
    setPdfPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const openInvoicePdf = async (row: FinanceInvoiceImportPreviewRow) => {
    setError(null);
    let blob: Blob | null = null;
    if (
      row.sourceKind === "crm-invoice" &&
      row.orderId &&
      row.invoiceAttachmentId
    ) {
      const res = await fetch(
        `/api/orders/${row.orderId}/attachments/${row.invoiceAttachmentId}`,
        { credentials: "include" },
      );
      if (res.ok) blob = await res.blob();
    } else {
      blob = await blobForFinanceInvoicePreviewRow(row, files);
    }
    if (!blob) {
      setError("Не удалось открыть PDF счёта");
      return;
    }
    const url = URL.createObjectURL(blob);
    setPdfPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return { url, title: row.fileName || "Счёт" };
    });
  };

  const openUpdPdf = async (item: FinanceUpdPoolItemDto) => {
    setError(null);
    const blob = await blobForFinanceInvoicePreviewRow(
      { fileName: item.fileName, sourceArchive: item.sourceArchive },
      files,
    );
    if (!blob) {
      setError("Не удалось открыть PDF УПД");
      return;
    }
    const url = URL.createObjectURL(blob);
    setPdfPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return { url, title: item.fileName };
    });
  };

  const setRowUpdNumber = (idx: number, value: string) => {
    const found = findUpdDtosByNumber(updPool, value);
    const taken = new Set(found.map((i) => i.key));
    setInvoiceRows((prev) =>
      prev.map((row, i) => {
        if (i === idx) {
          return withPreviewRowUpdItems({ ...row, updNumberRaw: value }, found);
        }
        if (found.length === 1) {
          const leftover = (row.updItems ?? []).filter((x) => !taken.has(x.key));
          if (leftover.length !== (row.updItems ?? []).length) {
            return withPreviewRowUpdItems(row, leftover);
          }
        }
        return row;
      }),
    );
    setInvoiceResults([]);
  };

  const bindInvoiceRowOrder = (
    idx: number,
    hit: Parameters<typeof bindFinanceInvoiceRowToOrder>[1],
  ) => {
    setInvoiceRows((prev) =>
      prev.map((row, i) =>
        i === idx ? bindFinanceInvoiceRowToOrder(row, hit) : row,
      ),
    );
    setInvoiceResults([]);
  };

  const removeUpdFromRow = (idx: number, updKey: string) => {
    setInvoiceRows((prev) =>
      prev.map((row, i) =>
        i === idx
          ? withPreviewRowUpdItems(
              row,
              (row.updItems ?? []).filter((x) => x.key !== updKey),
            )
          : row,
      ),
    );
    setInvoiceResults([]);
  };

  const closeInvoicePreview = () => {
    if (saving) return;
    abortPreview();
    setInvoiceRows([]);
    setUpdPool([]);
    setError(null);
    setFiles([]);
    setMode(null);
    clearFileInput();
    closePdfPreview();
  };

  const openFilePicker = () => {
    if (saving) return;
    abortPreview();
    inputRef.current?.click();
  };

  const pickAnotherInvoiceFile = () => {
    if (saving) return;
    abortPreview();
    setInvoiceRows([]);
    setInvoiceResults([]);
    setInvoiceResultOpen(false);
    setError(null);
    setFiles([]);
    setMode(null);
    clearFileInput();
    closePdfPreview();
    window.setTimeout(() => inputRef.current?.click(), 180);
  };

  const retryInvoiceImport = () => {
    const retryRows = filterInvoiceRowsForRetry(
      lastInvoiceRowsRef.current,
      invoiceResults,
    ).map((row) => ({ ...row, apply: true }));
    if (retryRows.length === 0) {
      setInvoiceResultOpen(false);
      return;
    }
    const keepNames = new Set(invoiceImportSourceFileNames(retryRows));
    setFiles((prev) => prev.filter((f) => keepNames.has(f.name)));
    lastInvoiceRowsRef.current = retryRows;
    setInvoiceRows(retryRows);
    setInvoiceResults([]);
    setInvoiceResultOpen(false);
    setError(null);
    closePdfPreview();
  };

  const canRetryFailedInvoices = invoiceResults.some(
    isFinanceInvoiceImportRetryable,
  );

  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  const acceptMoreDocs = (list: FileList | File[] | null) => {
    if (saving) return;
    onFiles(list);
  };

  useEffect(() => {
    const wantsFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onDragOver = (e: DragEvent) => {
      if (!wantsFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onDrop = (e: DragEvent) => {
      if (!wantsFiles(e) || !e.dataTransfer?.files?.length) return;
      e.preventDefault();
      onFilesRef.current(e.dataTransfer.files);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  useEffect(() => {
    if (!invoicePreviewOpen) {
      setMoreDocsDrag(false);
      return;
    }
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      ) {
        return;
      }
      const pack = e.clipboardData?.files;
      if (!pack?.length) return;
      e.preventDefault();
      onFilesRef.current(pack);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [invoicePreviewOpen]);

  useEffect(() => {
    return () => {
      previewAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
    };
  }, [pdfPreview?.url]);

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
            accept=".xls,.xlsx,.pdf,.zip,.rar,.7z,application/zip,application/x-zip-compressed,application/vnd.rar,application/x-rar-compressed,application/x-7z-compressed,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={openFilePicker}
            className={
              compact
                ? "rounded-md bg-[var(--sidebar-blue)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 sm:text-xs"
                : "rounded-lg bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            }
            disabled={saving}
          >
            {reading
              ? mode === "invoices"
                ? "Читаю счета…"
                : "Читаю файл…"
              : "Выбрать файлы · Ctrl+V"}
          </button>
          {compact ? null : (
            <p className="mt-2 text-xs leading-snug text-[var(--text-muted)]">
              Excel — оплаты. PDF или ZIP / RAR / 7z — счета на наряды. Можно
              перетащить на страницу.
            </p>
          )}
          {files.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
              <span className="max-w-full truncate text-xs text-[var(--text-muted)]">
                {fileLabel}
              </span>
              <button
                type="button"
                disabled={reading || saving}
                onClick={() => void runPreview(files)}
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
              >
                Перечитать
              </button>
              {error ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={pickAnotherInvoiceFile}
                  className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
                >
                  Выбрать другой файл
                </button>
              ) : null}
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
              className="inline-flex items-center gap-2 rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Сохранение…
                </>
              ) : (
                "Сохранить оплаты"
              )}
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

      <MobileAwareDialog
        open={invoicePreviewOpen}
        onClose={closeInvoicePreview}
        title="Распознавание счетов"
        description={
          files.length > 1 ? `${files.length} файла` : files[0]?.name
        }
        size="wide"
        closeOnEscape={!pdfPreview && !saving}
        closeOnBackdrop={!pdfPreview && !saving}
        footer={
          <div className="flex w-full min-w-0 flex-col gap-2">
            {busy && saveProgress ? (
              <div
                className="flex min-w-0 items-center gap-3"
                role="status"
                aria-live="polite"
              >
                <Spinner size="sm" className="shrink-0 text-[var(--sidebar-blue)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-strong)]">
                    {invoiceSaveProgressLabel(saveProgress)}
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                    {saveProgress.phase === "attach" && saveProgress.total > 0 ? (
                      <div
                        className="h-full rounded-full bg-[var(--sidebar-blue)] transition-[width] duration-200"
                        style={{
                          width: `${Math.round(
                            (saveProgress.done / saveProgress.total) * 100,
                          )}%`,
                        }}
                      />
                    ) : (
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--sidebar-blue)]" />
                    )}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={closeInvoicePreview}
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
            >
              Закрыть
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={pickAnotherInvoiceFile}
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
            >
              Другой файл
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void apply()}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  {saveProgress?.phase === "attach" && saveProgress.total > 0
                    ? `${saveProgress.done} / ${saveProgress.total}`
                    : "Сохранение…"}
                </>
              ) : (
                "Прикрепить счета"
              )}
            </button>
            </div>
          </div>
        }
      >
        {error ? (
          <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-300">
            {error}
          </p>
        ) : null}
        <input
          ref={moreDocsInputRef}
          type="file"
          multiple
          accept=".pdf,.zip,.rar,.7z,application/zip,application/x-zip-compressed,application/vnd.rar,application/x-rar-compressed,application/x-7z-compressed,application/pdf"
          className="hidden"
          onChange={(e) => {
            acceptMoreDocs(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            if (saving) return;
            moreDocsInputRef.current?.click();
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!saving) setMoreDocsDrag(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setMoreDocsDrag(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMoreDocsDrag(false);
            acceptMoreDocs(e.dataTransfer.files);
          }}
          className={[
            "mb-3 w-full rounded-lg border-2 border-dashed px-3 py-2.5 text-left transition-colors disabled:opacity-50",
            moreDocsDrag
              ? "border-[var(--sidebar-blue)] bg-[var(--sidebar-blue)]/10"
              : "border-[var(--card-border)] bg-[var(--surface-subtle)] hover:border-[var(--sidebar-blue)]/60",
          ].join(" ")}
        >
          <p className="text-sm font-semibold text-[var(--text-strong)]">
            {reading ? "Читаю добавленные файлы…" : "Догрузить счета или УПД"}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
            Перетащите PDF или архив, нажмите, чтобы открыть проводник, либо
            Ctrl+V. Новые файлы добавятся к текущему распознаванию, а не
            заменят его.
          </p>
        </button>
        <div className="overflow-auto rounded-md border border-[var(--card-border)]">
          <table className="min-w-[72rem] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[5.5rem]" />
              <col className="w-[14rem]" />
              <col className="w-[9rem]" />
              <col className="w-[10rem]" />
              <col className="w-[8.5rem]" />
              <col className="w-[14rem]" />
              <col className="w-[11rem]" />
              <col className="w-[9rem]" />
            </colgroup>
            <thead className="bg-[var(--surface-subtle)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-2 py-2">Применить</th>
                <th className="px-2 py-2">Файл</th>
                <th className="px-2 py-2">№ счёта</th>
                <th className="px-2 py-2">УПД</th>
                <th className="px-2 py-2">Наряд</th>
                <th className="px-2 py-2">Что найдено</th>
                <th className="px-2 py-2">Найден</th>
                <th className="px-2 py-2">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {invoiceRows.map((row, idx) => (
                <Fragment key={row.key}>
                <tr
                  className={
                    row.errors.length || row.updMatch === "many"
                      ? "bg-amber-500/10"
                      : ""
                  }
                >
                  <td className="px-2 py-2 align-top text-center">
                    <input
                      type="checkbox"
                      checked={row.apply}
                      disabled={busy}
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
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void openInvoicePdf(row)}
                      className="mt-1 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
                    >
                      Открыть счёт
                    </button>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      value={row.invoiceNumberRaw}
                      disabled={busy}
                      onChange={(e) =>
                        patchInvoiceRow(idx, {
                          invoiceNumberRaw: e.target.value,
                          errors: [],
                        })
                      }
                      className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 disabled:opacity-60"
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    {row.updMatch === "many" ? (
                      <div className="space-y-1.5">
                        {(row.updItems ?? []).map((item) => (
                          <div
                            key={item.key}
                            className="flex flex-wrap items-center gap-1"
                          >
                            <span className="font-mono text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                              {item.number || "—"}
                            </span>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void openUpdPdf(item)}
                              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-1.5 py-0.5 text-[10px] font-semibold"
                            >
                              Открыть УПД
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              aria-label="Удалить УПД со строки"
                              onClick={() => removeUpdFromRow(idx, item.key)}
                              className="rounded px-1 text-[12px] font-bold text-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <input
                          value={row.updNumberRaw ?? ""}
                          disabled={busy}
                          onChange={(e) => setRowUpdNumber(idx, e.target.value)}
                          className={`w-full rounded border px-2 py-1 font-mono disabled:opacity-60 ${
                            row.updMatch === "one"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                              : "border-red-500 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-100"
                          }`}
                        />
                        {row.updMatch === "one" && row.updItems?.[0] ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void openUpdPdf(row.updItems![0]!)}
                            className="mt-1 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-[10px] font-semibold"
                          >
                            Открыть УПД
                          </button>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <div className="font-mono text-[11px] font-semibold text-[var(--text-strong)]">
                      {row.orderNumber || "—"}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top text-[10px] leading-snug text-[var(--text-body)]">
                    {row.basisSnippet || "—"}
                  </td>
                  <td className="px-2 py-2 align-top text-[10px] leading-snug text-[var(--text-muted)]">
                    {row.orderLabel ?? "—"}
                    {row.alreadyHasInvoice && row.sourceKind !== "crm-invoice" ? (
                      <div className="mt-1 font-medium text-amber-700 dark:text-amber-300">
                        Заменит старый счёт
                      </div>
                    ) : null}
                    {row.alreadyHasUpd ? (
                      <div className="mt-1 font-medium text-amber-700 dark:text-amber-300">
                        Заменит старый УПД
                      </div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {saveByKey[row.key] ? (
                      <span
                        className={
                          saveByKey[row.key]!.ok
                            ? "font-medium text-emerald-700 dark:text-emerald-300"
                            : "font-medium text-amber-700 dark:text-amber-300"
                        }
                      >
                        {saveByKey[row.key]!.message}
                      </span>
                    ) : busy && row.apply && savingInvoiceKey === row.key ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-strong)]">
                        <Spinner size="xs" />
                        Сохраняю…
                      </span>
                    ) : busy && row.apply ? (
                      <span className="text-[var(--text-muted)]">В очереди</span>
                    ) : row.errors.length ? (
                      <span className="font-medium text-amber-700 dark:text-amber-300">
                        {row.errors.join("; ")}
                      </span>
                    ) : row.updMatch === "many" ? (
                      <span className="font-medium text-amber-700 dark:text-amber-300">
                        Несколько УПД
                      </span>
                    ) : financeInvoiceRowIsRecognized(row) ? (
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                        Распознано
                      </span>
                    ) : financeInvoiceRowCanApply(row) ? (
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                        К прикреплению
                      </span>
                    ) : !row.orderId ? (
                      <span className="font-medium text-red-700 dark:text-red-300">
                        Выберите наряд
                      </span>
                    ) : (
                      <span className="font-medium text-red-700 dark:text-red-300">
                        Нет УПД
                      </span>
                    )}
                  </td>
                </tr>
                <tr
                  className={
                    row.errors.length || row.updMatch === "many"
                      ? "bg-amber-500/10"
                      : ""
                  }
                >
                  <td colSpan={8} className="px-2 pb-2.5 pt-0">
                    <FinanceOfficeOrderPickSearch
                      disabled={busy}
                      selectedId={row.orderId}
                      selectedNumber={row.orderNumber}
                      selectedLabel={row.orderLabel}
                      onPick={(hit) => bindInvoiceRowOrder(idx, hit)}
                      onClear={() => bindInvoiceRowOrder(idx, null)}
                    />
                  </td>
                </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </MobileAwareDialog>

      <MobileAwareDialog
        open={invoiceResultOpen && invoiceResults.length > 0}
        onClose={() => setInvoiceResultOpen(false)}
        title="Результат счетов"
        size="lg"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setInvoiceResultOpen(false)}
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
            >
              Закрыть
            </button>
            {canRetryFailedInvoices ? (
              <button
                type="button"
                onClick={retryInvoiceImport}
                className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Повторить ошибки
              </button>
            ) : null}
          </div>
        }
      >
        <div className="space-y-3 text-sm">
          {invoiceResults.some((r) => r.ok) ? (
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                Прикреплено
              </p>
              <ul className="mt-1 space-y-1 text-xs">
                {invoiceResults
                  .filter((r) => r.ok)
                  .map((r) => (
                    <li key={r.key}>
                      {r.orderNumber || "—"}: {r.message}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          {invoiceResults.some((r) => !r.ok) ? (
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                Ошибка прикрепления
              </p>
              <ul className="mt-1 space-y-1 text-xs">
                {invoiceResults
                  .filter((r) => !r.ok)
                  .map((r) => (
                    <li key={r.key}>
                      {r.orderNumber || "—"}: {r.message}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      </MobileAwareDialog>

      <MobileAwareDialog
        open={pdfPreview != null}
        onClose={closePdfPreview}
        title={pdfPreview?.title ? `Счёт: ${pdfPreview.title}` : "Счёт"}
        size="full"
      >
        {pdfPreview ? (
          <iframe
            title={pdfPreview.title}
            src={pdfPreview.url}
            className="h-[min(80dvh,48rem)] w-full rounded-md bg-white"
          />
        ) : null}
      </MobileAwareDialog>
    </section>
  );
}
