"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { MailComposer } from "@/components/mail/MailComposer";
import { MailHeader } from "@/components/mail/MailHeader";
import { MailList } from "@/components/mail/MailList";
import { MailSidebar } from "@/components/mail/MailSidebar";
import { MailViewer } from "@/components/mail/MailViewer";
import type {
  MailAccount,
  MailEmailDetail,
  MailEmailRow,
  MailFilter,
  MailFolder,
} from "@/components/mail/types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function inboxFolder(account: MailAccount | null): MailFolder | null {
  if (!account) return null;
  return (
    account.folders.find((f) => f.type === "INBOX") ??
    account.folders.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0] ??
    null
  );
}

export function MailLayout() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState("");
  const [activeFolderId, setActiveFolderId] = useState("");
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
  const syncInFlightRef = useRef(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSeed, setComposerSeed] = useState({ to: "", subject: "", html: "" });
  const [error, setError] = useState("");

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === activeAccountId) ?? null,
    [accounts, activeAccountId],
  );
  const activeFolder = useMemo(
    () => activeAccount?.folders.find((f) => f.id === activeFolderId) ?? null,
    [activeAccount, activeFolderId],
  );

  const loadAccounts = useCallback(async () => {
    const data = await jsonFetch<{ accounts: MailAccount[] }>("/api/mail/accounts");
    setAccounts(data.accounts);
    setActiveAccountId((prev) =>
      prev && data.accounts.some((account) => account.id === prev)
        ? prev
        : data.accounts[0]?.id || "",
    );
  }, []);

  const loadEmails = useCallback(async (cursor: string | null = null, append = false) => {
    if (!activeAccountId) return;
    if (append) setLoadingMore(true);
    else setLoadingEmails(true);
    setError("");
    try {
      const params = new URLSearchParams({
        accountId: activeAccountId,
        filter,
        take: "80",
      });
      if (activeFolderId) params.set("folderId", activeFolderId);
      if (search.trim()) params.set("q", search.trim());
      if (cursor) params.set("cursor", cursor);
      const data = await jsonFetch<{ emails: MailEmailRow[]; nextCursor: string | null }>(
        `/api/mail/emails?${params.toString()}`,
      );
      setEmails((prev) => (append ? [...prev, ...data.emails] : data.emails));
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки писем");
    } finally {
      if (append) setLoadingMore(false);
      else setLoadingEmails(false);
    }
  }, [activeAccountId, activeFolderId, filter, search]);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setError("");
    try {
      const data = await jsonFetch<{ email: MailEmailDetail }>(`/api/mail/emails/${id}`);
      setDetail(data.email);
      setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, isRead: true } : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка открытия письма");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts().catch((err) => setError(err instanceof Error ? err.message : "Ошибка"));
  }, [loadAccounts]);

  useEffect(() => {
    if (!activeAccount) return;
    const folder = inboxFolder(activeAccount);
    setActiveFolderId((prev) =>
      prev && activeAccount.folders.some((f) => f.id === prev) ? prev : folder?.id || "",
    );
  }, [activeAccount]);

  useEffect(() => {
    setNextCursor(null);
    void loadEmails(null, false);
  }, [loadEmails]);

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
        else if (latest.status === "FAILED") setSyncStatus(latest.lastError || "Синхронизация завершилась ошибкой");
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (composerOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = emails.findIndex((m) => m.id === activeEmailId);
      if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        const next = emails[Math.min(emails.length - 1, Math.max(0, idx + 1))];
        if (next) {
          setActiveEmailId(next.id);
          void loadDetail(next.id);
        }
      }
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        const prev = emails[Math.max(0, idx - 1)];
        if (prev) {
          setActiveEmailId(prev.id);
          void loadDetail(prev.id);
        }
      }
      if (e.key.toLowerCase() === "r" && detail) {
        e.preventDefault();
        openReply("reply");
      }
      if (e.key.toLowerCase() === "e" && activeEmailId) {
        e.preventDefault();
        void bulk("archive", [activeEmailId]);
      }
      if (e.key === "Delete" && activeEmailId) {
        e.preventDefault();
        void bulk("trash", [activeEmailId]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeEmailId, composerOpen, detail, emails, loadDetail]);

  async function bulk(
    action: "read" | "unread" | "archive" | "trash" | "delete" | "flag" | "unflag" | "move",
    ids = [...selectedIds],
    targetFolderId?: string,
  ) {
    if (!ids.length) return;
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

  async function syncActive(options: { quiet?: boolean } = {}) {
    if (!activeAccountId) return;
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    if (!options.quiet) {
      setSyncing(true);
      setError("");
      setSyncStatus("Проверяем новые письма...");
    }
    try {
      await jsonFetch(`/api/mail/accounts/${activeAccountId}/sync`, { method: "POST" });
      await loadAccounts();
      await loadEmails(null, false);
    } catch (err) {
      if (!options.quiet) {
        setError(err instanceof Error ? err.message : "Ошибка синхронизации");
      }
    } finally {
      syncInFlightRef.current = false;
      if (!options.quiet) setSyncing(false);
    }
  }

  useEffect(() => {
    if (!activeAccountId) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void syncActive({ quiet: true });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [activeAccountId, loadAccounts, loadEmails]);

  function openMailSettings() {
    window.location.href = "/directory/mail";
  }

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] min-w-0 flex-col overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
      <MailHeader
        accounts={accounts}
        activeAccountId={activeAccountId}
        search={search}
        syncing={syncing}
        onAccountChange={(id) => {
          setActiveAccountId(id);
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
        onConnectAccount={openMailSettings}
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
            <h2 className="text-2xl font-semibold text-[var(--app-text)]">Подключите Яндекс.Почту</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Подключение аккаунтов и правила обработки входящей почты находятся в конфигурации.
            </p>
            <button
              type="button"
              onClick={openMailSettings}
              className="mt-6 rounded-2xl bg-[var(--sidebar-blue)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)]"
            >
              Открыть конфигурацию почты
            </button>
          </div>
        </div>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex min-h-0 flex-1">
            <MailSidebar
              account={activeAccount}
              activeFolderId={activeFolderId}
              labels={activeAccount?.labels ?? []}
              onFolderChange={(id) => {
                setActiveFolderId(id);
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
              onBulkAction={(action) => void bulk(action)}
              onEmailAction={(id, action) => void bulk(action, [id])}
            />
            <div className="hidden min-w-0 flex-1 xl:flex">
              <MailViewer
                email={detail}
                loading={loadingDetail}
                onAction={(action) => void bulk(action, activeEmailId ? [activeEmailId] : [])}
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
    </div>
  );
}
