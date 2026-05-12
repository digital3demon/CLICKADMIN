"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Row = {
  orderId: string;
  orderNumber: string;
  changedAt: string;
};

export function SidebarPayments() {
  const pathname = usePathname();
  const [items, setItems] = useState<Row[] | null>(null);

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

  if (items === null) {
    return (
      <div className="shrink-0 border-t border-[var(--sidebar-border)] px-5 py-3 shell-short:px-4 shell-short:py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--sidebar-text)] opacity-60 shell-short:text-[9px]">
          Оплаты
        </p>
        <p className="mt-2 text-xs text-[var(--sidebar-text)] opacity-45">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-[var(--sidebar-border)] px-5 py-3 shell-short:px-4 shell-short:py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--sidebar-text)] opacity-60 shell-short:text-[9px]">
        Оплаты
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-[var(--sidebar-text)] opacity-75 shell-short:mt-1 shell-short:text-[10px]">
        Недавно отмечено «Оплачено» после «Не оплачено» или «Частично оплачено».
      </p>

      {items.length === 0 ? (
        <p className="mt-2 text-xs leading-snug text-[var(--sidebar-text)] opacity-55 shell-short:mt-1.5 shell-short:text-[11px]">
          Пока нет записей за последние недели.
        </p>
      ) : (
        <ul className="mt-2.5 space-y-1.5 shell-short:mt-2 shell-short:space-y-1">
          {items.map((it) => (
            <li key={it.orderId}>
              <Link
                href={`/orders/${it.orderId}`}
                className="block rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]/40 px-2.5 py-2 transition-colors hover:border-emerald-500/40 hover:bg-[var(--surface-subtle)] shell-short:px-2 shell-short:py-1.5"
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
