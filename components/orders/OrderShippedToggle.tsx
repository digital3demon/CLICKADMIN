"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatShippedCompact(iso: string | null | undefined): {
  date: string;
  time: string;
} | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Moscow",
  });
  const time = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Moscow",
  });
  return { date, time };
}

export function OrderShippedToggle({
  orderId,
  shipped,
  shippedAtIso = null,
  readOnly = false,
}: {
  orderId: string;
  shipped: boolean;
  /** ISO `adminShippedAt` с сервера. */
  shippedAtIso?: string | null;
  /** Только дата отгрузки, без постановки/снятия отметки. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(shipped);
  const [localAt, setLocalAt] = useState<string | null>(shippedAtIso);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue(shipped);
    setLocalAt(shippedAtIso);
  }, [shipped, shippedAtIso]);

  const toggle = async () => {
    if (busy) return;
    const next = !value;
    setValue(next);
    if (next) {
      setLocalAt(new Date().toISOString());
    } else {
      setLocalAt(null);
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminShippedOtpr: next }),
      });
      if (!res.ok) {
        setValue(!next);
        setLocalAt(shippedAtIso);
        return;
      }
      router.refresh();
    } catch {
      setValue(!next);
      setLocalAt(shippedAtIso);
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    const compact = formatShippedCompact(localAt);
    const badgeClass =
      "mx-auto inline-flex min-w-[3.25rem] max-w-[4.5rem] flex-col items-center justify-center gap-0 rounded-md border border-emerald-500/70 bg-emerald-600/20 px-1 py-0.5 text-center leading-none shadow-sm dark:border-emerald-500/55 dark:bg-emerald-500/15";
    const badgeInner = (
      <>
        <span className="text-[10px] font-semibold tabular-nums text-emerald-950 dark:text-emerald-100 sm:text-[11px]">
          {compact?.date ?? "—"}
        </span>
        <span className="text-[9px] font-medium tabular-nums text-emerald-900/80 dark:text-emerald-200/85 sm:text-[10px]">
          {compact?.time ?? ""}
        </span>
      </>
    );
    if (readOnly) {
      return (
        <span
          className={badgeClass}
          title={
            compact
              ? `Отправлено ${compact.date} ${compact.time} (МСК)`
              : "Работа отправлена"
          }
        >
          {badgeInner}
        </span>
      );
    }
    return (
      <button
        type="button"
        disabled={busy}
        aria-pressed
        aria-label="Снять отметку отправки"
        title={
          compact
            ? `Отправлено ${compact.date} ${compact.time} (МСК). Нажмите, чтобы снять`
            : "Работа отправлена. Нажмите, чтобы снять"
        }
        onClick={() => void toggle()}
        className={`${badgeClass} hover:bg-emerald-600/30 disabled:opacity-55 dark:hover:bg-emerald-500/25`}
      >
        {badgeInner}
      </button>
    );
  }

  if (readOnly) {
    return (
      <span className="text-[11px] text-[var(--text-muted)]" title="Не отправлено">
        —
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      aria-pressed={false}
      aria-label="Отметить работу отправленной"
      title="Отметить работу отправленной"
      onClick={() => void toggle()}
      className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-[var(--input-border)] bg-[var(--card-bg)] text-transparent transition-colors hover:border-emerald-500 hover:bg-emerald-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sidebar-blue)] disabled:opacity-55 sm:h-5 sm:w-5"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-3 w-3 sm:h-3.5 sm:w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4.5 10.5 8 14l7.5-8" />
      </svg>
    </button>
  );
}
