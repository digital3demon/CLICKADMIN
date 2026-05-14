"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MailAccount } from "@/components/mail/types";

type EmailRule = {
  id: string;
  accountId: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  conditions: unknown;
  actions: unknown;
  account?: { email: string; displayName: string | null };
};

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export function MailSettingsClient() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [accountId, setAccountId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? accounts[0] ?? null,
    [accountId, accounts],
  );

  const load = useCallback(async () => {
    setError("");
    const accountsData = await jsonFetch<{ accounts: MailAccount[] }>("/api/mail/accounts");
    setAccounts(accountsData.accounts);
    const nextAccountId = accountId || accountsData.accounts[0]?.id || "";
    setAccountId(nextAccountId);
    const rulesData = await jsonFetch<{ rules: EmailRule[] }>(
      nextAccountId
        ? `/api/mail/rules?accountId=${encodeURIComponent(nextAccountId)}`
        : "/api/mail/rules",
    );
    setRules(rulesData.rules);
  }, [accountId]);

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Ошибка загрузки настроек почты"),
    );
  }, [load]);

  async function saveAccount(formData: FormData) {
    setError("");
    setStatus("Сохраняю аккаунт...");
    try {
      await jsonFetch("/api/mail/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email") || ""),
          displayName: String(formData.get("displayName") || ""),
          appPassword: String(formData.get("appPassword") || ""),
        }),
      });
      setStatus("Аккаунт сохранён");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить аккаунт");
    }
  }

  async function createRule(formData: FormData) {
    if (!activeAccount) return;
    setError("");
    setStatus("Создаю правило...");
    try {
      const conditionsRaw = String(formData.get("conditions") || "{}");
      const actionsRaw = String(formData.get("actions") || "{}");
      await jsonFetch("/api/mail/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeAccount.id,
          name: String(formData.get("name") || ""),
          conditions: JSON.parse(conditionsRaw),
          actions: JSON.parse(actionsRaw),
        }),
      });
      setStatus("Правило создано");
      await load();
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? "JSON в условиях или действиях заполнен неверно"
          : err instanceof Error
            ? err.message
            : "Не удалось создать правило",
      );
    }
  }

  async function toggleRule(rule: EmailRule) {
    await jsonFetch(`/api/mail/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    await load();
  }

  async function deleteRule(rule: EmailRule) {
    if (!window.confirm(`Удалить правило «${rule.name}»?`)) return;
    await jsonFetch(`/api/mail/rules/${rule.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-300/50 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {status ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {status}
        </div>
      ) : null}

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Аккаунты Яндекс.Почты
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Подключение только через пароль приложения. OAuth2 не используется.
            </p>
          </div>
          {accounts.length > 0 ? (
            <select
              value={activeAccount?.id ?? ""}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName || account.email}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <form action={(formData) => void saveAccount(formData)} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            name="email"
            type="email"
            required
            placeholder="name@yandex.ru"
            className="h-11 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
          />
          <input
            name="displayName"
            placeholder="Имя отправителя"
            className="h-11 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
          />
          <input
            name="appPassword"
            type="password"
            required
            placeholder="Пароль приложения"
            className="h-11 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
          />
          <button
            type="submit"
            className="h-11 rounded-xl bg-[var(--sidebar-blue)] px-5 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)]"
          >
            Сохранить
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-[var(--app-text)]">
            Правила обработки входящей почты
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Базовая структура уже хранится в БД. Когда пришлёте скриншоты, перестроим визуальный редактор условий и действий под ваш сценарий.
          </p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-3">
            {rules.length > 0 ? (
              rules.map((rule) => (
                <article
                  key={rule.id}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="min-w-0 flex-1 text-sm font-semibold text-[var(--app-text)]">
                      {rule.name}
                    </h3>
                    <span className="rounded-full bg-[var(--accent-selection-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--sidebar-blue)]">
                      {rule.isActive ? "Активно" : "Выключено"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void toggleRule(rule)}
                      className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                    >
                      {rule.isActive ? "Выключить" : "Включить"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteRule(rule)}
                      className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-300"
                    >
                      Удалить
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <pre className="max-h-48 overflow-auto rounded-lg bg-[var(--card-bg)] p-3 text-xs text-[var(--text-secondary)]">
                      {prettyJson(rule.conditions)}
                    </pre>
                    <pre className="max-h-48 overflow-auto rounded-lg bg-[var(--card-bg)] p-3 text-xs text-[var(--text-secondary)]">
                      {prettyJson(rule.actions)}
                    </pre>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--card-border)] p-6 text-sm text-[var(--text-muted)]">
                Правил пока нет. Создайте черновик правила справа или пришлите скриншоты — соберём визуальный конструктор.
              </div>
            )}
          </div>

          <form action={(formData) => void createRule(formData)} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4">
            <h3 className="text-sm font-semibold text-[var(--app-text)]">Новое правило</h3>
            <input
              name="name"
              required
              placeholder="Например: Заявки от клиники"
              className="mt-3 h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
            />
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Условия (JSON)
            </label>
            <textarea
              name="conditions"
              rows={7}
              defaultValue={prettyJson({ from: "", subject: "", body: "" })}
              className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 font-mono text-xs text-[var(--app-text)] outline-none"
            />
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Действия (JSON)
            </label>
            <textarea
              name="actions"
              rows={7}
              defaultValue={prettyJson({
                markImportant: false,
                labelIds: [],
                moveToFolderId: null,
                autoReply: null,
              })}
              className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 font-mono text-xs text-[var(--app-text)] outline-none"
            />
            <button
              type="submit"
              disabled={!activeAccount}
              className="mt-4 w-full rounded-xl bg-[var(--sidebar-blue)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-50"
            >
              Создать правило
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
