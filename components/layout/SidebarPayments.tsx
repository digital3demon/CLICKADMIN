"use client";

import type { UserRole } from "@prisma/client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { canDismissSidebarRecentPaidItems } from "@/lib/auth/permissions";
import { ordersListHref } from "@/lib/orders-list-query";

const COLLAPSE_STORAGE_KEY = "sidebarPaymentsSectionCollapsed";

type Row = {
  orderId: string;
  orderNumber: string;
  changedAt: string;
  doctorLabel: string;
  patientLabel: string;
};

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 text-[var(--sidebar-text)] opacity-60 transition-transform ${
        collapsed ? "-rotate-90" : ""
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function SidebarPayments({ sessionRole }: { sessionRole: UserRole | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [items, setItems] = useState<Row[] | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const canDismiss =
    sessionRole != null && canDismissSidebarRecentPaidItems(sessionRole);

  useEffect(() => {
    try {
      setCollapsed(typeof window !== "undefined" && localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      setCollapsed(false);
    }
  }, []);

  const setCollapsedPersist = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(() => {
    void (async () => {
      try {
        const res = await fetch("/api/orders/sidebar-recent-paid", { cache: "no-store" });
        if (!res.ok) {
          setItems([]);
          return;
        }
        const j = (await res.json()) as { items?: Row[] };
        setItems(Array.isArray(j.items) ? j.items : []);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  const markDismissed = useCallback(
    async (it: Row) => {
      if (!canDismiss) return;
      try {
        const res = await fetch("/api/orders/sidebar-recent-paid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: it.orderId, changedAt: it.changedAt }),
        });
        if (!res.ok) return;
        setItems((prev) =>
          prev == null ? prev : prev.filter((r) => !(r.orderId === it.orderId && r.changedAt === it.changedAt)),
        );
      } catch {
        /* ignore */
      }
    },
    [canDismiss],
  );

  if (items === null) {
    return (
      <div className="shrink-0 border-t border-[var(--sidebar-border)] px-5 py-3 shell-short:px-4 shell-short:py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--sidebar-text)] opacity-60 shell-short:text-[9px]">
            Оплаты
          </p>
        </div>
        <p className="mt-2 text-xs text-[var(--sidebar-text)] opacity-45">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-[var(--sidebar-border)] px-5 py-3 shell-short:px-4 shell-short:py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--sidebar-text)] opacity-60 shell-short:text-[9px]">
          Оплаты
        </p>
        <button
          type="button"
          className="-mr-1 -mt-0.5 flex shrink-0 rounded p-1 text-[var(--sidebar-text)] hover:bg-[var(--surface-subtle)]"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Развернуть блок оплат" : "Свернуть блок оплат"}
          onClick={() => setCollapsedPersist(!collapsed)}
        >
          <ChevronIcon collapsed={collapsed} />
        </button>
      </div>

      {!collapsed && (
        <>
          <p className="mt-1.5 text-[11px] leading-snug text-[var(--sidebar-text)] opacity-75 shell-short:mt-1 shell-short:text-[10px]">
            Недавно отмечено «Оплачено» после «Не оплачено» или «Частично оплачено».
          </p>

          {items.length === 0 ? (
            <p className="mt-2 text-xs leading-snug text-[var(--sidebar-text)] opacity-55 shell-short:mt-1.5 shell-short:text-[11px]">
              Пока нет записей за последние недели.
            </p>
          ) : (
            <ul className="mt-2.5 space-y-1.5 shell-short:mt-2 shell-short:space-y-1">
              {items.map((it) => {
                const subline = [it.doctorLabel, it.patientLabel].filter(Boolean).join(" · ");
                return (
                  <li key={`${it.orderId}-${it.changedAt}`}>
                    <div className="rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]/40 px-2.5 py-2 shell-short:px-2 shell-short:py-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left transition-colors hover:text-emerald-400/90"
                          onClick={() => {
                            router.push(ordersListHref({ q: it.orderNumber }));
                          }}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="min-w-0 truncate font-mono text-xs font-semibold tabular-nums text-[var(--sidebar-text-strong)]">
                              {it.orderNumber}
                            </span>
                            <time
                              className="shrink-0 text-[10px] tabular-nums text-[var(--sidebar-text)] opacity-55"
                              dateTime={it.changedAt}
                            >
                              {new Date(it.changedAt).toLocaleString("ru-RU", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                          </div>
                          {subline ? (
                            <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[var(--sidebar-text)] opacity-65">
                              {subline}
                            </p>
                          ) : null}
                        </button>
                      </div>
                      {canDismiss ? (
                        <button
                          type="button"
                          className="mt-1.5 text-[10px] font-medium text-sky-400/90 hover:text-sky-300"
                          onClick={() => void markDismissed(it)}
                        >
                          Прочитано
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
