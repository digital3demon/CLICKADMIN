"use client";

import { useEffect, useRef, useState } from "react";
import type { MailAccount } from "@/components/mail/types";

type Props = {
  accounts: MailAccount[];
  activeAccountId: string;
  search: string;
  syncing: boolean;
  onAccountChange: (id: string) => void;
  onSearchChange: (value: string) => void;
  onCompose: () => void;
  onSync: () => void;
  onConnectAccount: () => void;
};

export function MailHeader({
  accounts,
  activeAccountId,
  search,
  syncing,
  onAccountChange,
  onSearchChange,
  onCompose,
  onSync,
  onConnectAccount,
}: Props) {
  const active = accounts.find((a) => a.id === activeAccountId) ?? null;
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [accountMenuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--card-border)] bg-[var(--app-bg)]/95 px-5 py-3 backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="flex min-w-[220px] items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--sidebar-blue)] text-lg font-black text-white shadow-sm">
            П
          </div>
          <div className="relative min-w-0" ref={menuRef}>
            <div className="text-xl font-semibold tracking-[-0.02em] text-[var(--app-text)]">
              Почта
            </div>
            <button
              type="button"
              className="mt-0.5 flex max-w-[210px] items-center gap-1 truncate text-xs text-[var(--text-secondary)] hover:text-[var(--app-text)]"
              onClick={() => setAccountMenuOpen((open) => !open)}
              title={active?.email ?? "Выбрать или добавить ящик"}
              aria-expanded={accountMenuOpen}
            >
              <span className="truncate">{active?.email ?? "Подключить Яндекс"}</span>
              <span aria-hidden>⌄</span>
            </button>
            {accountMenuOpen ? (
              <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-2 shadow-xl">
                {accounts.length > 0 ? (
                  <div className="max-h-72 overflow-auto">
                    {accounts.map((account) => {
                      const current = account.id === activeAccountId;
                      return (
                        <button
                          key={account.id}
                          type="button"
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                            current
                              ? "bg-[var(--accent-selection-bg)]"
                              : "hover:bg-[var(--surface-hover)]"
                          }`}
                          onClick={() => {
                            onAccountChange(account.id);
                            setAccountMenuOpen(false);
                          }}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-blue)] text-xs font-bold text-white">
                            {(account.displayName || account.email).slice(0, 1).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[var(--app-text)]">
                              {account.displayName || account.email}
                            </span>
                            <span className="block truncate text-xs text-[var(--text-secondary)]">
                              {account.email}
                            </span>
                          </span>
                          {current ? (
                            <span className="text-sm font-semibold text-[var(--sidebar-blue)]">✓</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="px-3 py-2 text-sm text-[var(--text-muted)]">
                    Ящики ещё не подключены.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onConnectAccount();
                  }}
                  className="mt-2 flex w-full items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-semibold text-[var(--sidebar-blue)] hover:bg-[var(--surface-hover)]"
                >
                  Добавить ящик
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <label className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]">
            ⌕
          </span>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск в почте"
            className="h-12 w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-11 text-[15px] text-[var(--app-text)] shadow-sm outline-none transition placeholder:text-[var(--text-placeholder)] hover:border-[var(--border-strong)] focus:border-[var(--sidebar-blue)] focus:ring-4 focus:ring-[var(--sidebar-blue)]/10"
          />
        </label>

        <button
          type="button"
          onClick={onSync}
          disabled={syncing || !activeAccountId}
          className="hidden h-11 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 text-sm font-medium text-[var(--text-body)] shadow-sm transition hover:bg-[var(--surface-hover)] disabled:opacity-55 lg:inline-flex lg:items-center"
        >
          {syncing ? "Обновляем..." : "Обновить"}
        </button>

        <button
          type="button"
          onClick={onCompose}
          disabled={!activeAccountId}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[var(--sidebar-blue)] px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-[var(--sidebar-blue-hover)] active:scale-[0.99] disabled:opacity-55"
        >
          <span className="text-lg leading-none">✎</span>
          <span className="hidden sm:inline">Написать</span>
        </button>

        <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-[var(--sidebar-blue)] text-sm font-bold text-white shadow-sm xl:flex">
          {(active?.displayName || active?.email || "Я").slice(0, 1).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
