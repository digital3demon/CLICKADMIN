"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MailAccount, MailFolder } from "@/components/mail/types";
import { mailFolderDisplayName } from "@/components/mail/types";
import { ALL_USER_ROLES, USER_ROLE_LABELS } from "@/lib/user-role-labels";

const NEW_FOLDER_VALUE = "__new_folder__";
const NEW_LABEL_VALUE = "__new_label__";

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

function ruleConditionLabel(field: string): string {
  if (field === "from") return "От кого";
  if (field === "toCc") return "Кому или копия";
  if (field === "subject") return "Тема";
  if (field === "body") return "Тело письма";
  if (field === "attachmentName") return "Название вложения";
  return field;
}

function ruleConditionParts(conditions: Record<string, unknown>): string[] {
  if (Array.isArray(conditions.any)) {
    return conditions.any
      .map((item) => {
        const record = asRecord(item);
        const field = stringValue(record.field);
        const contains = stringValue(record.contains);
        return field && contains ? `${ruleConditionLabel(field)} содержит «${contains}»` : "";
      })
      .filter(Boolean);
  }
  return [
    stringValue(conditions.from) ? `От кого содержит «${stringValue(conditions.from)}»` : "",
    stringValue(conditions.subject) ? `Тема содержит «${stringValue(conditions.subject)}»` : "",
    stringValue(conditions.body) ? `Текст содержит «${stringValue(conditions.body)}»` : "",
  ].filter(Boolean);
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
  const conditionParts = ruleConditionParts(conditions);
  const folderId = stringValue(actions.moveToFolderId);
  const folder = account?.folders.find((item) => item.id === folderId);
  const labelIds = stringArrayValue(actions.labelIds);
  const forwardTo = stringArrayValue(actions.forwardTo);
  const labelNames = labelIds
    .map((id) => account?.labels.find((label) => label.id === id)?.name)
    .filter(Boolean);
  const actionParts = [
    actions.delete === true ? "Удалить" : "",
    actions.markRead === true ? "Пометить прочитанным" : "",
    actions.markImportant === true ? "Поставить флажок" : "",
    folder ? `Положить в папку «${mailFolderDisplayName(folder)}»` : "",
    labelNames.length ? `Поставить метку: ${labelNames.join(", ")}` : "",
    forwardTo.length ? `Переслать: ${forwardTo.join(", ")}` : "",
    actions.stopProcessing === true ? "Не применять остальные правила" : "",
  ].filter(Boolean);
  return {
    conditions: conditionParts.length ? conditionParts.join(" или ") : "Без условий",
    actions: actionParts.length ? actionParts.join("; ") : "Без действий",
  };
}

const FOLDER_COLOR_PRESETS = [
  "#6b7280",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
];

const MAIL_ROLE_OPTIONS = [
  ...ALL_USER_ROLES.map((role) => ({ value: role, label: USER_ROLE_LABELS[role] })),
];

function normalizeHexColor(value: string | null | undefined, fallback = "#6b7280"): string {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function FolderColorPicker({
  defaultValue,
  compact = false,
}: {
  defaultValue: string | null | undefined;
  compact?: boolean;
}) {
  const [color, setColor] = useState(() => normalizeHexColor(defaultValue));
  const submittedColor = normalizeHexColor(color);
  return (
    <div className={compact ? "min-w-[11rem] flex-1" : ""}>
      <input type="hidden" name="color" value={submittedColor} />
      <div className="flex flex-wrap items-center gap-1.5">
        {FOLDER_COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setColor(preset)}
            className={`h-6 w-6 rounded-full border transition ${
              color.toLowerCase() === preset.toLowerCase()
                ? "border-[var(--app-text)] ring-2 ring-[var(--sidebar-blue)]/40"
                : "border-[var(--card-border)] hover:scale-105"
            }`}
            style={{ backgroundColor: preset }}
            aria-label={`Выбрать цвет ${preset}`}
            title={preset}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className="h-8 w-8 shrink-0 rounded-lg border border-[var(--card-border)]"
          style={{ backgroundColor: submittedColor }}
          aria-hidden
        />
        <input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          onBlur={() => setColor(submittedColor)}
          className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs font-medium text-[var(--app-text)] outline-none"
          aria-label="Цвет папки в HEX"
        />
      </div>
    </div>
  );
}

export function MailSettingsClient() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [accountId, setAccountId] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [accountDetailsLoading, setAccountDetailsLoading] = useState(false);
  const [selectedAccessRoles, setSelectedAccessRoles] = useState<string[]>(["OWNER"]);
  const [accessSaving, setAccessSaving] = useState(false);
  const [ruleFolderChoice, setRuleFolderChoice] = useState("");
  const [ruleLabelChoice, setRuleLabelChoice] = useState("");

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? accounts[0] ?? null,
    [accountId, accounts],
  );

  const loadAccounts = useCallback(async () => {
    setError("");
    const accountsData = await jsonFetch<{
      accounts: MailAccount[];
      currentUser?: { role?: string };
    }>("/api/mail/accounts?lite=1");
    setAccounts(accountsData.accounts);
    setCurrentUserRole(accountsData.currentUser?.role || "");
    setAccountId((prev) =>
      prev && accountsData.accounts.some((account) => account.id === prev)
        ? prev
        : accountsData.accounts[0]?.id || "",
    );
  }, []);

  const loadAccountDetails = useCallback(async (nextAccountId: string) => {
    if (!nextAccountId) return;
    setAccountDetailsLoading(true);
    try {
      const [foldersData, labelsData] = await Promise.all([
        jsonFetch<{ folders: MailFolder[] }>(`/api/mail/folders?accountId=${encodeURIComponent(nextAccountId)}`),
        jsonFetch<{ labels: MailAccount["labels"] }>(`/api/mail/labels?accountId=${encodeURIComponent(nextAccountId)}`),
      ]);
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === nextAccountId
            ? { ...account, folders: foldersData.folders, labels: labelsData.labels }
            : account,
        ),
      );
    } finally {
      setAccountDetailsLoading(false);
    }
  }, []);

  const loadRules = useCallback(async (nextAccountId: string) => {
    if (!nextAccountId) {
      setRules([]);
      return;
    }
    const rulesData = await jsonFetch<{ rules: EmailRule[] }>(
      `/api/mail/rules?accountId=${encodeURIComponent(nextAccountId)}`,
    );
    setRules(rulesData.rules);
  }, []);

  const canManageAccountAccess = currentUserRole === "OWNER";

  useEffect(() => {
    setSelectedAccessRoles(Array.from(new Set(["OWNER", ...(activeAccount?.allowedRoles || [])])));
  }, [activeAccount?.id, activeAccount?.allowedRoles]);

  useEffect(() => {
    void loadAccounts().catch((err) =>
      setError(err instanceof Error ? err.message : "Ошибка загрузки настроек почты"),
    );
  }, [loadAccounts]);

  useEffect(() => {
    void Promise.all([loadAccountDetails(accountId), loadRules(accountId)]).catch((err) =>
      setError(err instanceof Error ? err.message : "Ошибка загрузки данных ящика"),
    );
  }, [accountId, loadAccountDetails, loadRules]);

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
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить аккаунт");
    }
  }

  async function deleteAccount(account: MailAccount) {
    if (!canManageAccountAccess) return;
    const label = account.displayName || account.email;
    const confirmText = `Отключить ящик «${label}» в CRM? Письма в Яндекс.Почте и история в базе не удаляются.`;
    if (!window.confirm(confirmText)) return;

    setError("");
    setStatus("Отключаю ящик...");
    try {
      await jsonFetch(`/api/mail/accounts/${account.id}`, { method: "DELETE" });
      setStatus("Ящик отключён");
      setAccountId((prev) => (prev === account.id ? "" : prev));
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отключить ящик");
    }
  }

  function toggleAccessRole(role: string): void {
    if (role === "OWNER") return;
    setSelectedAccessRoles((prev) => {
      const roles = new Set(["OWNER", ...prev]);
      if (roles.has(role)) {
        roles.delete(role);
      } else {
        roles.add(role);
      }
      roles.add("OWNER");
      return [...roles];
    });
  }

  async function saveAccountAccess() {
    if (!activeAccount) return;
    setError("");
    setStatus("Сохраняю доступ к ящику...");
    setAccessSaving(true);
    try {
      const allowedRoles = Array.from(new Set(["OWNER", ...selectedAccessRoles]));
      await jsonFetch(`/api/mail/accounts/${activeAccount.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedRoles }),
      });
      setStatus("Доступ к ящику обновлён");
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === activeAccount.id ? { ...account, allowedRoles } : account,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить доступ к ящику");
    } finally {
      setAccessSaving(false);
    }
  }

  async function createRule(formData: FormData) {
    if (!activeAccount) return;
    setError("");
    setStatus("Создаю правило...");
    try {
      const conditions = {
        any: [
          { field: "from", contains: String(formData.get("conditionFrom") || "").trim() },
          { field: "toCc", contains: String(formData.get("conditionToCc") || "").trim() },
          { field: "subject", contains: String(formData.get("conditionSubject") || "").trim() },
          { field: "body", contains: String(formData.get("conditionBody") || "").trim() },
          { field: "attachmentName", contains: String(formData.get("conditionAttachmentName") || "").trim() },
        ].filter((item) => item.contains),
      };
      if (conditions.any.length === 0) {
        setError("Добавьте хотя бы одно условие: отправитель, тема или текст письма");
        setStatus("");
        return;
      }
      let moveToFolderId =
        formData.get("moveToFolder") === "on"
          ? String(formData.get("moveToFolderId") || "").trim() || null
          : null;
      let labelId =
        formData.get("setLabel") === "on"
          ? String(formData.get("labelId") || "").trim()
          : "";
      if (moveToFolderId === NEW_FOLDER_VALUE) {
        const name = String(formData.get("newFolderName") || "").trim();
        if (!name) {
          setError("Введите название новой папки");
          setStatus("");
          return;
        }
        const data = await jsonFetch<{ folder: MailFolder }>("/api/mail/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: activeAccount.id, name, color: "#6b7280" }),
        });
        moveToFolderId = data.folder.id;
      }
      if (labelId === NEW_LABEL_VALUE) {
        const name = String(formData.get("newLabelName") || "").trim();
        if (!name) {
          setError("Введите название новой метки");
          setStatus("");
          return;
        }
        const data = await jsonFetch<{ label: { id: string } }>("/api/mail/labels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: activeAccount.id, name, color: "#ff6680" }),
        });
        labelId = data.label.id;
      }
      const actions = {
        delete: formData.get("delete") === "on",
        markRead: formData.get("markRead") === "on",
        markImportant: formData.get("markImportant") === "on",
        stopProcessing: formData.get("stopProcessing") === "on",
        moveToFolderId,
        labelIds: labelId ? [labelId] : [],
        forwardTo: String(formData.get("forwardTo") || "")
          .split(/[;,]/)
          .map((item) => item.trim())
          .filter(Boolean),
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
      setRuleFolderChoice("");
      setRuleLabelChoice("");
      await loadAccountDetails(activeAccount.id);
      await loadRules(activeAccount.id);
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
    await loadRules(activeAccount?.id || "");
  }

  async function deleteRule(rule: EmailRule) {
    if (!window.confirm(`Удалить правило «${rule.name}»?`)) return;
    await jsonFetch(`/api/mail/rules/${rule.id}`, { method: "DELETE" });
    await loadRules(activeAccount?.id || "");
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
      await loadAccountDetails(activeAccount.id);
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
      await loadAccountDetails(activeAccount.id);
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
      await loadAccountDetails(activeAccount?.id || "");
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
            <div className="flex flex-wrap items-center justify-end gap-2">
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
              {activeAccount && canManageAccountAccess ? (
                <button
                  type="button"
                  onClick={() => void deleteAccount(activeAccount)}
                  className="h-10 rounded-xl border border-red-400/40 px-3 text-sm font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-300"
                >
                  Отключить ящик
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {canManageAccountAccess ? (
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
        ) : (
          <div className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--text-secondary)]">
            Подключение новых почтовых ящиков доступно владельцу.
          </div>
        )}

        {activeAccount && canManageAccountAccess ? (
          <div
            key={activeAccount.id}
            className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--app-text)]">
                  Доступ к ящику «{activeAccount.displayName || activeAccount.email}»
                </h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Отметьте роли, которым можно видеть письма, синхронизировать ящик и отправлять письма от этого аккаунта.
                </p>
              </div>
              <button
                type="button"
                disabled={accessSaving}
                onClick={() => void saveAccountAccess()}
                className="rounded-xl bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:cursor-wait disabled:opacity-60"
              >
                {accessSaving ? "Сохраняю..." : "Сохранить доступ"}
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {MAIL_ROLE_OPTIONS.map((role) => {
                const isOwnerRole = role.value === "OWNER";
                const checked = isOwnerRole || selectedAccessRoles.includes(role.value);
                return (
                  <label
                    key={role.value}
                    className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--app-text)]"
                  >
                    <input
                      type="checkbox"
                      name="allowedRoles"
                      value={role.value}
                      checked={checked}
                      disabled={isOwnerRole || accessSaving}
                      onChange={() => toggleAccessRole(role.value)}
                      className="h-4 w-4 rounded border-[var(--input-border)]"
                    />
                    <span>{role.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : activeAccount ? (
          <div className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--text-secondary)]">
            Доступ к этому ящику настраивает владелец.
          </div>
        ) : null}
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
          <div className="grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {accountDetailsLoading ? (
              <div className="rounded-xl border border-dashed border-[var(--card-border)] p-6 text-sm text-[var(--text-muted)]">
                Загружаем папки выбранного ящика...
              </div>
            ) : activeAccount?.folders.length ? (
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
                    <FolderColorPicker defaultValue={folder.color} compact />
                    <button
                      type="submit"
                      className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
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
            <div className="mt-2">
              <FolderColorPicker defaultValue="#6b7280" />
            </div>
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
            {accountDetailsLoading ? (
              <div className="rounded-xl border border-dashed border-[var(--card-border)] p-6 text-sm text-[var(--text-muted)]">
                Загружаем правила выбранного ящика...
              </div>
            ) : rules.length > 0 ? (
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
                  Кому или копия содержит
                  <input
                    name="conditionToCc"
                    placeholder="order@example.ru или Клиника"
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
                <label className="grid gap-1 text-xs font-medium text-[var(--text-muted)]">
                  Название вложения содержит
                  <input
                    name="conditionAttachmentName"
                    placeholder="stl, ply, договор"
                    className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-normal text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Если заполнено несколько условий, правило сработает по любому из них.
              </p>
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
                <label className="flex items-center gap-3">
                  <input name="stopProcessing" type="checkbox" className="h-4 w-4 rounded border-[var(--input-border)]" />
                  Не применять остальные правила
                </label>
                <label className="grid gap-1 text-xs font-medium text-[var(--text-muted)]">
                  Переслать на адреса
                  <input
                    name="forwardTo"
                    placeholder="main@digitaldemon.studio"
                    className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-normal text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
                  />
                </label>
                <label className="grid gap-2 rounded-xl border border-[var(--card-border)] p-3">
                  <span className="flex items-center gap-3">
                    <input name="moveToFolder" type="checkbox" className="h-4 w-4 rounded border-[var(--input-border)]" />
                    Положить в папку
                  </span>
                  <select
                    name="moveToFolderId"
                    value={ruleFolderChoice}
                    onChange={(event) => setRuleFolderChoice(event.target.value)}
                    className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none"
                  >
                    <option value="">Выберите папку</option>
                    <option value={NEW_FOLDER_VALUE}>+ Новая папка</option>
                    {activeAccount?.folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {mailFolderDisplayName(folder)}
                      </option>
                    ))}
                  </select>
                  {ruleFolderChoice === NEW_FOLDER_VALUE ? (
                    <input
                      name="newFolderName"
                      placeholder="Название новой папки"
                      className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
                    />
                  ) : null}
                </label>
                <label className="grid gap-2 rounded-xl border border-[var(--card-border)] p-3">
                  <span className="flex items-center gap-3">
                    <input name="setLabel" type="checkbox" className="h-4 w-4 rounded border-[var(--input-border)]" />
                    Поставить метку
                  </span>
                  <select
                    name="labelId"
                    value={ruleLabelChoice}
                    onChange={(event) => setRuleLabelChoice(event.target.value)}
                    className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none"
                  >
                    <option value="">Выберите метку</option>
                    <option value={NEW_LABEL_VALUE}>+ Новая метка</option>
                    {activeAccount?.labels.map((label) => (
                      <option key={label.id} value={label.id}>
                        {label.name}
                      </option>
                    ))}
                  </select>
                  {ruleLabelChoice === NEW_LABEL_VALUE ? (
                    <input
                      name="newLabelName"
                      placeholder="Название новой метки"
                      className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
                    />
                  ) : null}
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
