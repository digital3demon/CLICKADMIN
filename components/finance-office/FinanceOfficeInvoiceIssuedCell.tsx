"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DueDatetimeComboPicker } from "@/components/ui/DueDatetimeComboPicker";
import {
  isoToDatetimeLocal,
  localDateTimeToIso,
} from "@/lib/datetime-local";
import { snapDatetimeLocalToDueGrid } from "@/lib/order-due-datetime";

export function FinanceOfficeInvoiceIssuedCell({
  orderId,
  issuedAtIso,
}: {
  orderId: string;
  issuedAtIso: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(
    () => snapDatetimeLocalToDueGrid(isoToDatetimeLocal(issuedAtIso)) ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setValue(snapDatetimeLocalToDueGrid(isoToDatetimeLocal(issuedAtIso)) ?? "");
  }, [issuedAtIso]);

  const save = useCallback(
    async (nextLocal: string) => {
      const prev = snapDatetimeLocalToDueGrid(isoToDatetimeLocal(issuedAtIso)) ?? "";
      if (nextLocal === prev) return;
      const nextIso = nextLocal ? localDateTimeToIso(nextLocal) : null;
      if (nextLocal && nextIso == null) {
        setErr("Некорректная дата");
        setValue(prev);
        return;
      }
      setSaving(true);
      setErr(null);
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceIssuedAt: nextIso }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(j.error ?? "Ошибка сохранения");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка");
        setValue(prev);
      } finally {
        setSaving(false);
      }
    },
    [issuedAtIso, orderId, router],
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-full leading-none">
      <DueDatetimeComboPicker
        variant="compact"
        value={value}
        disabled={saving}
        timeGrid="halfHour"
        clearable
        aria-label="Счёт выставлен: дата отправки"
        title="Дата выставления счёта. Ставится при загрузке файла или вручную"
        className="w-full max-w-full"
        tone="appointment"
        onChange={(raw) => {
          const snapped = raw === "" ? "" : snapDatetimeLocalToDueGrid(raw);
          setValue(snapped);
          void save(snapped);
        }}
      />
      {err ? (
        <p className="mt-0.5 text-[10px] leading-tight text-red-600">{err}</p>
      ) : null}
    </div>
  );
}
