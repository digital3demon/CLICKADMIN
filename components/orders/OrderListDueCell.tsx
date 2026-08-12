"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  appointmentCompactTimeLabel,
  appointmentHasTimeFlag,
  appointmentHmForMode,
  appointmentTimeModeFromLocal,
  replaceAppointmentLocalHm,
  type AppointmentTimeMode,
} from "@/lib/appointment-time-mode";
import {
  isoToDatetimeLocal,
  localDateTimeToIso,
} from "@/lib/datetime-local";
import {
  clampDueLocalToMin,
  clampLabDueLocalToMin,
  earliestDueGridLocalFromCreatedAt,
  earliestLabDueGridLocalFromCreatedAt,
  parseHmFromDueGridLocal,
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
  /** Только для `appointment`: `dueToAdminsHasTime` с сервера. */
  appointmentHasTime = true,
}: {
  orderId: string;
  dueIso: string | null;
  createdAtIso: string;
  /** `lab` — срок лабораторный (`dueDate`); `appointment` — запись / приём (`dueToAdminsAt` + `appointmentDate`). */
  variant?: OrderListDueCellVariant;
  /** Слоты «Срок лабораторный» из конфигурации тенанта; для `appointment` не используются. */
  labHmSlots?: readonly string[] | null;
  appointmentHasTime?: boolean;
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
  const [apptMode, setApptMode] = useState<AppointmentTimeMode>(() =>
    variant === "appointment"
      ? appointmentTimeModeFromLocal(
          appointmentHasTime,
          snapDatetimeLocalToDueGrid(isoToDatetimeLocal(dueIso)),
        )
      : "timed",
  );
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
    if (variant === "appointment") {
      setApptMode(appointmentTimeModeFromLocal(appointmentHasTime, raw));
    }
  }, [
    dueIso,
    variant,
    minLocalHalf,
    minLocalLab,
    labHmSlots,
    appointmentHasTime,
  ]);

  const saveAppointment = useCallback(
    async (snapped: string, mode: AppointmentTimeMode) => {
      const prevLocal = snapDatetimeLocalToDueGrid(isoToDatetimeLocal(dueIso));
      const prevMode = appointmentTimeModeFromLocal(
        appointmentHasTime,
        prevLocal,
      );
      if (snapped === prevLocal && mode === prevMode) return;

      let toSave = snapped;
      const forceHm = appointmentHmForMode(mode);
      if (toSave && forceHm) {
        toSave = replaceAppointmentLocalHm(toSave, forceHm);
      }

      const nextIso = toSave ? localDateTimeToIso(toSave) : null;
      if (toSave && nextIso == null) {
        setErr("Некорректная дата");
        setValue(prevLocal ?? "");
        setApptMode(prevMode);
        return;
      }

      setSaving(true);
      setErr(null);
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dueToAdminsAt: nextIso,
            dueToAdminsHasTime: appointmentHasTimeFlag(mode),
          }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(j.error ?? "Ошибка сохранения");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка");
        setValue(prevLocal ?? "");
        setApptMode(prevMode);
      } finally {
        setSaving(false);
      }
    },
    [orderId, dueIso, appointmentHasTime, router],
  );

  const saveLab = useCallback(
    async (snapped: string) => {
      const prev = snapDatetimeLocalToLabDueGrid(
        isoToDatetimeLocal(dueIso),
        labHmSlots,
      );
      if (snapped === prev) return;

      const nextIso = snapped ? localDateTimeToIso(snapped) : null;
      if (snapped && nextIso == null) {
        setErr("Некорректная дата");
        setValue(prev ?? "");
        return;
      }

      setSaving(true);
      setErr(null);
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dueDate: nextIso,
            /** Список предлагает только слоты времени — в шапке Kaiten нужен HH:mm. */
            kaitenAdminDueHasTime: nextIso != null,
          }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(j.error ?? "Ошибка сохранения");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка");
        setValue(prev ?? "");
      } finally {
        setSaving(false);
      }
    },
    [orderId, dueIso, router, labHmSlots],
  );

  const setModeAndSave = useCallback(
    (mode: AppointmentTimeMode) => {
      setApptMode(mode);
      const forceHm = appointmentHmForMode(mode);
      let next = value;
      if (next && forceHm) {
        next = replaceAppointmentLocalHm(next, forceHm);
        setValue(next);
      }
      void saveAppointment(next, mode);
    },
    [value, saveAppointment],
  );

  const ariaLab =
    variant === "appointment"
      ? "Запись: дата и время приёма пациента"
      : "Срок лабораторный";
  const titleHint =
    variant === "appointment"
      ? "Запись: дата и время приёма (8:00–23:30, шаг 30 мин); «В теч. дня» → ВТЧД; «времени приёма нет» → без времени, фильтр как 08:00"
      : labHmSlots?.length
        ? `Срок лабораторный: ${labHmSlots.join(", ")} или «В теч. дня»`
        : "Срок лабораторный: настроенные слоты времени или «В теч. дня»";

  const compactTimeLabel = useMemo(() => {
    if (variant !== "appointment") return undefined;
    const clock = parseHmFromDueGridLocal(value) ?? "";
    return appointmentCompactTimeLabel(apptMode, clock);
  }, [variant, apptMode, value]);

  const appointmentFooter =
    variant === "appointment" ? (
      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-center gap-2 text-[0.7rem] leading-tight text-[var(--text-secondary)]">
          <input
            type="checkbox"
            className="rounded border-[var(--card-border)]"
            checked={apptMode === "wholeDay"}
            disabled={saving}
            onChange={(e) => {
              if (e.target.checked) setModeAndSave("wholeDay");
              else setModeAndSave("timed");
            }}
          />
          В теч. дня
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[0.7rem] leading-tight text-[var(--text-secondary)]">
          <input
            type="checkbox"
            className="rounded border-[var(--card-border)]"
            checked={apptMode === "noReception"}
            disabled={saving}
            onChange={(e) => {
              if (e.target.checked) setModeAndSave("noReception");
              else setModeAndSave("timed");
            }}
          />
          Времени приёма нет
        </label>
      </div>
    ) : null;

  return (
    <div className="mx-auto w-full max-w-[5.5rem] leading-none">
      <DueDatetimeComboPicker
        variant="compact"
        value={value}
        disabled={saving}
        minLocal={minLocal}
        timeGrid={variant === "lab" ? "labDue" : "halfHour"}
        labHmSlots={variant === "lab" ? labHmSlots ?? undefined : undefined}
        aria-label={ariaLab}
        title={titleHint}
        className="w-full max-w-full"
        compactTimeLabel={compactTimeLabel}
        calendarFooter={appointmentFooter}
        onChange={(raw) => {
          setErr(null);
          if (variant === "lab") {
            const snapped =
              raw === ""
                ? ""
                : snapDatetimeLocalToLabDueGrid(raw, labHmSlots);
            setValue(snapped);
            void saveLab(snapped);
            return;
          }

          const snapped =
            raw === "" ? "" : snapDatetimeLocalToDueGrid(raw);
          if (!snapped.trim()) {
            setValue("");
            setApptMode("wholeDay");
            void saveAppointment("", "wholeDay");
            return;
          }

          const newHm = parseHmFromDueGridLocal(snapped);
          const forced = appointmentHmForMode(apptMode);
          let mode: AppointmentTimeMode = apptMode;
          let next = snapped;

          if (apptMode !== "timed" && forced && newHm && newHm !== forced) {
            // Выбрали другое время в списке — точные часы.
            mode = "timed";
          } else if (forced) {
            next = replaceAppointmentLocalHm(snapped, forced);
          } else {
            mode = "timed";
          }

          setValue(next);
          setApptMode(mode);
          void saveAppointment(next, mode);
        }}
      />
      {err ? (
        <div className="mt-0.5 max-w-full truncate text-center text-[10px] leading-tight text-red-600">
          {err}
        </div>
      ) : null}
    </div>
  );
}
