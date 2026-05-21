"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { MailComposer } from "@/components/mail/MailComposer";
import { MailHeader } from "@/components/mail/MailHeader";
import { MailList } from "@/components/mail/MailList";
import { MailSidebar } from "@/components/mail/MailSidebar";
import { MailViewer } from "@/components/mail/MailViewer";
import { useNewOrderPanel } from "@/components/orders/new-order-panel-context";
import type {
  MailAccount,
  MailEmailDetail,
  MailEmailRow,
  MailFilter,
  MailFolder,
  MailLabel,
} from "@/components/mail/types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function mailErrorMessage(value: unknown, fallback = "Ошибка почты"): string {
  const raw = value instanceof Error ? value.message : typeof value === "string" ? value : "";
  const message = raw.trim();
  if (!message) return fallback;
  const lower = message.toLowerCase();
  if (
    lower.includes("connection not available") ||
    lower.includes("socket closed") ||
    lower.includes("connection closed") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout")
  ) {
    return "Нет подключения к почтовому серверу. Синхронизация повторится автоматически.";
  }
  if (lower.includes("mail_account_password_not_configured")) {
    return "Для ящика не задан пароль приложения.";
  }
  if (lower.includes("authentication") || lower.includes("invalid credentials")) {
    return "Почтовый сервер не принял пароль приложения. Проверьте пароль в настройках почты.";
  }
  return message;
}

function inboxFolder(account: MailAccount | null): MailFolder | null {
  if (!account) return null;
  return (
    account.folders.find((f) => f.type === "INBOX") ??
    account.folders.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0] ??
    null
  );
}

function mergeEmailRows(fresh: MailEmailRow[], existing: MailEmailRow[]): MailEmailRow[] {
  const freshIds = new Set(fresh.map((email) => email.id));
  return [...fresh, ...existing.filter((email) => !freshIds.has(email.id))];
}

const MAIL_UI_SCALE = 0.85;
const MAIL_UI_SCALE_STYLE: CSSProperties & { zoom: number } = {
  zoom: MAIL_UI_SCALE,
  width: `${100 / MAIL_UI_SCALE}%`,
  height: `calc(100dvh / ${MAIL_UI_SCALE})`,
  minHeight: `calc(100dvh / ${MAIL_UI_SCALE})`,
};
const LAST_MAIL_ACCOUNT_STORAGE_KEY = "dental-crm:last-mail-account-id";
const MAIL_DB_REFRESH_INTERVAL_MS = 15_000;
const MAIL_ACTIVE_SYNC_INTERVAL_MS = 60_000;

function readLastMailAccountId(): string {
  try {
    return window.localStorage.getItem(LAST_MAIL_ACCOUNT_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeLastMailAccountId(accountId: string): void {
  try {
    if (accountId) window.localStorage.setItem(LAST_MAIL_ACCOUNT_STORAGE_KEY, accountId);
  } catch {
    /* localStorage can be unavailable in private contexts. */
  }
}

export function MailLayout() {
  const { open: openNewOrder, canOpen: canOpenNewOrder, canCreate: canCreateOrder } = useNewOrderPanel();
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [activeAccountId, setActiveAccountId] = useState("");
  const [activeFolderId, setActiveFolderId] = useState("");
  const [activeLabelId, setActiveLabelId] = useState("");
  const [emails, setEmails] = useState<MailEmailRow[]>([]);
  const [activeEmailId, setActiveEmailId] = useState("");
  const [detail, setDetail] = useState<MailEmailDetail | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<MailFilter>("all");
  const [search, setSearch] = useState("");
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSeed, setComposerSeed] = useState({ to: "", subject: "", html: "" });
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [error, setError] = useState("");
  const listQueryKeyRef = useRef("");
  const listHasRowsRef = useRef(false);
  const syncInFlightRef = useRef(false);

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === activeAccountId) ?? null,
    [accounts, activeAccountId],
  );
  const activeFolder = useMemo(
    () => activeAccount?.folders.find((f) => f.id === activeFolderId) ?? null,
    [activeAccount, activeFolderId],
  );
  const activeLabel = useMemo(
    () => activeAccount?.labels.find((label) => label.id === activeLabelId) ?? null,
    [activeAccount, activeLabelId],
  );
  const canConnectAccount = currentUserRole === "OWNER";
  const listQueryKey = useMemo(
    () => JSON.stringify({
      accountId: activeAccountId,
      folderId: activeFolderId,
      labelId: activeLabelId,
      filter,
      search: search.trim(),
    }),
    [activeAccountId, activeFolderId, activeLabelId, filter, search],
  );

  const loadAccounts = useCallback(async () => {
    const data = await jsonFetch<{ accounts: MailAccount[]; currentUser?: { role: string } }>("/api/mail/accounts");
    setAccounts(data.accounts);
    setCurrentUserRole(data.currentUser?.role ?? "");
    setActiveAccountId((prev) => {
      if (prev && data.accounts.some((account) => account.id === prev)) return prev;
      const saved = readLastMailAccountId();
      if (saved && data.accounts.some((account) => account.id === saved)) return saved;
      return data.accounts[0]?.id || "";
    });
  }, []);

  const loadEmails = useCallback(async (cursor: string | null = null, append = false) => {
    if (!activeAccountId) return;
    const sameQuery = listQueryKeyRef.current === listQueryKey;
    if (!append && !sameQuery) {
      listHasRowsRef.current = false;
      setEmails([]);
      setNextCursor(null);
    }
    if (append) setLoadingMore(true);
    else setLoadingEmails(!listHasRowsRef.current);
    setError("");
    try {
      const params = new URLSearchParams({
        accountId: activeAccountId,
        filter,
        take: "80",
      });
      if (activeFolderId) params.set("folderId", activeFolderId);
      if (activeLabelId) params.set("labelId", activeLabelId);
      if (search.trim()) params.set("q", search.trim());
      if (cursor) params.set("cursor", cursor);
      const data = await jsonFetch<{ emails: MailEmailRow[]; nextCursor: string | null }>(
        `/api/mail/emails?${params.toString()}`,
      );
      listQueryKeyRef.current = listQueryKey;
      setEmails((prev) => {
        const next = append
          ? mergeEmailRows(prev, data.emails)
          : sameQuery
            ? mergeEmailRows(data.emails, prev)
            : data.emails;
        listHasRowsRef.current = next.length > 0;
        return next;
      });
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(mailErrorMessage(err, "Ошибка загрузки писем"));
    } finally {
      if (append) setLoadingMore(false);
      else setLoadingEmails(false);
    }
  }, [activeAccountId, activeFolderId, activeLabelId, filter, search, listQueryKey]);

  const refreshEmailsSilently = useCallback(async () => {
    if (!activeAccountId) return;
    try {
      const params = new URLSearchParams({
        accountId: activeAccountId,
        filter,
        take: "80",
      });
      if (activeFolderId) params.set("folderId", activeFolderId);
      if (activeLabelId) params.set("labelId", activeLabelId);
      if (search.trim()) params.set("q", search.trim());
      const data = await jsonFetch<{ emails: MailEmailRow[]; nextCursor: string | null }>(
        `/api/mail/emails?${params.toString()}`,
      );
      setEmails((prev) => {
        const next = mergeEmailRows(data.emails, prev);
        listHasRowsRef.current = next.length > 0;
        return next;
      });
      setNextCursor((prev) => prev ?? data.nextCursor);
    } catch {
      /* Тихое обновление не должно мешать чтению письма. */
    }
  }, [activeAccountId, activeFolderId, activeLabelId, filter, search]);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setError("");
    try {
      const data = await jsonFetch<{ email: MailEmailDetail }>(`/api/mail/emails/${id}`);
      setDetail(data.email);
      setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, isRead: true } : e)));
    } catch (err) {
      setError(mailErrorMessage(err, "Ошибка открытия письма"));
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts().catch((err) => setError(mailErrorMessage(err, "Ошибка")));
  }, [loadAccounts]);

  useEffect(() => {
    if (!activeAccount) return;
    if (activeLabelId && activeAccount.labels.some((label) => label.id === activeLabelId)) return;
    if (activeLabelId) setActiveLabelId("");
    const folder = inboxFolder(activeAccount);
    setActiveFolderId((prev) =>
      prev && activeAccount.folders.some((f) => f.id === prev) ? prev : folder?.id || "",
    );
  }, [activeAccount, activeLabelId]);

  useEffect(() => {
    writeLastMailAccountId(activeAccountId);
  }, [activeAccountId]);

  useEffect(() => {
    setNextCursor(null);
    void loadEmails(null, false);
  }, [loadEmails]);

  useEffect(() => {
    if (!activeAccountId) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshEmailsSilently();
    }, MAIL_DB_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [activeAccountId, refreshEmailsSilently]);

  const syncActive = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!activeAccountId || syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    if (!options.silent) {
      setSyncing(true);
      setError("");
      setSyncStatus("Проверяем новые письма...");
    }
    try {
      const data = await jsonFetch<{
        status?: string;
        lastError?: string | null;
        queued?: boolean;
        rulesApply?: { skipped: boolean; processed: number; updated: number; labelsTouched: number };
      }>(`/api/mail/accounts/${activeAccountId}/sync`, { method: "POST" });
      if (!options.silent) {
        if (data.status === "FAILED") {
          setSyncStatus("");
          setError(mailErrorMessage(data.lastError, "Синхронизация завершилась ошибкой"));
        } else if (data.queued) {
          setSyncStatus("Синхронизация в очереди");
        } else if (data.rulesApply && !data.rulesApply.skipped) {
          setSyncStatus(
            `Синхронизация завершена. Правила проверили ${data.rulesApply.processed} писем, обновили ${data.rulesApply.updated}.`,
          );
        }
      }
      await loadAccounts();
      await refreshEmailsSilently();
    } catch (err) {
      if (!options.silent) setError(mailErrorMessage(err, "Ошибка синхронизации"));
    } finally {
      syncInFlightRef.current = false;
      if (!options.silent) setSyncing(false);
    }
  }, [activeAccountId, loadAccounts, refreshEmailsSilently]);

  useEffect(() => {
    if (!activeAccountId) return;
    const run = () => {
      if (document.visibilityState !== "visible") return;
      void syncActive({ silent: true });
    };
    run();
    const timer = window.setInterval(run, MAIL_ACTIVE_SYNC_INTERVAL_MS);
    window.addEventListener("focus", run);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", run);
    };
  }, [activeAccountId, syncActive]);

  useEffect(() => {
    if (!activeAccountId) return;
    let cancelled = false;
    async function loadSyncStatus() {
      try {
        const data = await jsonFetch<{
          jobs: Array<{ status: string; imported: number; skipped: number; lastError: string | null }>;
        }>(`/api/mail/sync/status?accountId=${encodeURIComponent(activeAccountId)}`);
        if (cancelled) return;
        const [latest] = data.jobs;
        if (!latest) return;
        if (latest.status === "QUEUED") setSyncStatus("Синхронизация в очереди");
        else if (latest.status === "RUNNING") setSyncStatus("Загружаем новые письма");
        else if (latest.status === "FAILED") setSyncStatus(mailErrorMessage(latest.lastError, "Синхронизация завершилась ошибкой"));
        else setSyncStatus(`Синхронизация завершена: ${latest.imported} новых, ${latest.skipped} пропущено`);
      } catch {
        /* status is informational */
      }
    }
    void loadSyncStatus();
    const timer = window.setInterval(() => void loadSyncStatus(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeAccountId]);

  async function bulk(
    action: "read" | "unread" | "archive" | "trash" | "delete" | "flag" | "unflag" | "move",
    ids = [...selectedIds],
    targetFolderId?: string,
  ) {
    if (!ids.length) return;
    if (action === "trash" || action === "delete") {
      const count = ids.length;
      const message =
        action === "delete"
          ? count === 1
            ? "Удалить письмо безвозвратно?"
            : `Удалить письма безвозвратно? Количество: ${count}`
          : count === 1
            ? "Удалить письмо?"
            : `Удалить письма? Количество: ${count}`;
      if (!window.confirm(message)) return;
    }
    await jsonFetch("/api/mail/emails/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, accountId: activeAccountId, targetFolderId }),
    });
    setSelectedIds(new Set());
    if (ids.includes(activeEmailId) && (action === "archive" || action === "trash" || action === "delete")) {
      setActiveEmailId("");
      setDetail(null);
    }
    await loadAccounts();
    await loadEmails(null, false);
  }

  async function markAllRead() {
    if (!activeAccountId) return;
    if (!window.confirm("Отметить все письма этого ящика прочитанными?")) return;
    setError("");
    try {
      await jsonFetch("/api/mail/emails/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [], action: "markAllRead", accountId: activeAccountId }),
      });
      await loadAccounts();
      await loadEmails(null, false);
    } catch (err) {
      setError(mailErrorMessage(err, "Не удалось отметить письма прочитанными"));
    }
  }

  function openReply(mode: "reply" | "replyAll" | "forward", html = "") {
    if (!detail) return;
    const to =
      mode === "forward"
        ? ""
        : detail.fromAddress
          ? detail.fromName
            ? `${detail.fromName} <${detail.fromAddress}>`
            : detail.fromAddress
          : "";
    const prefix = mode === "forward" ? "Fwd:" : "Re:";
    setComposerSeed({
      to,
      subject: `${prefix} ${detail.subject || ""}`.trim(),
      html: html || "<p></p>",
    });
    setComposerOpen(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : "";
    if (!activeId.startsWith("email:") || !overId.startsWith("folder:")) return;
    const emailId = activeId.slice("email:".length);
    const folderId = overId.slice("folder:".length);
    void bulk("move", [emailId], folderId).catch((err) =>
      setError(err instanceof Error ? err.message : "Ошибка перемещения"),
    );
  }

  async function saveAccount(formData: FormData) {
    if (!canConnectAccount) return;
    setSavingAccount(true);
    setError("");
    try {
      const data = await jsonFetch<{ account: MailAccount }>("/api/mail/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("mailAddress") || ""),
          displayName: "",
          appPassword: String(formData.get("yandexAppPassword") || ""),
        }),
      });
      await loadAccounts();
      setActiveAccountId(data.account.id);
      setAccountModalOpen(false);
    } catch (err) {
      setError(mailErrorMessage(err, "Не удалось добавить ящик"));
    } finally {
      setSavingAccount(false);
    }
  }

  async function createOrderFromEmailIds(ids: string[]) {
    ids = ids.filter(Boolean).slice(0, 20);
    if (!ids.length) return;
    if (!canCreateOrder) {
      setError("У вас нет прав на создание заказов");
      return;
    }
    if (!canOpenNewOrder) {
      setError("Закройте или сверните лишние окна заказов: достигнут лимит открытых заказов");
      return;
    }
    setError("");
    try {
      const details = await Promise.all(
        ids.map((id) =>
          jsonFetch<{ email: MailEmailDetail }>(`/api/mail/emails/${id}?markRead=0`).then((data) => data.email),
        ),
      );
      const opened = openNewOrder({
        sourceEmails: details.map((email) => ({
          id: email.id,
          subject: email.subject,
          fromName: email.fromName,
          fromAddress: email.fromAddress,
          receivedAt: email.receivedAt ?? email.sentAt ?? email.createdAt,
          preview: email.preview,
          textBody: email.textBody,
          safeHtmlBody: email.safeHtmlBody,
          attachments: email.attachments.map((attachment) => ({
            id: attachment.id,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            size: attachment.size,
          })),
        })),
      });
      if (!opened) {
        setError("Не удалось открыть окно нового заказа");
      }
    } catch (err) {
      setError(mailErrorMessage(err, "Не удалось открыть новый заказ из писем"));
    }
  }

  async function createOrderFromSelectedEmails() {
    const ids = emails.filter((email) => selectedIds.has(email.id)).map((email) => email.id);
    await createOrderFromEmailIds(ids);
  }

  return (
    <div
      className="flex min-w-0 flex-col overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]"
      style={MAIL_UI_SCALE_STYLE}
    >
      <MailHeader
        accounts={accounts}
        activeAccountId={activeAccountId}
        search={search}
        syncing={syncing}
        onAccountChange={(id) => {
          setActiveAccountId(id);
          setActiveLabelId("");
          setActiveEmailId("");
          setDetail(null);
          setSelectedIds(new Set());
        }}
        onSearchChange={setSearch}
        onCompose={() => {
          setComposerSeed({ to: "", subject: "", html: "" });
          setComposerOpen(true);
        }}
        onSync={() => void syncActive()}
        onConnectAccount={() => setAccountModalOpen(true)}
        canConnectAccount={canConnectAccount}
      />

      {error ? (
        <div className="border-b border-red-300/50 bg-red-500/10 px-5 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {syncStatus ? (
        <div className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-5 py-2 text-sm text-[var(--text-secondary)]">
          {syncStatus}
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
          <div className="max-w-md rounded-[28px] bg-[var(--card-bg)] p-8 text-center shadow-sm ring-1 ring-[var(--card-border)]">
            <h2 className="text-2xl font-semibold text-[var(--app-text)]">
              {canConnectAccount ? "Подключите Яндекс.Почту" : "Нет доступных почтовых ящиков"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {canConnectAccount
                ? "Подключение аккаунтов и правила обработки входящей почты находятся в конфигурации."
                : "Владелец должен открыть доступ к нужному ящику для вашей роли."}
            </p>
            {canConnectAccount ? (
              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="mt-6 rounded-2xl bg-[var(--sidebar-blue)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)]"
              >
                Добавить ящик
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <MailSidebar
              account={activeAccount}
              activeFolderId={activeFolderId}
              activeLabelId={activeLabelId}
              labels={activeAccount?.labels ?? []}
              collapsed={sidebarCollapsed}
              onCollapsedChange={setSidebarCollapsed}
              onFolderChange={(id) => {
                setActiveFolderId(id);
                setActiveLabelId("");
                setActiveEmailId("");
                setDetail(null);
                setSelectedIds(new Set());
              }}
              onLabelChange={(id) => {
                setActiveLabelId(id);
                setActiveFolderId("");
                setActiveEmailId("");
                setDetail(null);
                setSelectedIds(new Set());
              }}
              onCreateFolder={() => {
                const name = window.prompt("Название папки");
                if (!name || !activeAccountId) return;
                void jsonFetch("/api/mail/folders", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ accountId: activeAccountId, name }),
                }).then(loadAccounts);
              }}
              onCreateLabel={() => {
                const name = window.prompt("Название метки");
                if (!name || !activeAccountId) return;
                void jsonFetch("/api/mail/labels", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ accountId: activeAccountId, name, color: "#ffcc00" }),
                }).then(loadAccounts);
              }}
            />
            <MailList
              folder={activeFolder}
              label={activeLabel}
              emails={emails}
              activeEmailId={activeEmailId}
              selectedIds={selectedIds}
              filter={filter}
              loading={loadingEmails}
              hasMore={Boolean(nextCursor)}
              loadingMore={loadingMore}
              onFilterChange={setFilter}
              onLoadMore={() => {
                if (nextCursor) void loadEmails(nextCursor, true);
              }}
              onOpen={(id) => {
                setActiveEmailId(id);
                void loadDetail(id);
              }}
              onToggleSelect={(id) =>
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onSelectAll={() => setSelectedIds(new Set(emails.map((e) => e.id)))}
              onClearSelection={() => setSelectedIds(new Set())}
              onCreateOrder={() => void createOrderFromSelectedEmails()}
              onMarkAllRead={() => void markAllRead()}
              onBulkAction={(action) => void bulk(action)}
              onEmailAction={(id, action) => void bulk(action, [id])}
              canMarkAllRead={currentUserRole === "OWNER"}
            />
            <div className="hidden min-w-0 flex-1 overflow-hidden xl:flex">
              <MailViewer
                email={detail}
                loading={loadingDetail}
                onAction={(action) => void bulk(action, activeEmailId ? [activeEmailId] : [])}
                onCreateOrder={() => void createOrderFromEmailIds(activeEmailId ? [activeEmailId] : [])}
                onReply={(html, mode) => openReply(mode, html)}
              />
            </div>
          </div>
        </DndContext>
      )}

      <MailComposer
        open={composerOpen}
        account={activeAccount}
        initialTo={composerSeed.to}
        initialSubject={composerSeed.subject}
        initialHtml={composerSeed.html}
        onClose={() => setComposerOpen(false)}
        onSent={() => {
          void loadAccounts();
          void loadEmails(null, false);
        }}
      />
      {accountModalOpen && canConnectAccount ? (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => {
            if (!savingAccount) setAccountModalOpen(false);
          }}
        >
          <form
            action={(formData) => void saveAccount(formData)}
            role="dialog"
            aria-modal="true"
            aria-label="Добавить почтовый ящик"
            autoComplete="off"
            className="w-full max-w-md rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              name="username"
              autoComplete="username"
              tabIndex={-1}
              className="hidden"
              aria-hidden="true"
            />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--app-text)]">Добавить ящик</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Введите адрес Яндекс.Почты и пароль приложения.
                </p>
              </div>
              <button
                type="button"
                disabled={savingAccount}
                onClick={() => setAccountModalOpen(false)}
                className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <div className="mt-5 space-y-3">
              <input
                name="mailAddress"
                type="email"
                required
                placeholder="name@yandex.ru"
                autoComplete="off"
                disabled={savingAccount}
                className="h-12 w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)] disabled:opacity-60"
              />
              <input
                name="yandexAppPassword"
                type="password"
                required
                placeholder="Пароль приложения"
                autoComplete="new-password"
                disabled={savingAccount}
                className="h-12 w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)] disabled:opacity-60"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={savingAccount}
                onClick={() => setAccountModalOpen(false)}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-body)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={savingAccount}
                className="rounded-xl bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-50"
              >
                {savingAccount ? "Сохраняю..." : "Добавить"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
