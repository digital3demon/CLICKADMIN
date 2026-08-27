"use client";

import { useState } from "react";

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
  downloadHref: (row: ReconRowVm, lockPeriod: boolean) => string;
  onChanged: () => void;
}) {
  const [lockByKey, setLockByKey] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  const upload = async (row: ReconRowVm, kind: "invoice" | "upd", file: File) => {
    setBusy(rowKey(row));
    setErr(null);
    try {
      const id = await ensureId(row);
      if (!id) return;
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch(
        `/api/legal-entity-reconciliations/${encodeURIComponent(id)}/file`,
        { method: "POST", credentials: "include", body: fd },
      );
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось загрузить файл");
        return;
      }
      onChanged();
    } finally {
      setBusy(null);
    }
  };

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
      {items.map((row) => {
        const k = rowKey(row);
        const lock = lockByKey[k] ?? false;
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
                <a
                  href={downloadHref(row, !archive && lock)}
                  className="inline-flex h-8 items-center justify-center rounded-md bg-[var(--sidebar-blue)] px-2.5 text-xs font-semibold text-white"
                >
                  Скачать сверку
                </a>
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
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-2 text-xs">
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
              {canEdit ? (
                <>
                  <label className="cursor-pointer rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-0.5 font-semibold">
                    {row.hasInvoice ? "Заменить счёт" : "Загрузить счёт"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.currentTarget.value = "";
                        if (f) void upload(row, "invoice", f);
                      }}
                    />
                  </label>
                  <label className="cursor-pointer rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-0.5 font-semibold">
                    {row.hasUpd ? "Заменить УПД" : "Загрузить УПД"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.currentTarget.value = "";
                        if (f) void upload(row, "upd", f);
                      }}
                    />
                  </label>
                </>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
