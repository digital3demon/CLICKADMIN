"use client";

import { useMemo, useState } from "react";
import {
  PrefixSearchCombobox,
  type PrefixComboboxOption,
} from "@/components/ui/PrefixSearchCombobox";

type PreviewIssue = { field: string; message: string };
type RefOption = { id: string; name: string };
type PriceRefOption = { id: string; label: string };

type PreviewRow = {
  rowNumber: number;
  orderNumber: string;
  patientName: string;
  doctorName: string;
  doctorId?: string | null;
  clinicName: string;
  clinicId?: string | null;
  prostheticsText: string;
  additionalSourceNotesText: string;
  correctionTrackText?: string;
  dueDateText: string;
  appointmentDateText: string;
  workReceivedAtText: string;
  invoicedText: string;
  /** Количества по строкам «Выставлено», через «;» — порядок как у позиций после разбора */
  invoicedQuantitiesText?: string;
  createKaitenCard: boolean;
  issues: PreviewIssue[];
};

type ImportResult = { createdCount: number; failedCount: number };

function norm(v: string): string {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[.,;:()"'`«»/\\_-]+/g, " ")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

function toDateValue(raw: string): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  const ymd = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const ru = v.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if (ru) return `${ru[3]}-${String(Number(ru[2])).padStart(2, "0")}-${String(Number(ru[1])).padStart(2, "0")}`;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function splitInvoiced(v: string): string[] {
  const src = String(v ?? "").trim();
  if (!src) return [];
  const lines = src
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const hasUnclosedParen = (text: string) => {
    let depth = 0;
    for (const ch of text) {
      if (ch === "(") depth += 1;
      if (ch === ")" && depth > 0) depth -= 1;
    }
    return depth > 0;
  };
  const isNewItem = (line: string) => {
    const s = line.trim();
    if (!s) return false;
    if (/^\d{3,6}\b/.test(s)) return true;
    return /^(аналог|титанов|абатмент|винт|коронка|модель|протетика)\b/i.test(s);
  };

  const merged: string[] = [];
  let current = "";
  for (const line of lines) {
    if (!current) {
      current = line;
      continue;
    }
    if (hasUnclosedParen(current)) {
      current = `${current} ${line}`;
      continue;
    }
    if (isNewItem(line)) {
      merged.push(current);
      current = line;
      continue;
    }
    current = `${current} ${line}`;
  }
  if (current) merged.push(current);

  return merged
    .flatMap((x) => x.split(/[;,]+/g))
    .map((x) => x.trim())
    .filter(Boolean);
}

function joinInvoiced(items: string[]): string {
  return items
    .map((x) => x.trim())
    .filter(Boolean)
    .join("; ");
}

function splitQtyParts(text: string, len: number): string[] {
  const parts = String(text ?? "")
    .split(";")
    .map((s) => s.trim());
  return Array.from({ length: len }, (_, i) => {
    const v = parts[i];
    if (v === undefined || v === "") return "1";
    return v;
  });
}

function joinQtyParts(parts: string[]): string {
  return parts.join(";");
}

function hasCorrectionInvoicedText(value: string): boolean {
  return /коррекц|передел/i.test(String(value ?? ""));
}

function findRefId(name: string, list: RefOption[]): string | null {
  const q = norm(name);
  if (!q) return null;
  const exact = list.find((x) => norm(x.name) === q);
  if (exact) return exact.id;
  const hits = list.filter((x) => norm(x.name).includes(q) || q.includes(norm(x.name)));
  return hits.length === 1 ? hits[0].id : null;
}

function findPrice(token: string, list: PriceRefOption[]): PriceRefOption | null {
  const q = norm(token);
  if (!q) return null;
  const exact = list.find((x) => norm(x.label) === q);
  if (exact) return exact;
  const hits = list.filter((x) => norm(x.label).includes(q) || q.includes(norm(x.label)));
  return hits.length === 1 ? hits[0] : null;
}

export function OrderImportExportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [busyExport, setBusyExport] = useState(false);
  const [busyPreview, setBusyPreview] = useState(false);
  const [busyImport, setBusyImport] = useState(false);
  const [sheetName, setSheetName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<RefOption[]>([]);
  const [clinicOptions, setClinicOptions] = useState<RefOption[]>([]);
  const [priceOptions, setPriceOptions] = useState<PriceRefOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const issueCount = useMemo(() => rows.filter((r) => r.issues.length > 0).length, [rows]);
  const priceComboboxOptions = useMemo<PrefixComboboxOption[]>(
    () =>
      priceOptions.map((p) => {
        const tokens = p.label
          .split(/\s+/)
          .map((t) => t.trim())
          .filter((t) => t.length >= 2);
        return {
          value: p.id,
          label: p.label,
          searchPrefixes: Array.from(new Set([p.label, ...tokens])),
        };
      }),
    [priceOptions],
  );

  const setRow = (i: number, patch: Partial<PreviewRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const setInvoicedItem = (rowIndex: number, itemIndex: number, value: string) => {
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== rowIndex) return r;
        const items = splitInvoiced(r.invoicedText);
        while (items.length <= itemIndex) items.push("");
        items[itemIndex] = value;
        const newText = joinInvoiced(items);
        const qs = splitQtyParts(r.invoicedQuantitiesText ?? "", items.length);
        return { ...r, invoicedText: newText, invoicedQuantitiesText: joinQtyParts(qs) };
      }),
    );
  };

  const setInvoicedQuantity = (rowIndex: number, itemIndex: number, raw: string) => {
    const n = Number(raw);
    const normalized =
      raw.trim() === "" || !Number.isFinite(n)
        ? "1"
        : String(Math.min(1_000_000, Math.max(1, Math.floor(n))));
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== rowIndex) return r;
        const items = splitInvoiced(r.invoicedText);
        const qs = splitQtyParts(r.invoicedQuantitiesText ?? "", items.length);
        qs[itemIndex] = normalized;
        return { ...r, invoicedQuantitiesText: joinQtyParts(qs) };
      }),
    );
  };

  const addInvoicedItem = (rowIndex: number) => {
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== rowIndex) return r;
        const items = splitInvoiced(r.invoicedText);
        items.push("");
        const qs = splitQtyParts(r.invoicedQuantitiesText ?? "", items.length);
        return {
          ...r,
          invoicedText: joinInvoiced(items),
          invoicedQuantitiesText: joinQtyParts(qs),
        };
      }),
    );
  };

  const runPreview = async () => {
    if (!file) return;
    setBusyPreview(true);
    setLoadError(null);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/orders/import-export/preview", { method: "POST", body: fd });
      const data = (await res.json()) as {
        error?: string;
        rows?: PreviewRow[];
        sheetName?: string;
        refs?: { doctors?: RefOption[]; clinics?: RefOption[]; priceItems?: PriceRefOption[] };
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Не удалось разобрать файл");
        setRows([]);
        return;
      }
      setSheetName(data.sheetName ?? "");
      setRows((Array.isArray(data.rows) ? data.rows : []).map((r) => ({ ...r, appointmentDateText: toDateValue(r.appointmentDateText), dueDateText: toDateValue(r.dueDateText), workReceivedAtText: toDateValue(r.workReceivedAtText) })));
      setDoctorOptions(Array.isArray(data.refs?.doctors) ? data.refs!.doctors! : []);
      setClinicOptions(Array.isArray(data.refs?.clinics) ? data.refs!.clinics! : []);
      setPriceOptions(Array.isArray(data.refs?.priceItems) ? data.refs!.priceItems! : []);
    } catch {
      setLoadError("Ошибка сети при разборе файла");
      setRows([]);
    } finally {
      setBusyPreview(false);
    }
  };

  const runImport = async () => {
    if (rows.length === 0) return;
    setBusyImport(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/orders/import-export/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = (await res.json()) as ImportResult | { error?: string };
      if (!res.ok) {
        setLoadError("error" in data ? data.error ?? "Не удалось сохранить импорт" : "Не удалось сохранить импорт");
        return;
      }
      setImportResult(data as ImportResult);
    } catch {
      setLoadError("Ошибка сети при сохранении импорта");
    } finally {
      setBusyImport(false);
    }
  };

  const runExport = () => {
    setBusyExport(true);
    const params = new URLSearchParams();
    if (exportFrom) params.set("from", exportFrom);
    if (exportTo) params.set("to", exportTo);
    const qs = params.toString();
    const url = `/api/orders/import-export/export${qs ? `?${qs}` : ""}`;
    window.location.href = url;
    window.setTimeout(() => setBusyExport(false), 1200);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-4">
        <div className="mb-2 text-sm font-semibold">Экспорт</div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">
            <span className="mr-1 text-[var(--text-secondary)]">c</span>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="h-9 rounded border border-[var(--input-border)] px-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mr-1 text-[var(--text-secondary)]">по</span>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="h-9 rounded border border-[var(--input-border)] px-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busyExport}
            onClick={runExport}
            className="h-9 rounded-md border border-[var(--input-border)] px-3"
          >
            {busyExport ? "Скачивание..." : "Скачать экспорт"}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-4">
        <div className="mb-2 text-sm font-semibold">Импорт</div>
        <div className="flex items-center gap-2">
          <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="button" disabled={!file || busyPreview} onClick={() => void runPreview()} className="h-9 rounded-md border border-[var(--input-border)] px-3">{busyPreview ? "Разбор..." : "Разобрать таблицу"}</button>
          <button type="button" disabled={rows.length === 0 || busyImport} onClick={() => void runImport()} className="h-9 rounded-md bg-[var(--sidebar-blue)] px-4 text-white">{busyImport ? "Сохранение..." : "Сохранить импорт"}</button>
        </div>
        {rows.length > 0 ? <p className="mt-2 text-sm">Лист: {sheetName || "—"}. Строк: {rows.length}. Проблемных: <b>{issueCount}</b>.</p> : null}
        {loadError ? <p className="mt-2 text-sm text-red-600">{loadError}</p> : null}
      </section>

      {rows.map((row, i) => {
        const doctorId = row.doctorId ?? findRefId(row.doctorName, doctorOptions);
        const clinicId = row.clinicId ?? findRefId(row.clinicName, clinicOptions);
        const invoicedItems = splitInvoiced(row.invoicedText);
        const itemsForUi = invoicedItems.length > 0 ? invoicedItems : [""];
        const qtyParts = splitQtyParts(row.invoicedQuantitiesText ?? "", itemsForUi.length);
        const matches = itemsForUi.map((token) => ({ token, hit: findPrice(token, priceOptions) }));
        const needCorrection = hasCorrectionInvoicedText(row.invoicedText);
        const hasCorrection = /ортопед|ортодон|передел/i.test(
          String(row.correctionTrackText ?? ""),
        );
        return (
          <section key={`${row.rowNumber}-${i}`} className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-4">
            <h3 className="mb-2 font-semibold">Работа {row.rowNumber}</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <input value={row.orderNumber} onChange={(e) => setRow(i, { orderNumber: e.target.value })} className="h-8 rounded border border-[var(--input-border)] px-2 text-sm" />
              <input value={row.patientName} onChange={(e) => setRow(i, { patientName: e.target.value })} className="h-8 rounded border border-[var(--input-border)] px-2 text-sm" />
              <input value={row.prostheticsText} onChange={(e) => setRow(i, { prostheticsText: e.target.value })} placeholder="Протетика заказана/ прислал врач" className="h-8 rounded border border-[var(--input-border)] px-2 text-sm" />
              <input value={row.additionalSourceNotesText} onChange={(e) => setRow(i, { additionalSourceNotesText: e.target.value })} placeholder="Что еще есть к работе" className="h-8 rounded border border-[var(--input-border)] px-2 text-sm" />
              <select
                value={
                  /передел/i.test(String(row.correctionTrackText ?? ""))
                    ? "REWORK"
                    : /ортодон/i.test(String(row.correctionTrackText ?? ""))
                    ? "ORTHODONTICS"
                    : /ортопед/i.test(String(row.correctionTrackText ?? ""))
                      ? "ORTHOPEDICS"
                      : ""
                }
                onChange={(e) =>
                  setRow(i, {
                    correctionTrackText:
                      e.target.value === "REWORK"
                        ? "Переделка"
                        : e.target.value === "ORTHODONTICS"
                        ? "Ортодонтия"
                        : e.target.value === "ORTHOPEDICS"
                          ? "Ортопедия"
                          : "",
                  })
                }
                className={`h-8 rounded border px-2 text-sm ${
                  needCorrection && !hasCorrection
                    ? "border-red-500 bg-red-50 text-black"
                    : "border-[var(--input-border)] bg-white text-black"
                }`}
              >
                <option value="" className="bg-white text-black">Коррекция: не выбрано</option>
                <option value="ORTHOPEDICS" className="bg-white text-black">Коррекция: Ортопедия</option>
                <option value="ORTHODONTICS" className="bg-white text-black">Коррекция: Ортодонтия</option>
                <option value="REWORK" className="bg-white text-black">Коррекция: Переделка</option>
              </select>
              <input type="date" value={toDateValue(row.appointmentDateText)} onChange={(e) => setRow(i, { appointmentDateText: e.target.value })} className="h-8 rounded border border-[var(--input-border)] px-2 text-sm" />
              <input type="date" value={toDateValue(row.dueDateText)} onChange={(e) => setRow(i, { dueDateText: e.target.value })} className="h-8 rounded border border-[var(--input-border)] px-2 text-sm" />
              <div className="space-y-1">
                <select value={doctorId ?? ""} onChange={(e) => setRow(i, { doctorId: e.target.value || null, doctorName: doctorOptions.find((d) => d.id === e.target.value)?.name ?? "" })} className={`h-8 w-full rounded border bg-white px-2 text-sm text-black ${!doctorId && row.doctorName.trim() ? "border-red-500 bg-red-50" : "border-[var(--input-border)]"}`}>
                  <option value="" className="bg-white text-black">— выберите доктора —</option>
                  {doctorOptions.map((d) => <option key={d.id} value={d.id} className="bg-white text-black">{d.name}</option>)}
                </select>
                {!doctorId && row.doctorName.trim() ? (
                  <p className="text-xs text-gray-400">Из файла: {row.doctorName}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <select value={clinicId ?? ""} onChange={(e) => setRow(i, { clinicId: e.target.value || null, clinicName: clinicOptions.find((c) => c.id === e.target.value)?.name ?? "" })} className={`h-8 w-full rounded border bg-white px-2 text-sm text-black ${!clinicId && row.clinicName.trim() ? "border-red-500 bg-red-50" : "border-[var(--input-border)]"}`}>
                  <option value="" className="bg-white text-black">— выберите клинику —</option>
                  {clinicOptions.map((c) => <option key={c.id} value={c.id} className="bg-white text-black">{c.name}</option>)}
                </select>
                {!clinicId && row.clinicName.trim() ? (
                  <p className="text-xs text-gray-400">Из файла: {row.clinicName}</p>
                ) : null}
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                {matches.map((m, itemIndex) => (
                  <div
                    key={`${row.rowNumber}-${itemIndex}`}
                    className="grid gap-2 sm:grid-cols-[1fr_minmax(160px,1fr)_5rem] sm:items-end"
                  >
                    <input
                      value={m.token}
                      onChange={(e) => setInvoicedItem(i, itemIndex, e.target.value)}
                      placeholder={`Выставлено — позиция ${itemIndex + 1}`}
                      className={`h-8 rounded border px-2 text-sm ${
                        m.token.trim()
                          ? m.hit
                            ? "border-emerald-500 bg-emerald-50 text-black placeholder:text-gray-500"
                            : "border-red-500 bg-red-50 text-black placeholder:text-gray-500"
                          : "border-[var(--input-border)] text-black placeholder:text-gray-500"
                      }`}
                    />
                    <PrefixSearchCombobox
                      value={m.hit?.id ?? ""}
                      onChange={(v) => {
                        if (!v) return;
                        const hit = priceOptions.find((p) => p.id === v);
                        if (!hit) return;
                        setInvoicedItem(i, itemIndex, hit.label);
                      }}
                      options={priceComboboxOptions}
                      placeholder="выбрать из прайса"
                      emptyOptionLabel="выбрать из прайса"
                      className="h-8 w-full rounded border border-[var(--input-border)] bg-white px-2 text-sm text-black"
                    />
                    <label className="flex flex-col gap-0.5">
                      <span className="text-xs text-[var(--text-secondary)]">Кол-во</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={Math.max(
                          1,
                          Math.min(
                            1_000_000,
                            Number(qtyParts[itemIndex]) || 1,
                          ),
                        )}
                        onChange={(e) => setInvoicedQuantity(i, itemIndex, e.target.value)}
                        className="h-8 w-full rounded border border-[var(--input-border)] px-2 text-sm tabular-nums"
                      />
                    </label>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addInvoicedItem(i)}
                  className="h-8 rounded border border-[var(--input-border)] px-3 text-sm"
                >
                  + позиция
                </button>
              </div>
            </div>
          </section>
        );
      })}

      {importResult ? (
        <section className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-4 text-sm">
          Создано: {importResult.createdCount}, ошибок: {importResult.failedCount}.
        </section>
      ) : null}
    </div>
  );
}
