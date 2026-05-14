"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderShippedToggle({
  orderId,
  shipped,
}: {
  orderId: string;
  shipped: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(shipped);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    const next = !value;
    setValue(next);
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
        return;
      }
      router.refresh();
    } catch {
      setValue(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      aria-pressed={value}
      aria-label={value ? "Снять отметку отправки" : "Отметить работу отправленной"}
      title={value ? "Работа отправлена" : "Отметить работу отправленной"}
      onClick={() => void toggle()}
      className={[
        "inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sidebar-blue)] disabled:opacity-55 sm:h-6 sm:w-6",
        value
          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
          : "border-[var(--input-border)] bg-[var(--card-bg)] text-transparent hover:border-emerald-500 hover:bg-emerald-500/10",
      ].join(" ")}
    >
      <svg
        viewBox="0 0 20 20"
        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
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
