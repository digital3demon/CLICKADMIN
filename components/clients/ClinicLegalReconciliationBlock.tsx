"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReconciliationPeriodRows,
  type ReconRowVm,
} from "@/components/finance-office/ReconciliationPeriodRows";

export function ClinicLegalReconciliationBlock({
  clinicId,
  canEdit,
}: {
  clinicId: string;
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<"open" | "archive">("open");
  const [items, setItems] = useState<ReconRowVm[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/clinics/${encodeURIComponent(clinicId)}/legal-reconciliations?tab=${tab}`,
        { credentials: "include", cache: "no-store" },
      );
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        items?: ReconRowVm[];
      };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось загрузить сверки");
        return;
      }
      setItems(Array.isArray(j.items) ? j.items : []);
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, [clinicId, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mt-6 border-t border-[var(--card-border)] pt-5">
      <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        Сверки клиники
      </h3>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Только эта клиника, без соседних точек с тем же ИНН. Общая сверка по
        юрлицу — в ФинОтделе.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={[
            "border-b-2 px-2 pb-1 text-sm font-semibold",
            tab === "open"
              ? "border-[var(--sidebar-blue)] text-[var(--app-text)]"
              : "border-transparent text-[var(--text-secondary)]",
          ].join(" ")}
          onClick={() => setTab("open")}
        >
          Текущие
        </button>
        <button
          type="button"
          className={[
            "border-b-2 px-2 pb-1 text-sm font-semibold",
            tab === "archive"
              ? "border-[var(--sidebar-blue)] text-[var(--app-text)]"
              : "border-transparent text-[var(--text-secondary)]",
          ].join(" ")}
          onClick={() => setTab("archive")}
        >
          Архивные
        </button>
      </div>
      <div className="mt-3">
        {err ? (
          <p className="mb-2 text-sm text-red-600" role="alert">
            {err}
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>
        ) : (
          <ReconciliationPeriodRows
            items={items}
            archive={tab === "archive"}
            canEdit={canEdit}
            downloadHref={(row, lockPeriod) => {
              const q = new URLSearchParams({
                from: row.periodFromStr,
                to: row.periodToStr,
                slot: row.slot,
                title: row.legalEntityLabel,
              });
              if (lockPeriod) q.set("lockPeriod", "1");
              return `/api/clinics/${encodeURIComponent(clinicId)}/legal-reconciliations/download?${q.toString()}`;
            }}
            onChanged={() => void load()}
          />
        )}
      </div>
    </div>
  );
}
