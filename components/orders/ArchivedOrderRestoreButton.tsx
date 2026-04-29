"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export function ArchivedOrderRestoreButton({
  orderId,
  className,
}: {
  orderId: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const restore = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/restore`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось восстановить");
        return;
      }
      router.push(`/orders/${orderId}`);
      router.refresh();
    } catch {
      setErr("Сеть или сервер недоступны");
    } finally {
      setBusy(false);
    }
  }, [orderId, router]);

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void restore()}
        className={
          className ??
          "rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--app-text)] hover:bg-[var(--hover-bg)] disabled:opacity-50 sm:text-sm"
        }
      >
        {busy ? "Восстановление…" : "Восстановить"}
      </button>
      {err ? (
        <p className="text-xs text-red-600 dark:text-red-400">{err}</p>
      ) : null}
    </div>
  );
}
