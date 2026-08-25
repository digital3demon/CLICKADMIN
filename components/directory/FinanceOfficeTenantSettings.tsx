"use client";

import { useEffect, useState } from "react";

type AccountOpt = { id: string; email: string; displayName: string | null };

export function FinanceOfficeTenantSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [workingDays, setWorkingDays] = useState("10");
  const [template, setTemplate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/directory/finance-office", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          workingDays?: number;
          template?: string;
          accountId?: string | null;
          accounts?: AccountOpt[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof j.error === "string" ? j.error : "Не удалось загрузить");
          return;
        }
        setWorkingDays(String(j.workingDays ?? 10));
        setTemplate(j.template ?? "");
        setAccountId(j.accountId ?? "");
        setAccounts(Array.isArray(j.accounts) ? j.accounts : []);
      })
      .catch(() => {
        if (!cancelled) setError("Сеть недоступна");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/directory/finance-office", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingDays: Number(workingDays),
          template,
          accountId: accountId || null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Ошибка сохранения");
        return;
      }
      setOk(true);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          htmlFor="fo-debt-days"
        >
          Срок долга, рабочих дней МСК
        </label>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          От даты выставления счёта. Пн–пт, без праздников РФ.
        </p>
        <input
          id="fo-debt-days"
          type="number"
          min={1}
          max={365}
          className="mt-2 w-28 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
          value={workingDays}
          onChange={(e) => setWorkingDays(e.target.value)}
        />
      </div>
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          htmlFor="fo-debt-account"
        >
          Ящик для рассылки
        </label>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Если ящиков несколько — выберите, с какого уходят уведомления о долгах.
        </p>
        <select
          id="fo-debt-account"
          className="mt-2 w-full max-w-md rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          <option value="">
            {accounts.length === 0
              ? "Нет активных ящиков"
              : "Первый активный ящик"}
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName ? `${a.displayName} <${a.email}>` : a.email}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
          htmlFor="fo-debt-tpl"
        >
          Шаблон письма
        </label>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Подстановки: {"{{номер}}"}, {"{{пациент}}"}, {"{{клиника}}"}.
        </p>
        <textarea
          id="fo-debt-tpl"
          rows={10}
          className="mt-2 w-full max-w-2xl rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">Сохранено</p>
      ) : null}
      <button
        type="button"
        disabled={saving}
        onClick={() => void onSave()}
        className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
      >
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </div>
  );
}
