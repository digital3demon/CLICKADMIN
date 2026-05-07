"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SidebarMessengers() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/messengers/open-count", { cache: "no-store" });
        const j = (await res.json()) as { count?: number };
        if (!cancelled && typeof j.count === "number") setCount(j.count);
      } catch {
        if (!cancelled) setCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const n = count ?? 0;

  return (
    <div className="shrink-0 border-t border-[var(--sidebar-border)] px-5 py-3 shell-short:px-4 shell-short:py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--sidebar-text)] opacity-60 shell-short:text-[9px]">
            Мессенджеры
          </p>
          <p className="mt-2 text-xs leading-snug text-[var(--sidebar-text)] opacity-80 shell-short:mt-1.5 shell-short:text-[11px]">
            Сообщения с{" "}
            <span className="font-medium opacity-95">@clicklab_admin</span> из
            групп врачей.
          </p>
        </div>
        {n > 0 ? (
          <span className="inline-flex min-h-5 min-w-[1.75rem] shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-blue)] px-1.5 text-xs font-semibold text-white tabular-nums">
            {n > 99 ? "99+" : n}
          </span>
        ) : null}
      </div>
      <Link
        href="/messengers"
        className="mt-3 inline-block text-xs font-medium text-[var(--sidebar-blue)] hover:underline shell-short:mt-2"
      >
        Открыть очередь →
      </Link>
    </div>
  );
}
