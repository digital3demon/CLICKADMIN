"use client";

import { useState } from "react";
import {
  resolveReconDownloadPeriod,
  type ReconDownloadPeriodDraft,
} from "@/lib/recon-download-period";
import { isZeroReconRow } from "@/lib/recon-zero-row";

export type ReconRowVm = {
  id: string | null;
  groupKey: string;
  clinicIds: string[];
  clinicNames: string[];
  inn: string | null;
  legalEntityLabel: string;
  frequencyLabel: string;
  slot: string;
  periodFromStr: string;
  periodToStr: string;
  periodLabelRu: string;
  orderCount: number;
  sumRub: number;
  highlight: boolean;
  periodLocked: boolean;
  paymentStatus: "UNPAID" | "PAID";
  downloadedAt: string | null;
  hasInvoice: boolean;
  hasUpd: boolean;
  invoiceFileName: string | null;
  updFileName: string | null;
};

function moneyRu(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(n);
}

export function ReconciliationPeriodRows({
  items,
  archive,
  canEdit,
  downloadHref,
  onChanged,
}: {
  items: ReconRowVm[];
  archive: boolean;
  canEdit: boolean;
  downloadHref: (
    row: ReconRowVm,
    lockPeriod: boolean,
    period: { from: string; to: string; slot: ReconRowVm["slot"] },
  ) => string;
  onChanged: () => void;
}) {
  const [lockByKey, setLockByKey] = useState<Record<string, boolean>>({});
  const [draftByKey, setDraftByKey] = useState<Record<string, ReconDownloadPeriodDraft>>(
    {},
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [zerosOpen, setZerosOpen] = useState(false);

  const rowKey = (r: ReconRowVm) =>
    r.id ?? `${r.groupKey}|${r.slot}|${r.periodFromStr}|${r.periodToStr}`;

  const ensureId = async (row: ReconRowVm): Promise<string | null> => {
    if (row.id) return row.id;
    const res = await fetch("/api/legal-entity-reconciliations/ensure", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupKey: row.groupKey,
        slot: row.slot,
        from: row.periodFromStr,
        to: row.periodToStr,
        title: row.legalEntityLabel,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!res.ok || !j.id) {
      setErr(j.error ?? "Не удалось создать запись сверки");
      return null;
    }
    return j.id;
  };

  const markPaid = async (row: ReconRowVm) => {
    const ok = window.confirm(
      `Отметить сверку ${row.legalEntityLabel} за ${row.periodLabelRu} как оплаченную?`,
    );
    if (!ok) return;
    setBusy(rowKey(row));
    setErr(null);
    try {
      const id = await ensureId(row);
      if (!id) return;
      const res = await fetch(`/api/legal-entity-reconciliations/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "PAID", confirm: true }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось отметить оплату");
        return;
      }
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const uploadFiles = async (row: ReconRowVm, files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.size > 0);
    if (list.length === 0) return;
    setBusy(rowKey(row));
    setErr(null);
    setHint(null);
    try {
      const id = await ensureId(row);
      if (!id) return;
      const fd = new FormData();
      for (const file of list) fd.append("file", file);
      const res = await fetch(
        `/api/legal-entity-reconciliations/${encodeURIComponent(id)}/file`,
        { method: "POST", credentials: "include", body: fd },
      );
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        uploaded?: Array<{ fileName: string; kind: "invoice" | "upd" }>;
      };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось загрузить файл");
        return;
      }
      const labels = (j.uploaded ?? []).map((item) =>
        item.kind === "upd" ? `УПД «${item.fileName}»` : `счёт «${item.fileName}»`,
      );
      setHint(
        labels.length > 0
          ? `Определили: ${labels.join(", ")}`
          : "Файлы загружены",
      );
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const zeros = items.filter(isZeroReconRow);
  const live = items.filter((r) => !isZeroReconRow(r));

  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        {archive ? "Оплаченных сверок нет." : "Нет текущих или неоплаченных сверок."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {err ? (
        <p className="text-sm text-red-600" role="alert">
          {err}
        </p>
      ) : null}
      {hint ? (
        <p className="text-sm text-[var(--text-secondary)]">{hint}</p>
      ) : null}
      {zeros.length > 0 ? (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-[var(--text-body)]"
            aria-expanded={zerosOpen}
            onClick={() => setZerosOpen((v) => !v)}
          >
            <span>Нулевые сверки за период</span>
            <span className="tabular-nums text-[var(--text-muted)]">{zeros.length}</span>
          </button>
          {zerosOpen ? (
            <ul className="space-y-2 border-t border-[var(--card-border)] px-3 py-2 text-sm">
              {zeros.map((row) => (
                <li
                  key={rowKey(row)}
                  className="text-[var(--text-body)]"
                >
                  <p className="font-medium">
                    {row.legalEntityLabel}
                    {row.inn ? (
                      <span className="ms-1 font-normal text-[var(--text-secondary)]">
                        ИНН {row.inn}
                      </span>
                    ) : null}
                  </p>
                  <ul className="mt-0.5 list-none text-[var(--text-secondary)]">
                    {row.clinicNames.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {row.periodLabelRu}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {live.map((row) => {
        const k = rowKey(row);
        const lock = lockByKey[k] ?? false;
        const draft = draftByKey[k] ?? { from: "", to: "" };
        const resolved = resolveReconDownloadPeriod(row, draft);
        return (
          <article
            key={k}
            className={[
              "rounded-lg border px-3 py-2.5",
              row.highlight && !archive
                ? "border-amber-400 bg-amber-50/90 dark:border-amber-600 dark:bg-amber-950/35"
                : "border-[var(--card-border)] bg-[var(--surface-muted)]",
            ].join(" ")}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--app-text)]">
                  {row.legalEntityLabel}
                  {row.inn ? (
                    <span className="ms-2 text-xs font-normal text-[var(--text-secondary)]">
                      ИНН {row.inn}
                    </span>
                  ) : null}
                </p>
                <ul className="mt-1 list-none space-y-0.5 text-sm text-[var(--text-body)]">
                  {row.clinicNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {row.periodLabelRu} · {row.frequencyLabel}
                  {row.periodLocked ? " · период сохранён" : ""}
                  {row.downloadedAt ? " · скачивали" : ""}
                </p>
                <p className="mt-0.5 text-sm text-[var(--app-text)]">
                  Нарядов: {row.orderCount} · {moneyRu(row.sumRub)}
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <label className="flex items-center gap-1 text-[11px] text-[var(--text-body)]">
                    с
                    <input
                      type="date"
                      className="h-8 w-[8.5rem] rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-1.5 text-xs"
                      value={draft.from}
                      onChange={(e) =>
                        setDraftByKey((prev) => ({
                          ...prev,
                          [k]: { ...draft, from: e.target.value },
                        }))
                      }
                      aria-label="Период сверки с"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-[var(--text-body)]">
                    по
                    <input
                      type="date"
                      className="h-8 w-[8.5rem] rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-1.5 text-xs"
                      value={draft.to}
                      onChange={(e) =>
                        setDraftByKey((prev) => ({
                          ...prev,
                          [k]: { ...draft, to: e.target.value },
                        }))
                      }
                      aria-label="Период сверки по"
                    />
                  </label>
                  {resolved.ok ? (
                    <a
                      href={downloadHref(row, !archive && lock, {
                        from: resolved.from,
                        to: resolved.to,
                        slot: resolved.slot,
                      })}
                      className="inline-flex h-8 items-center justify-center rounded-md bg-[var(--sidebar-blue)] px-2.5 text-xs font-semibold text-white"
                    >
                      Скачать сверку
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex h-8 items-center justify-center rounded-md bg-[var(--sidebar-blue)] px-2.5 text-xs font-semibold text-white"
                      onClick={() => setErr(resolved.error)}
                    >
                      Скачать сверку
                    </button>
                  )}
                </div>
                {!archive && canEdit ? (
                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-body)]">
                    <input
                      type="checkbox"
                      checked={lock}
                      onChange={(e) =>
                        setLockByKey((prev) => ({ ...prev, [k]: e.target.checked }))
                      }
                    />
                    Сохранить этот период для этой сверки
                  </label>
                ) : null}
                {!archive && canEdit ? (
                  <button
                    type="button"
                    disabled={busy === k}
                    onClick={() => void markPaid(row)}
                    className="h-8 rounded-md border border-[var(--card-border)] px-2.5 text-xs font-semibold disabled:opacity-50"
                  >
                    Оплачена
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-2 border-t border-[var(--border-subtle)] pt-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[var(--text-secondary)]">
                  Счёт и УПД
                </span>
                {row.id && row.hasInvoice ? (
                  <a
                    href={`/api/legal-entity-reconciliations/${encodeURIComponent(row.id)}/file?kind=invoice`}
                    className="text-[var(--sidebar-blue)] underline"
                  >
                    Скачать счёт
                  </a>
                ) : (
                  <span className="text-[var(--text-muted)]">Счёт не загружен</span>
                )}
                {row.id && row.hasUpd ? (
                  <a
                    href={`/api/legal-entity-reconciliations/${encodeURIComponent(row.id)}/file?kind=upd`}
                    className="text-[var(--sidebar-blue)] underline"
                  >
                    Скачать УПД
                  </a>
                ) : (
                  <span className="text-[var(--text-muted)]">УПД не загружен</span>
                )}
              </div>
              {canEdit ? (
                <label
                  className={[
                    "mt-2 flex min-h-[2.5rem] cursor-pointer items-center justify-center rounded-md border border-dashed px-3 py-2 text-center font-semibold",
                    dragKey === k
                      ? "border-[var(--sidebar-blue)] bg-[var(--sidebar-blue)]/10 text-[var(--app-text)]"
                      : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)]",
                    busy === k ? "opacity-60" : "",
                  ].join(" ")}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragKey(k);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragKey(k);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setDragKey((cur) => (cur === k ? null : cur));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragKey((cur) => (cur === k ? null : cur));
                    if (busy === k) return;
                    void uploadFiles(row, e.dataTransfer.files);
                  }}
                >
                  {busy === k
                    ? "Загрузка…"
                    : "Перетащите файлы или нажмите — счёт и УПД определим сами"}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    disabled={busy === k}
                    onChange={(e) => {
                      const picked = e.target.files;
                      e.currentTarget.value = "";
                      if (picked) void uploadFiles(row, picked);
                    }}
                  />
                </label>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
