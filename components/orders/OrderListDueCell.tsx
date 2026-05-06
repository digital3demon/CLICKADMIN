"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isoToDatetimeLocal,
  localDateTimeToIso,
} from "@/lib/datetime-local";
import {
  clampDueLocalToMin,
  clampLabDueLocalToMin,
  earliestDueGridLocalFromCreatedAt,
  earliestLabDueGridLocalFromCreatedAt,
  snapDatetimeLocalToDueGrid,
  snapDatetimeLocalToLabDueGrid,
} from "@/lib/order-due-datetime";
import { DueDatetimeComboPicker } from "@/components/ui/DueDatetimeComboPicker";

type OrderListDueCellVariant = "lab" | "appointment";

export function OrderListDueCell({
  orderId,
  dueIso,
  createdAtIso,
  variant = "lab",
  labHmSlots,
}: {
  orderId: string;
  dueIso: string | null;
  createdAtIso: string;
  /** `lab` — срок лабораторный (`dueDate`); `appointment` — запись / приём (`dueToAdminsAt` + `appointmentDate`). */
  variant?: OrderListDueCellVariant;
  /** Слоты «Срок лабораторный» из конфигурации тенанта; для `appointment` не используются. */
  labHmSlots?: readonly string[] | null;
}) {
  const router = useRouter();
  const minLocalHalf = earliestDueGridLocalFromCreatedAt(createdAtIso);
  const minLocalLab = earliestLabDueGridLocalFromCreatedAt(
    createdAtIso,
    labHmSlots,
  );
  const minLocal = variant === "lab" ? minLocalLab : minLocalHalf;

  const [value, setValue] = useState(() => {
    const raw =
      variant === "lab"
        ? snapDatetimeLocalToLabDueGrid(
            isoToDatetimeLocal(dueIso),
            labHmSlots,
          )
        : snapDatetimeLocalToDueGrid(isoToDatetimeLocal(dueIso));
    if (!raw) return "";
    return variant === "lab"
      ? clampLabDueLocalToMin(raw, minLocalLab, labHmSlots)
      : clampDueLocalToMin(raw, minLocalHalf);
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw =
      variant === "lab"
        ? snapDatetimeLocalToLabDueGrid(
            isoToDatetimeLocal(dueIso),
            labHmSlots,
          )
        : snapDatetimeLocalToDueGrid(isoToDatetimeLocal(dueIso));
    setValue(
      raw
        ? variant === "lab"
          ? clampLabDueLocalToMin(raw, minLocalLab, labHmSlots)
          : clampDueLocalToMin(raw, minLocalHalf)
        : "",
    );
  }, [dueIso, variant, minLocalHalf, minLocalLab, labHmSlots]);

  const saveValue = useCallback(
    async (snapped: string) => {
      const prev =
        variant === "lab"
          ? snapDatetimeLocalToLabDueGrid(
              isoToDatetimeLocal(dueIso),
              labHmSlots,
            )
          : snapDatetimeLocalToDueGrid(isoToDatetimeLocal(dueIso));
      if (snapped === prev) return;

      const nextIso = snapped ? localDateTimeToIso(snapped) : null;
      if (snapped && nextIso == null) {
        setErr("Некорректная дата");
        setValue(prev);
        return;
      }

      setSaving(true);
      setErr(null);
      try {
        const patchBody =
          variant === "appointment"
            ? { dueToAdminsAt: nextIso }
            : { dueDate: nextIso };
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody),
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
    [orderId, dueIso, router, variant, labHmSlots],
  );

  const ariaLab =
    variant === "appointment"
      ? "Запись: дата и время приёма пациента"
      : "Срок лабораторный";
  const titleHint =
    variant === "appointment"
      ? "Запись: дата и время приёма (8:00–23:30, шаг 30 мин)"
      : labHmSlots?.length
        ? `Срок лабораторный: ${labHmSlots.join(", ")} или «В теч. дня»`
        : "Срок лабораторный: настроенные слоты времени или «В теч. дня»";

  return (
    <div className="min-w-0 leading-none">
      <DueDatetimeComboPicker
        variant="compact"
        value={value}
        disabled={saving}
        minLocal={minLocal}
        timeGrid={variant === "lab" ? "labDue" : "halfHour"}
        labHmSlots={variant === "lab" ? labHmSlots ?? undefined : undefined}
        aria-label={ariaLab}
        title={titleHint}
        className="w-max max-w-full"
        onChange={(raw) => {
          const snapped =
            raw === ""
              ? ""
              : variant === "lab"
                ? snapDatetimeLocalToLabDueGrid(raw, labHmSlots)
                : snapDatetimeLocalToDueGrid(raw);
          setValue(snapped);
          setErr(null);
          void saveValue(snapped);
        }}
      />
      {err ? (
        <div className="mt-0.5 max-w-full truncate text-xs leading-tight text-red-600">
          {err}
        </div>
      ) : null}
    </div>
  );
}
