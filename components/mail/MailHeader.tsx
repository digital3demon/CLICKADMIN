"use client";

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
  return (
    <header className="sticky top-0 z-30 border-b border-[#e6e8ef] bg-[#f6f7fb]/95 px-5 py-3 backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="flex min-w-[220px] items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffdd2d] text-lg font-black text-[#1f2328] shadow-sm">
            П
          </div>
          <div className="min-w-0">
            <div className="text-xl font-semibold tracking-[-0.02em] text-[#15171a]">
              Почта
            </div>
            <button
              type="button"
              className="mt-0.5 flex max-w-[210px] items-center gap-1 truncate text-xs text-[#6f7582] hover:text-[#15171a]"
              onClick={onConnectAccount}
              title={active?.email ?? "Подключить аккаунт"}
            >
              <span className="truncate">{active?.email ?? "Подключить Яндекс"}</span>
              <span aria-hidden>⌄</span>
            </button>
          </div>
        </div>

        <div className="hidden min-w-[190px] md:block">
          <select
            className="h-10 w-full rounded-xl border border-[#dfe3ec] bg-white px-3 text-sm text-[#20242a] outline-none transition focus:border-[#2b7cff] focus:ring-2 focus:ring-[#2b7cff]/15"
            value={activeAccountId}
            onChange={(e) => onAccountChange(e.target.value)}
            aria-label="Почтовый аккаунт"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName || a.email}
              </option>
            ))}
          </select>
        </div>

        <label className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa2b2]">
            ⌕
          </span>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск в почте"
            className="h-12 w-full rounded-2xl border border-[#e0e4ee] bg-white px-11 text-[15px] text-[#161a21] shadow-sm outline-none transition placeholder:text-[#9aa2b2] hover:border-[#d1d7e4] focus:border-[#2b7cff] focus:ring-4 focus:ring-[#2b7cff]/10"
          />
        </label>

        <button
          type="button"
          onClick={onSync}
          disabled={syncing || !activeAccountId}
          className="hidden h-11 rounded-xl border border-[#dde2ec] bg-white px-4 text-sm font-medium text-[#333942] shadow-sm transition hover:bg-[#f2f5fa] disabled:opacity-55 lg:inline-flex lg:items-center"
        >
          {syncing ? "Обновляем..." : "Обновить"}
        </button>

        <button
          type="button"
          onClick={onCompose}
          disabled={!activeAccountId}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#2b7cff] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(43,124,255,0.24)] transition hover:bg-[#176bf2] active:scale-[0.99] disabled:opacity-55"
        >
          <span className="text-lg leading-none">✎</span>
          <span className="hidden sm:inline">Написать</span>
        </button>

        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-full bg-white text-[#687083] shadow-sm ring-1 ring-[#e2e6ef] transition hover:bg-[#f1f4f9] xl:inline-flex"
          title="Уведомления"
        >
          ○
        </button>
        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-full bg-white text-[#687083] shadow-sm ring-1 ring-[#e2e6ef] transition hover:bg-[#f1f4f9] xl:inline-flex"
          title="Настройки"
        >
          ⚙
        </button>
        <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ffdd2d] to-[#ff9a3d] text-sm font-bold text-[#25221a] shadow-sm xl:flex">
          {(active?.displayName || active?.email || "Я").slice(0, 1).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
