"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CRM_MESSENGER_OPEN_COUNT_CHANGED_EVENT } from "@/lib/crm-client-events";
import { readClientState, writeClientState } from "@/lib/client-state-client";

type SidebarMessengerRow = {
  id: string;
  createdAt: string;
  doctorName: string;
  preview: string;
};

const SIDEBAR_MESSENGERS_COLLAPSED_KEY = "sidebarMessengersCollapsedV1";

export function SidebarMessengers() {
  const [count, setCount] = useState<number | null>(null);
  const [items, setItems] = useState<SidebarMessengerRow[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const refetchSidebar = useCallback(() => {
    void (async () => {
      try {
        const res = await fetch("/api/messengers/sidebar-state", { cache: "no-store" });
        const j = (await res.json()) as {
          count?: number;
          items?: SidebarMessengerRow[];
        };
        if (typeof j.count === "number") setCount(j.count);
        setItems(Array.isArray(j.items) ? j.items : []);
      } catch {
        setCount(null);
        setItems([]);
      }
    })();
  }, []);

  useEffect(() => {
    refetchSidebar();
  }, [refetchSidebar]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = await readClientState<unknown>("user", SIDEBAR_MESSENGERS_COLLAPSED_KEY);
      if (!cancelled && typeof raw === "boolean") setCollapsed(raw);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onChanged = () => {
      refetchSidebar();
    };
    const onFocus = () => {
      refetchSidebar();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetchSidebar();
    };
    window.addEventListener(CRM_MESSENGER_OPEN_COUNT_CHANGED_EVENT, onChanged);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener(CRM_MESSENGER_OPEN_COUNT_CHANGED_EVENT, onChanged);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetchSidebar]);

  const n = count ?? 0;
  const countLabel = n > 99 ? "99+" : String(n);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      void writeClientState("user", SIDEBAR_MESSENGERS_COLLAPSED_KEY, next);
      return next;
    });
  };

  return (
    <div className="shrink-0 border-t border-[var(--sidebar-border)] px-5 py-3 shell-short:px-4 shell-short:py-2">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        aria-expanded={!collapsed}
        onClick={toggleCollapsed}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--sidebar-text)] opacity-60 shell-short:text-[9px]">
            Мессенджеры
            <span
              className={`inline-block text-[9px] transition-transform ${collapsed ? "" : "rotate-90"}`}
              aria-hidden
            >
              ›
            </span>
          </p>
          {!collapsed ? (
            <p className="mt-1.5 text-[11px] leading-snug text-[var(--sidebar-text)] opacity-75 shell-short:mt-1 shell-short:text-[10px]">
              Упоминания{" "}
              <span className="font-medium opacity-95">@clicklab_admin</span> в
              группах врачей — полный текст сообщения.
            </p>
          ) : null}
        </div>
        {collapsed || n > 0 ? (
          <span
            className="inline-flex min-h-5 min-w-[1.75rem] shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-blue)] px-1.5 text-xs font-semibold text-white tabular-nums"
            title={`Непрочитанных сообщений: ${n}`}
          >
            {countLabel}
          </span>
        ) : null}
      </button>

      {!collapsed && items.length > 0 ? (
        <ul className="mt-2.5 space-y-1.5 shell-short:mt-2 shell-short:space-y-1">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/messengers#m-${it.id}`}
                className="block rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]/40 px-2.5 py-2 transition-colors hover:border-[var(--sidebar-blue)]/50 hover:bg-[var(--surface-subtle)] shell-short:px-2 shell-short:py-1.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-semibold text-[var(--sidebar-text)]">
                    {it.doctorName}
                  </span>
                  <time
                    className="shrink-0 text-[10px] tabular-nums text-[var(--sidebar-text)] opacity-55"
                    dateTime={it.createdAt}
                  >
                    {new Date(it.createdAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--sidebar-text)] opacity-85 shell-short:text-[10px]">
                  {it.preview}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {!collapsed ? (
        <Link
          href="/messengers"
          className="mt-2.5 inline-block text-xs font-medium text-[var(--sidebar-blue)] hover:underline shell-short:mt-2"
        >
          Открыть очередь →
        </Link>
      ) : null}
    </div>
  );
}
