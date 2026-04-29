"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  clearAllDrafts,
  getDraftsServerSnapshot,
  getDraftsSnapshot,
  subscribeDrafts,
} from "@/lib/draft-orders-storage";
import { useNewOrderPanel } from "@/components/orders/new-order-panel-context";

export function SidebarDrafts() {
  const drafts = useSyncExternalStore(
    subscribeDrafts,
    getDraftsSnapshot,
    getDraftsServerSnapshot,
  );
  const { openFromDraft, canOpen } = useNewOrderPanel();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const hasDrafts = drafts.length > 0;

  useEffect(() => {
    if (!clearConfirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClearConfirmOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [clearConfirmOpen]);

  return (
    <div
      className={`shrink-0 px-5 pb-4 pt-4 shell-short:px-4 shell-short:pb-2.5 shell-short:pt-2.5 ${
        hasDrafts
          ? "border-t-2 border-t-red-400 bg-red-50/95 shadow-[inset_4px_0_0_0_#ef4444] dark:border-t dark:border-[var(--sidebar-border)] dark:bg-zinc-900/55 dark:shadow-none"
          : "border-t border-[var(--sidebar-border)]"
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.12em] shell-short:text-[9px] ${
          hasDrafts
            ? "text-red-800 dark:text-[var(--sidebar-text-strong)]"
            : "text-[var(--sidebar-text)]"
        }`}
      >
        Черновики
        {hasDrafts ? (
          <span className="ml-1.5 tabular-nums text-red-600 dark:text-[var(--sidebar-text)]">
            ({drafts.length})
          </span>
        ) : null}
      </p>
      {drafts.length === 0 ? (
        <p className="mt-2 text-xs leading-snug text-[var(--sidebar-text)] opacity-80 shell-short:mt-1.5 shell-short:text-[11px]">
          Появятся, если закрыть или свернуть наряд с несохранёнными данными.
        </p>
      ) : (
        <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto shell-short:mt-1.5 shell-short:max-h-28">
          {drafts.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                disabled={!canOpen}
                title={
                  !canOpen
                    ? "Закройте или сверните одно из окон (макс. 5)"
                    : "Продолжить черновик"
                }
                className={`w-full rounded-md px-2 py-2 text-left text-xs leading-snug transition-colors shell-short:px-1.5 shell-short:py-1.5 shell-short:text-[11px] ${
                  canOpen
                    ? "bg-[color-mix(in_srgb,var(--card-bg)_80%,transparent)] text-[var(--sidebar-text-strong)] shadow-sm ring-1 ring-red-100/80 hover:bg-[var(--card-bg)] hover:ring-red-200 dark:bg-zinc-900/60 dark:ring-zinc-600 dark:hover:bg-zinc-900 dark:hover:ring-zinc-500"
                    : "cursor-not-allowed text-[var(--sidebar-text)] opacity-50"
                }`}
                onClick={() => {
                  if (canOpen) openFromDraft(d);
                }}
              >
                <span className="block font-mono font-medium tabular-nums">
                  {d.label}
                </span>
                <span className="mt-0.5 block text-[10px] opacity-70">
                  {new Date(d.updatedAt).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {hasDrafts ? (
        <button
          type="button"
          className="mt-2 w-full rounded-md border border-red-200 bg-[color-mix(in_srgb,var(--card-bg)_90%,transparent)] px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-800 shadow-sm hover:bg-red-50 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => setClearConfirmOpen(true)}
        >
          Очистить черновики…
        </button>
      ) : null}

      {clearConfirmOpen ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-zinc-900/50 p-4"
          role="presentation"
          onClick={() => setClearConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-drafts-title"
            className="w-full max-w-sm rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="clear-drafts-title"
              className="text-base font-semibold text-[var(--app-text)]"
            >
              Удалить все черновики?
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Будет удалено черновиков:{" "}
              <strong className="tabular-nums text-[var(--app-text)]">
                {drafts.length}
              </strong>
              . Восстановить их будет нельзя. Открытые окна нарядов не затронуты.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                onClick={() => setClearConfirmOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={() => {
                  clearAllDrafts();
                  setClearConfirmOpen(false);
                }}
              >
                Да, очистить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
