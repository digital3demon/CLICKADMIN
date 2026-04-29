"use client";

import { useRouter } from "next/navigation";
import { startTransition, useCallback, useState } from "react";

type Props = {
  clinicId: string;
  doctorId: string;
  /** Для текста подтверждения: кого отвязываем от текущей карточки */
  counterpartyLabel: string;
  /** После успешного DELETE (до refresh) — обновить локальный список. */
  onAfterUnlink?: () => void;
};

export function DoctorClinicUnlinkButton({
  clinicId,
  doctorId,
  counterpartyLabel,
  onAfterUnlink,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    const ok = window.confirm(
      `Убрать связь с «${counterpartyLabel}»?\n\nСтарые наряды не изменятся. Связь снова появится в списках, если сохранить наряд с этой парой клиника — врач.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/clinics/${encodeURIComponent(clinicId)}/doctor-links/${encodeURIComponent(doctorId)}`,
        { method: "DELETE" },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "Не удалось убрать связь");
        return;
      }
      onAfterUnlink?.();
      if (!onAfterUnlink) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setBusy(false);
    }
  }, [clinicId, doctorId, counterpartyLabel, router, onAfterUnlink]);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void onClick()}
      className="shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
    >
      {busy ? "…" : "Убрать связь"}
    </button>
  );
}
