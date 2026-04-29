"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { AttentionReminder } from "@/lib/attention-reminders";

/** localStorage: «1» — список развёрнут, «0» — свёрнут. */
const ATTENTION_LIST_OPEN_KEY = "dental-lab-attention-list-open" as const;

export function SidebarAttention() {
  const pathname = usePathname();
  const [items, setItems] = useState<AttentionReminder[] | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/attention-reminders", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as AttentionReminder[];
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ATTENTION_LIST_OPEN_KEY);
      if (raw === "0") setListOpen(false);
      else if (raw === "1") setListOpen(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(ATTENTION_LIST_OPEN_KEY, listOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [listOpen, hydrated]);

  const toggleList = useCallback(() => {
    setListOpen((o) => !o);
  }, []);

  if (items === null) {
    return (
      <div className="shrink-0 border-t border-[var(--sidebar-border)] px-5 py-3 shell-short:px-4 shell-short:py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--sidebar-text)] opacity-60 shell-short:text-[9px]">
          Обратите внимание
        </p>
        <p className="mt-2 text-xs text-[var(--sidebar-text)] opacity-45">
          Загрузка…
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="shrink-0 border-t border-[var(--sidebar-border)] px-5 pb-3 pt-4 shell-short:px-4 shell-short:pb-2 shell-short:pt-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-900/90 dark:text-[var(--sidebar-text-strong)] shell-short:text-[9px]">
            Обратите внимание
          </p>
          <button
            type="button"
            onClick={toggleList}
            aria-expanded={listOpen}
            title={listOpen ? "Свернуть блок" : "Развернуть блок"}
            aria-label={listOpen ? "Свернуть блок" : "Развернуть блок"}
            className="pressable-tap flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sky-900/80 transition-colors hover:bg-sky-950/10 dark:text-[var(--sidebar-text)] dark:hover:bg-white/10 shell-short:h-6 shell-short:w-6"
          >
            {listOpen ? (
              <IconChevronUp className="h-4 w-4 shell-short:h-3.5 shell-short:w-3.5" aria-hidden />
            ) : (
              <IconChevronDown className="h-4 w-4 shell-short:h-3.5 shell-short:w-3.5" aria-hidden />
            )}
          </button>
        </div>
        {listOpen ? (
          <>
            <p className="mt-2 text-xs leading-snug text-[var(--sidebar-text)] opacity-75 shell-short:mt-1.5 shell-short:text-[11px]">
              Нет напоминаний: автосверки и неполные карточки отсутствуют.
            </p>
            <Link
              href="/attention"
              className="mt-2 inline-block text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
            >
              Раздел «Внимание»
            </Link>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t-2 border-t-sky-500/90 bg-sky-950/[0.06] px-5 pb-3 pt-4 shadow-[inset_4px_0_0_0_#0ea5e9] dark:border-t dark:border-[var(--sidebar-border)] dark:bg-zinc-900/45 dark:shadow-none shell-short:px-4 shell-short:pb-2 shell-short:pt-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-950 dark:text-[var(--sidebar-text-strong)] shell-short:text-[9px]">
          Обратите внимание
          <span className="ml-1.5 tabular-nums text-sky-800 dark:text-[var(--sidebar-text)]">
            ({items.length})
          </span>
        </p>
        <button
          type="button"
          onClick={toggleList}
          aria-expanded={listOpen}
          title={listOpen ? "Свернуть список" : "Развернуть список"}
          aria-label={listOpen ? "Свернуть список" : "Развернуть список"}
          className="pressable-tap flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sky-900/80 transition-colors hover:bg-sky-950/10 dark:text-[var(--sidebar-text)] dark:hover:bg-white/10 shell-short:h-6 shell-short:w-6"
        >
          {listOpen ? (
            <IconChevronUp className="h-4 w-4 shell-short:h-3.5 shell-short:w-3.5" aria-hidden />
          ) : (
            <IconChevronDown className="h-4 w-4 shell-short:h-3.5 shell-short:w-3.5" aria-hidden />
          )}
        </button>
      </div>
      {listOpen ? (
        <>
            <p className="mt-1 text-[10px] leading-snug text-sky-950/75 dark:text-[var(--sidebar-text)] shell-short:text-[9px]">
            Автосверки, неполные клиники и врачи.
          </p>
          <ul className="mt-2.5 max-h-[min(40vh,14rem)] space-y-2 overflow-y-auto pr-0.5 shell-short:mt-1.5 shell-short:max-h-[min(28vh,9rem)] shell-short:space-y-1.5">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="block rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sky-950/10 dark:hover:bg-white/5 shell-short:px-1.5 shell-short:py-1"
                >
                  <span className="block text-xs font-medium leading-tight text-[var(--sidebar-text-strong)] shell-short:text-[11px]">
                    {item.primary}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-sky-950/80 dark:text-[var(--sidebar-text)] shell-short:text-[9px]">
                    {item.kind === "clinic"
                      ? "Клиника · "
                      : item.kind === "doctor"
                        ? "Врач · "
                        : "Сверка · "}
                    {item.detail}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconChevronUp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}
