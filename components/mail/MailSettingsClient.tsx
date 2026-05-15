"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MailAccount, MailFolder } from "@/components/mail/types";
import { mailFolderDisplayName } from "@/components/mail/types";

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function ruleSummary(rule: EmailRule, account: MailAccount | null): { conditions: string; actions: string } {
  const conditions = asRecord(rule.conditions);
  const actions = asRecord(rule.actions);
  const conditionParts = [
    stringValue(conditions.from) ? `От кого содержит «${stringValue(conditions.from)}»` : "",
    stringValue(conditions.subject) ? `Тема содержит «${stringValue(conditions.subject)}»` : "",
    stringValue(conditions.body) ? `Текст содержит «${stringValue(conditions.body)}»` : "",
  ].filter(Boolean);
  const folderId = stringValue(actions.moveToFolderId);
  const folder = account?.folders.find((item) => item.id === folderId);
  const labelIds = stringArrayValue(actions.labelIds);
  const labelNames = labelIds
    .map((id) => account?.labels.find((label) => label.id === id)?.name)
    .filter(Boolean);
  const actionParts = [
    actions.delete === true ? "Удалить" : "",
    actions.markRead === true ? "Пометить прочитанным" : "",
    actions.markImportant === true ? "Поставить флажок" : "",
    folder ? `Положить в папку «${mailFolderDisplayName(folder)}»` : "",
    labelNames.length ? `Поставить метку: ${labelNames.join(", ")}` : "",
  ].filter(Boolean);
  return {
    conditions: conditionParts.length ? conditionParts.join("; ") : "Без условий",
    actions: actionParts.length ? actionParts.join("; ") : "Без действий",
  };
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
      const conditions = {
        from: String(formData.get("conditionFrom") || "").trim(),
        subject: String(formData.get("conditionSubject") || "").trim(),
        body: String(formData.get("conditionBody") || "").trim(),
      };
      if (!conditions.from && !conditions.subject && !conditions.body) {
        setError("Добавьте хотя бы одно условие: отправитель, тема или текст письма");
        setStatus("");
        return;
      }
      const moveToFolderId =
        formData.get("moveToFolder") === "on"
          ? String(formData.get("moveToFolderId") || "").trim() || null
          : null;
      const labelId =
        formData.get("setLabel") === "on"
          ? String(formData.get("labelId") || "").trim()
          : "";
      const actions = {
        delete: formData.get("delete") === "on",
        markRead: formData.get("markRead") === "on",
        markImportant: formData.get("markImportant") === "on",
        moveToFolderId,
        labelIds: labelId ? [labelId] : [],
      };
      await jsonFetch("/api/mail/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeAccount.id,
          name: String(formData.get("name") || ""),
          conditions,
          actions,
        }),
      });
      setStatus("Правило создано");
      await load();
    } catch (err) {
      setError(
        err instanceof Error
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

  async function createFolder(formData: FormData) {
    if (!activeAccount) return;
    setError("");
    setStatus("Создаю папку...");
    try {
      await jsonFetch("/api/mail/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeAccount.id,
          name: String(formData.get("name") || ""),
          color: String(formData.get("color") || "#6b7280"),
        }),
      });
      setStatus("Папка создана");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать папку");
    }
  }

  async function updateFolder(formData: FormData) {
    const folderId = String(formData.get("folderId") || "");
    if (!folderId) return;
    setError("");
    setStatus("Сохраняю папку...");
    try {
      await jsonFetch(`/api/mail/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") || ""),
          color: String(formData.get("color") || "#6b7280"),
        }),
      });
      setStatus("Папка сохранена");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить папку");
    }
  }

  async function deleteFolder(folder: MailFolder) {
    if (!window.confirm(`Удалить папку «${mailFolderDisplayName(folder)}»? Письма останутся в базе без папки.`)) {
      return;
    }
    setError("");
    setStatus("Удаляю папку...");
    try {
      await jsonFetch(`/api/mail/folders/${folder.id}`, { method: "DELETE" });
      setStatus("Папка удалена");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить папку");
    }
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--app-text)]">Папки</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Цвет можно настроить для всех папок. Переименование и удаление доступны для пользовательских папок.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-3">
            {activeAccount?.folders.length ? (
              activeAccount.folders.map((folder) => {
                const editable = folder.type === "CUSTOM";
                return (
                  <form
                    key={folder.id}
                    action={(formData) => void updateFolder(formData)}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3"
                  >
                    <input type="hidden" name="folderId" value={folder.id} />
                    <span
                      className="h-3.5 w-3.5 rounded-full ring-2 ring-[var(--card-bg)]"
                      style={{ backgroundColor: folder.color || "#6b7280" }}
                    />
                    <input
                      name="name"
                      defaultValue={mailFolderDisplayName(folder)}
                      disabled={!editable}
                      className="h-10 min-w-[12rem] flex-1 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none disabled:opacity-70"
                    />
                    <input
                      name="color"
                      type="color"
                      defaultValue={folder.color || "#6b7280"}
                      className="h-10 w-12 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-1"
                      title="Цвет папки"
                    />
                    <button
                      type="submit"
                      disabled={!editable}
                      className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      disabled={!editable}
                      onClick={() => void deleteFolder(folder)}
                      className="rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-600 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-300"
                    >
                      Удалить
                    </button>
                  </form>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--card-border)] p-6 text-sm text-[var(--text-muted)]">
                Выберите аккаунт, чтобы настроить папки.
              </div>
            )}
          </div>

          <form action={(formData) => void createFolder(formData)} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4">
            <h3 className="text-sm font-semibold text-[var(--app-text)]">Новая папка</h3>
            <input
              name="name"
              required
              placeholder="Название папки"
              className="mt-3 h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
            />
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Цвет
            </label>
            <input
              name="color"
              type="color"
              defaultValue="#6b7280"
              className="mt-2 h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-1"
            />
            <button
              type="submit"
              disabled={!activeAccount}
              className="mt-4 w-full rounded-xl bg-[var(--sidebar-blue)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-50"
            >
              Создать папку
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-[var(--app-text)]">
            Правила обработки входящей почты
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Настройте понятные условия и действия без JSON. Правила применяются к новым письмам при синхронизации.
          </p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_32rem]">
          <div className="space-y-3">
            {rules.length > 0 ? (
              rules.map((rule) => {
                const summary = ruleSummary(rule, activeAccount);
                return (
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
                    <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                      <p>
                        <span className="font-semibold text-[var(--app-text)]">Если:</span>{" "}
                        {summary.conditions}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--app-text)]">То:</span>{" "}
                        {summary.actions}
                      </p>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--card-border)] p-6 text-sm text-[var(--text-muted)]">
                Правил пока нет. Создайте первое правило справа: выберите условия и отметьте нужные действия.
              </div>
            )}
          </div>

          <form action={(formData) => void createRule(formData)} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-5">
            <h3 className="text-base font-semibold text-[var(--app-text)]">Новое правило</h3>
            <input
              name="name"
              required
              placeholder="Например: Заявки от клиники"
              className="mt-3 h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
            />

            <div className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <h4 className="text-sm font-semibold text-[var(--app-text)]">Если письмо подходит под условия</h4>
              <div className="mt-3 space-y-3">
                <label className="grid gap-1 text-xs font-medium text-[var(--text-muted)]">
                  От кого содержит
                  <input
                    name="conditionFrom"
                    placeholder="clinic@example.ru или Клиника"
                    className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-normal text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-[var(--text-muted)]">
                  Тема содержит
                  <input
                    name="conditionSubject"
                    placeholder="Счёт, заказ, заявка"
                    className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-normal text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-[var(--text-muted)]">
                  Текст письма содержит
                  <input
                    name="conditionBody"
                    placeholder="Любая фраза из письма"
                    className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-normal text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <h4 className="text-sm font-semibold text-[var(--app-text)]">Выполнить действия</h4>
              <div className="mt-3 space-y-3 text-sm text-[var(--text-body)]">
                <label className="flex items-center gap-3">
                  <input name="delete" type="checkbox" className="h-4 w-4 rounded border-[var(--input-border)]" />
                  Удалить письмо
                </label>
                <label className="flex items-center gap-3">
                  <input name="markRead" type="checkbox" className="h-4 w-4 rounded border-[var(--input-border)]" />
                  Пометить прочитанным
                </label>
                <label className="flex items-center gap-3">
                  <input name="markImportant" type="checkbox" className="h-4 w-4 rounded border-[var(--input-border)]" />
                  Поставить флажок
                </label>
                <label className="grid gap-2 rounded-xl border border-[var(--card-border)] p-3">
                  <span className="flex items-center gap-3">
                    <input name="moveToFolder" type="checkbox" className="h-4 w-4 rounded border-[var(--input-border)]" />
                    Положить в папку
                  </span>
                  <select
                    name="moveToFolderId"
                    className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none"
                    defaultValue=""
                  >
                    <option value="">Выберите папку</option>
                    {activeAccount?.folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {mailFolderDisplayName(folder)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 rounded-xl border border-[var(--card-border)] p-3">
                  <span className="flex items-center gap-3">
                    <input name="setLabel" type="checkbox" className="h-4 w-4 rounded border-[var(--input-border)]" />
                    Поставить метку
                  </span>
                  <select
                    name="labelId"
                    className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none"
                    defaultValue=""
                  >
                    <option value="">Выберите метку</option>
                    {activeAccount?.labels.map((label) => (
                      <option key={label.id} value={label.id}>
                        {label.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
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
