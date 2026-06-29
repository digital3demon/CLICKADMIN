"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EmailReplyTemplateAssetsPanel,
  uploadReplyTemplateAssetFile,
  type ReplyTemplateAssetItem,
} from "@/components/mail/EmailReplyTemplateAssetsPanel";
import { MailReplyTemplatePreview } from "@/components/mail/MailReplyTemplatePreview";
import { ReplyTemplateBlockEditor, type ReplyTemplateBlockEditorHandle } from "@/components/mail/ReplyTemplateBlockEditor";
import {
  createClickLabPreset,
  type ReplyEditorDocument,
  type ReplyLayoutType,
} from "@/lib/mail/reply-block-editor";
import {
  MailHtmlTemplateEditor,
  type MailHtmlTemplateEditorHandle,
} from "@/components/mail/MailHtmlTemplateEditor";
import { EmailReplyTemplatePlaceholderBar } from "@/components/mail/EmailReplyTemplatePlaceholderBar";
import { insertTokenIntoControlledInput } from "@/lib/mail/insert-template-token";
import {
  restoreReplyTemplateCidsFromPreview,
  substituteReplyTemplateCidsForPreview,
} from "@/lib/mail/reply-template-cid";
import type { MailAccount, MailFolder } from "@/components/mail/types";
import { mailFolderDisplayName } from "@/components/mail/types";
import { ALL_USER_ROLES, USER_ROLE_LABELS } from "@/lib/user-role-labels";

const NEW_FOLDER_VALUE = "__new_folder__";
const NEW_LABEL_VALUE = "__new_label__";

function replyTemplateAssetPreviewUrl(accountId: string, assetId: string): string {
  return `/api/mail/accounts/${encodeURIComponent(accountId)}/reply-template/assets/${encodeURIComponent(assetId)}?inline=1`;
}

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

async function jsonFetch<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 20_000,
): Promise<T> {
  const timeoutController = new AbortController();
  const timer = window.setTimeout(() => timeoutController.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: init?.signal ?? timeoutController.signal,
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    if (init?.signal?.aborted) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Сервер не ответил вовремя. Попробуйте обновить страницу.");
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
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
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountDetailsLoading, setAccountDetailsLoading] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [selectedAccessRoles, setSelectedAccessRoles] = useState<string[]>(["OWNER"]);
  const [selectedSettingsRoles, setSelectedSettingsRoles] = useState<string[]>([]);
  const [hoverPreviewEnabled, setHoverPreviewEnabled] = useState(true);
  const [accessSaving, setAccessSaving] = useState(false);
  const [ruleFolderChoice, setRuleFolderChoice] = useState("");
  const [ruleLabelChoice, setRuleLabelChoice] = useState("");
  const [showAllCustomFolders, setShowAllCustomFolders] = useState(false);
  const [replySubjectTemplate, setReplySubjectTemplate] = useState("");
  const [replyHtmlTemplate, setReplyHtmlTemplate] = useState("");
  const [replyLayoutType, setReplyLayoutType] = useState<ReplyLayoutType>("blocks");
  const [replyEditorDocument, setReplyEditorDocument] = useState<ReplyEditorDocument>(
    () => createClickLabPreset(),
  );
  const [replySelectedBlockId, setReplySelectedBlockId] = useState<string | null>(null);
  const [replyTemplateLoading, setReplyTemplateLoading] = useState(false);
  const [replyTemplateSaving, setReplyTemplateSaving] = useState(false);
  const [replyTemplateSaveHint, setReplyTemplateSaveHint] = useState<string | null>(
    null,
  );
  const [replyTemplateSaveHintKind, setReplyTemplateSaveHintKind] = useState<
    "info" | "success" | "error"
  >("info");
  const replyTemplateSaveHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const replySubjectInputRef = useRef<HTMLInputElement>(null);
  const replySubjectSelectionRef = useRef({ start: 0, end: 0 });
  const replyEditorRef = useRef<MailHtmlTemplateEditorHandle>(null);
  const replyBlockEditorRef = useRef<ReplyTemplateBlockEditorHandle>(null);
  const replyTemplateAssetsRef = useRef<ReplyTemplateAssetItem[]>([]);
  const [replyTemplateAssets, setReplyTemplateAssets] = useState<ReplyTemplateAssetItem[]>(
    [],
  );
  const accessDraftAccountIdRef = useRef("");

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? accounts[0] ?? null,
    [accountId, accounts],
  );

  const loadAccounts = useCallback(async () => {
    setError("");
    setAccountsLoading(true);
    try {
      const accountsData = await jsonFetch<{
        accounts: MailAccount[];
        currentUser?: { role?: string };
      }>("/api/mail/accounts?lite=1&forSettings=1");
      setAccounts(accountsData.accounts);
      setCurrentUserRole(accountsData.currentUser?.role || "");
      setAccountId((prev) =>
        prev && accountsData.accounts.some((account) => account.id === prev)
          ? prev
          : accountsData.accounts[0]?.id || "",
      );
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const loadAccountDetails = useCallback(async (nextAccountId: string, signal?: AbortSignal) => {
    if (!nextAccountId) return;
    setAccountDetailsLoading(true);
    try {
      const data = await jsonFetch<{ accounts: MailAccount[] }>(
        "/api/mail/accounts?tree=1&forSettings=1",
        { signal },
      );
      const account = data.accounts.find((item) => item.id === nextAccountId);
      if (!account) return;
      setAccounts((prev) =>
        prev.map((item) =>
          item.id === nextAccountId
            ? {
                ...item,
                folders: account.folders,
                labels: account.labels,
                canManageSettings: account.canManageSettings ?? item.canManageSettings,
              }
            : item,
        ),
      );
    } finally {
      setAccountDetailsLoading(false);
    }
  }, []);

  const loadRules = useCallback(async (nextAccountId: string, signal?: AbortSignal) => {
    if (!nextAccountId) {
      setRules([]);
      return;
    }
    const rulesData = await jsonFetch<{ rules: EmailRule[] }>(
      `/api/mail/rules?accountId=${encodeURIComponent(nextAccountId)}`,
      { signal },
    );
    setRules(rulesData.rules);
  }, []);

  const canManageAccountAccess = currentUserRole === "OWNER";
  const canManageMailSettings = activeAccount?.canManageSettings === true;

  const customFolderCount = activeAccount?.folders.filter((folder) => folder.type === "CUSTOM").length ?? 0;
  const visibleFolders = useMemo(() => {
    if (!activeAccount?.folders.length) return [];
    const system = activeAccount.folders.filter((folder) => folder.type !== "CUSTOM");
    const custom = activeAccount.folders.filter((folder) => folder.type === "CUSTOM");
    if (showAllCustomFolders || custom.length <= 8) return [...system, ...custom];
    return [...system, ...custom.slice(0, 8)];
  }, [activeAccount, showAllCustomFolders]);
  const hiddenCustomFolderCount =
    showAllCustomFolders || customFolderCount <= 8 ? 0 : customFolderCount - 8;

  useEffect(() => {
    if (!activeAccount) return;
    if (accessDraftAccountIdRef.current === activeAccount.id) return;
    accessDraftAccountIdRef.current = activeAccount.id;
    setSelectedAccessRoles(Array.from(new Set(["OWNER", ...(activeAccount.allowedRoles || [])])));
    setSelectedSettingsRoles(Array.from(new Set(activeAccount.settingsRoles || [])));
    setHoverPreviewEnabled(activeAccount.hoverPreviewEnabled ?? true);
    setShowAllCustomFolders(false);
  }, [activeAccount]);

  useEffect(() => {
    void loadAccounts().catch((err) =>
      setError(err instanceof Error ? err.message : "Ошибка загрузки настроек почты"),
    );
  }, [loadAccounts]);

  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadAccountDetails(accountId, controller.signal).catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Ошибка загрузки папок и меток");
      });
    }, 80);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [accountId, loadAccountDetails]);

  useEffect(() => {
    if (!accountId) {
      setRules([]);
      setRulesLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setRulesLoading(true);
    const timer = window.setTimeout(() => {
      void loadRules(accountId, controller.signal)
        .catch((err) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : "Ошибка загрузки правил");
        })
        .finally(() => {
          if (!cancelled) setRulesLoading(false);
        });
    }, 1200);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [accountId, loadRules]);

  useEffect(() => {
    if (!accountId || !canManageMailSettings) {
      setReplySubjectTemplate("");
      setReplyHtmlTemplate("");
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setReplyTemplateLoading(true);
    void Promise.all([
      jsonFetch<{
        template: {
          subjectTemplate: string;
          htmlTemplate: string;
          layoutType?: ReplyLayoutType;
          editorDocument?: ReplyEditorDocument | null;
        } | null;
      }>(
        `/api/mail/accounts/${encodeURIComponent(accountId)}/reply-template`,
        { signal: controller.signal },
      ),
      jsonFetch<{ assets: ReplyTemplateAssetItem[] }>(
        `/api/mail/accounts/${encodeURIComponent(accountId)}/reply-template/assets`,
        { signal: controller.signal },
      ).catch(() => ({ assets: [] as ReplyTemplateAssetItem[] })),
    ])
      .then(([data, assetsData]) => {
        if (cancelled) return;
        const assets = assetsData.assets ?? [];
        replyTemplateAssetsRef.current = assets;
        setReplyTemplateAssets(assets);
        setReplySubjectTemplate(data.template?.subjectTemplate ?? "");
        const layout = data.template?.layoutType ?? "blocks";
        setReplyLayoutType(layout);
        if (layout === "blocks") {
          setReplyEditorDocument(data.template?.editorDocument ?? createClickLabPreset());
        }
        const rawHtml =
          data.template?.htmlTemplate ??
          "<p>Здравствуйте!</p><p>Ваш наряд {{orderNumber}} принят в работу.</p>";
        setReplyHtmlTemplate(
          substituteReplyTemplateCidsForPreview(rawHtml, assets, accountId),
        );
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Ошибка загрузки шаблона ответа");
      })
      .finally(() => {
        if (!cancelled) setReplyTemplateLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accountId, canManageMailSettings]);

  const uploadReplyTemplateAsset = useCallback(
    async (file: File): Promise<ReplyTemplateAssetItem | null> => {
      if (!activeAccount) return null;
      return uploadReplyTemplateAssetFile(activeAccount.id, file);
    },
    [activeAccount],
  );

  const insertReplySubjectToken = useCallback(
    (token: string) => {
      const input = replySubjectInputRef.current;
      const start = input?.selectionStart ?? replySubjectSelectionRef.current.start;
      const end = input?.selectionEnd ?? replySubjectSelectionRef.current.end;
      const { nextValue, caret } = insertTokenIntoControlledInput(
        replySubjectTemplate,
        start,
        end,
        token,
      );
      setReplySubjectTemplate(nextValue);
      replySubjectSelectionRef.current = { start: caret, end: caret };
      requestAnimationFrame(() => {
        input?.focus();
        input?.setSelectionRange(caret, caret);
      });
    },
    [replySubjectTemplate],
  );

  async function saveReplyTemplate() {
    if (!activeAccount) return;
    if (replyTemplateSaveHintTimerRef.current) {
      clearTimeout(replyTemplateSaveHintTimerRef.current);
      replyTemplateSaveHintTimerRef.current = null;
    }
    setReplyTemplateSaving(true);
    setReplyTemplateSaveHint("Сохраняю…");
    setReplyTemplateSaveHintKind("info");
    try {
      const body: Record<string, unknown> = {
        subjectTemplate: replySubjectTemplate,
        layoutType: replyLayoutType,
      };
      if (replyLayoutType === "blocks") {
        body.editorDocument =
          replyBlockEditorRef.current?.flushPendingChanges() ?? replyEditorDocument;
      } else {
        const htmlForSave = restoreReplyTemplateCidsFromPreview(
          replyHtmlTemplate,
          replyTemplateAssetsRef.current,
          activeAccount.id,
        );
        body.htmlTemplate = htmlForSave;
      }
      await jsonFetch(`/api/mail/accounts/${activeAccount.id}/reply-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setReplyTemplateSaveHint("Шаблон сохранён");
      setReplyTemplateSaveHintKind("success");
      replyTemplateSaveHintTimerRef.current = setTimeout(() => {
        setReplyTemplateSaveHint(null);
        replyTemplateSaveHintTimerRef.current = null;
      }, 4000);
    } catch (err) {
      setReplyTemplateSaveHint(
        err instanceof Error ? err.message : "Не удалось сохранить шаблон",
      );
      setReplyTemplateSaveHintKind("error");
    } finally {
      setReplyTemplateSaving(false);
    }
  }

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
    const confirmText =
      `Удалить ящик «${label}» из CRM?\n\n` +
      `Будут удалены все письма, папки, метки и правила этого ящика в базе CRM. ` +
      `Письма в Яндекс.Почте останутся. После удаления подключите ящик заново — синхронизация начнётся с чистой копии.`;
    if (!window.confirm(confirmText)) return;

    setError("");
    setStatus("Удаляю ящик и копию писем в CRM…");
    try {
      await jsonFetch(`/api/mail/accounts/${account.id}`, { method: "DELETE" });
      setStatus("Ящик удалён из CRM");
      accessDraftAccountIdRef.current = "";
      setAccountId((prev) => (prev === account.id ? "" : prev));
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить ящик");
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

  function toggleSettingsRole(role: string): void {
    if (role === "OWNER") return;
    setSelectedSettingsRoles((prev) => {
      const roles = new Set(prev);
      if (roles.has(role)) {
        roles.delete(role);
      } else {
        roles.add(role);
      }
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
      const settingsRoles = Array.from(new Set(selectedSettingsRoles));
      await jsonFetch(`/api/mail/accounts/${activeAccount.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedRoles, settingsRoles, hoverPreviewEnabled }),
      });
      setStatus("Настройки ящика обновлены");
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === activeAccount.id
            ? { ...account, allowedRoles, settingsRoles, hoverPreviewEnabled }
            : account,
        ),
      );
      accessDraftAccountIdRef.current = activeAccount.id;
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
      {accountsLoading ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Загружаем список ящиков…
        </div>
      ) : null}
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
                  Удалить ящик из CRM
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
                  Отметьте роли для доступа к письмам и отдельно — для редактирования настроек почты.
                </p>
              </div>
              <button
                type="button"
                disabled={accessSaving}
                onClick={() => void saveAccountAccess()}
                className="rounded-xl bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:cursor-wait disabled:opacity-60"
              >
                {accessSaving ? "Сохраняю..." : "Сохранить настройки"}
              </button>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Доступ к письмам
                </h4>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Просмотр, синхронизация и отправка писем.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {MAIL_ROLE_OPTIONS.map((role) => {
                    const isOwnerRole = role.value === "OWNER";
                    const checked = isOwnerRole || selectedAccessRoles.includes(role.value);
                    return (
                      <label
                        key={`access-${role.value}`}
                        className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--app-text)]"
                      >
                        <input
                          type="checkbox"
                          name="allowedRoles"
                          value={role.value}
                          checked={checked}
                          disabled={isOwnerRole || accessSaving}
                          onChange={() => toggleAccessRole(role.value)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-4 w-4 shrink-0 rounded border-[var(--input-border)]"
                        />
                        <span>{role.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Настройки почты
                </h4>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Отмеченные роли смогут настраивать этот ящик в разделе «Конфигурация →
                  Почта». Владелец всегда имеет полный доступ.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {MAIL_ROLE_OPTIONS.filter((role) => role.value !== "OWNER").map((role) => {
                    const checked = selectedSettingsRoles.includes(role.value);
                    return (
                      <label
                        key={`settings-${role.value}`}
                        className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--app-text)]"
                      >
                        <input
                          type="checkbox"
                          name="settingsRoles"
                          value={role.value}
                          checked={checked}
                          disabled={accessSaving}
                          onChange={() => toggleSettingsRole(role.value)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-4 w-4 shrink-0 rounded border-[var(--input-border)]"
                        />
                        <span>{role.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-3 text-sm text-[var(--app-text)]">
              <input
                type="checkbox"
                checked={hoverPreviewEnabled}
                disabled={accessSaving}
                onChange={(event) => setHoverPreviewEnabled(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[var(--input-border)]"
              />
              <span>
                <span className="block font-medium">Показывать предпросмотр письма при наведении</span>
                <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                  В списке писем появится небольшая подсказка около курсора: текст письма и количество вложений.
                </span>
              </span>
            </label>
            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--app-text)]">Удалить ящик из CRM</h4>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Удаляются все письма, папки, метки и правила этой копии в CRM. В Яндекс.Почте письма останутся.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteAccount(activeAccount)}
                  className="rounded-xl border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-300"
                >
                  Удалить ящик
                </button>
              </div>
            </div>
          </div>
        ) : activeAccount ? (
          <div className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--text-secondary)]">
            Настройки правил и шаблонов для этого ящика недоступны. Нужна галочка «Конфиг:
            почта» в матрице доступа или отметка вашей роли в колонке «Настройки почты» (её
            выставляет владелец).
          </div>
        ) : null}
      </section>

      {canManageMailSettings && activeAccount ? (
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--app-text)]">
            Шаблон ответа
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Отправляется на выбранное письмо после сохранения наряда из почты (если включён ответ).
            Кнопки вставляют поле из наряда при отправке. Плейсхолдеры:{" "}
            <code className="text-xs">{"{{orderNumber}}"}</code>,{" "}
            <code className="text-xs">{"{{clinicAddress}}"}</code>,{" "}
            <code className="text-xs">{"{{patientName}}"}</code>,{" "}
            <code className="text-xs">{"{{doctorName}}"}</code>,{" "}
            <code className="text-xs">{"{{clinicName}}"}</code>,{" "}
            <code className="text-xs">{"{{date}}"}</code>,{" "}
            <code className="text-xs">{"{{dueDate}}"}</code>,{" "}
            <code className="text-xs">{"{{appointmentDate}}"}</code>,{" "}
            <code className="text-xs">{"{{originalSubject}}"}</code>,{" "}
            <code className="text-xs">{"{{orderStatusUrl}}"}</code>.
          </p>
          {replyTemplateLoading ? (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Загрузка шаблона…</p>
          ) : (
            <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] xl:items-start">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={replyTemplateSaving}
                    onClick={() => setReplyLayoutType("blocks")}
                    className={[
                      "rounded-lg px-3 py-1.5 text-xs font-semibold",
                      replyLayoutType === "blocks"
                        ? "bg-[var(--sidebar-blue)] text-white"
                        : "border border-[var(--card-border)] hover:bg-[var(--surface-hover)]",
                    ].join(" ")}
                  >
                    Блочный редактор
                  </button>
                  <button
                    type="button"
                    disabled={replyTemplateSaving}
                    onClick={() => setReplyLayoutType("freeform")}
                    className={[
                      "rounded-lg px-3 py-1.5 text-xs font-semibold",
                      replyLayoutType === "freeform"
                        ? "bg-[var(--sidebar-blue)] text-white"
                        : "border border-[var(--card-border)] hover:bg-[var(--surface-hover)]",
                    ].join(" ")}
                  >
                    Простой HTML
                  </button>
                </div>
                <label className="block text-sm font-medium text-[var(--app-text)]">
                  Тема письма
                  <input
                    ref={replySubjectInputRef}
                    value={replySubjectTemplate}
                    onChange={(e) => setReplySubjectTemplate(e.target.value)}
                    onSelect={(e) => {
                      replySubjectSelectionRef.current = {
                        start: e.currentTarget.selectionStart ?? 0,
                        end: e.currentTarget.selectionEnd ?? 0,
                      };
                    }}
                    onClick={(e) => {
                      replySubjectSelectionRef.current = {
                        start: e.currentTarget.selectionStart ?? 0,
                        end: e.currentTarget.selectionEnd ?? 0,
                      };
                    }}
                    placeholder="Пусто — Re: исходная тема"
                    className="mt-1 h-11 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--app-text)] outline-none"
                  />
                </label>
                <EmailReplyTemplatePlaceholderBar
                  disabled={replyTemplateSaving}
                  onInsert={insertReplySubjectToken}
                />
                {replyLayoutType === "blocks" ? (
                  <ReplyTemplateBlockEditor
                    ref={replyBlockEditorRef}
                    document={replyEditorDocument}
                    onChange={setReplyEditorDocument}
                    disabled={replyTemplateSaving}
                    selectedBlockId={replySelectedBlockId}
                    onSelectedBlockIdChange={setReplySelectedBlockId}
                    assets={replyTemplateAssets.map((a) => ({
                      id: a.id,
                      fileName: a.fileName,
                      kind: a.kind,
                    }))}
                    onUploadImage={uploadReplyTemplateAsset}
                  />
                ) : (
                  <div className="block text-sm font-medium text-[var(--app-text)]">
                    Текст письма
                    <div className="mt-1 space-y-2">
                      <EmailReplyTemplatePlaceholderBar
                        disabled={replyTemplateSaving}
                        onInsert={(token) => replyEditorRef.current?.insertText(token)}
                      />
                      <MailHtmlTemplateEditor
                        ref={replyEditorRef}
                        value={replyHtmlTemplate}
                        onChange={setReplyHtmlTemplate}
                        disabled={replyTemplateSaving}
                        placeholder="Здравствуйте! Ваш наряд {{orderNumber}} принят в работу."
                        onUploadImageFile={async (file) => {
                          const asset = await uploadReplyTemplateAsset(file);
                          if (!asset) return null;
                          if (
                            !replyTemplateAssetsRef.current.some((a) => a.id === asset.id)
                          ) {
                            replyTemplateAssetsRef.current = [
                              ...replyTemplateAssetsRef.current,
                              asset,
                            ];
                            setReplyTemplateAssets([...replyTemplateAssetsRef.current]);
                          }
                          return {
                            contentId: asset.contentId,
                            previewUrl: replyTemplateAssetPreviewUrl(
                              activeAccount.id,
                              asset.id,
                            ),
                          };
                        }}
                      />
                    </div>
                  </div>
                )}
                {activeAccount ? (
                  <EmailReplyTemplateAssetsPanel
                    accountId={activeAccount.id}
                    disabled={replyTemplateSaving}
                    onInsertImage={(contentId, alt) => {
                      const asset = replyTemplateAssetsRef.current.find(
                        (a) => a.contentId === contentId,
                      );
                      replyEditorRef.current?.insertCidImage(contentId, alt, {
                        previewUrl: asset
                          ? replyTemplateAssetPreviewUrl(activeAccount.id, asset.id)
                          : null,
                      });
                    }}
                    onUploadImageFile={async (file) => {
                      const asset = await uploadReplyTemplateAsset(file);
                      if (
                        asset &&
                        !replyTemplateAssetsRef.current.some((a) => a.id === asset.id)
                      ) {
                        replyTemplateAssetsRef.current = [
                          ...replyTemplateAssetsRef.current,
                          asset,
                        ];
                        setReplyTemplateAssets([...replyTemplateAssetsRef.current]);
                      }
                      return asset;
                    }}
                  />
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={replyTemplateSaving}
                    onClick={() => void saveReplyTemplate()}
                    className="rounded-xl bg-[var(--sidebar-blue)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-50"
                  >
                    {replyTemplateSaving ? "Сохранение…" : "Сохранить шаблон"}
                  </button>
                  {replyTemplateSaveHint ? (
                    <span
                      className={[
                        "text-sm font-medium",
                        replyTemplateSaveHintKind === "success"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : replyTemplateSaveHintKind === "error"
                            ? "text-red-600 dark:text-red-300"
                            : "text-[var(--text-secondary)]",
                      ].join(" ")}
                      role="status"
                      aria-live="polite"
                    >
                      {replyTemplateSaveHint}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="min-w-0 xl:sticky xl:top-4">
                <MailReplyTemplatePreview
                  subjectTemplate={replySubjectTemplate}
                  htmlTemplate={replyHtmlTemplate}
                  layoutType={replyLayoutType}
                  editorDocument={replyEditorDocument}
                  accountId={activeAccount.id}
                  assets={replyTemplateAssets.map((a) => ({
                    id: a.id,
                    contentId: a.contentId,
                  }))}
                  selectedBlockId={replySelectedBlockId}
                  onSelectBlockId={setReplySelectedBlockId}
                  disabled={replyTemplateSaving}
                />
              </div>
            </div>
          )}
        </section>
      ) : null}

      {canManageMailSettings ? (
      <>
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
                Загружаем папки выбранного ящика…
              </div>
            ) : activeAccount?.folders.length ? (
              <>
                {visibleFolders.map((folder) => {
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
              })}
                {hiddenCustomFolderCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllCustomFolders(true)}
                    className="rounded-xl border border-dashed border-[var(--card-border)] px-4 py-3 text-sm text-[var(--sidebar-blue)] hover:bg-[var(--surface-hover)]"
                  >
                    Показать ещё {hiddenCustomFolderCount} пользовательских папок
                  </button>
                ) : null}
              </>
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
            {rulesLoading ? (
              <div className="rounded-xl border border-dashed border-[var(--card-border)] p-6 text-sm text-[var(--text-muted)]">
                Загружаем правила выбранного ящика…
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
      </>
      ) : null}
    </div>
  );
}
