"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSeed, setComposerSeed] = useState({ to: "", subject: "", html: "" });
  const [accountModal, setAccountModal] = useState(false);
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
    setActiveAccountId((prev) => prev || data.accounts[0]?.id || "");
  }, []);

  const loadEmails = useCallback(async () => {
    if (!activeAccountId) return;
    setLoadingEmails(true);
    setError("");
    try {
      const params = new URLSearchParams({
        accountId: activeAccountId,
        filter,
        take: "120",
      });
      if (activeFolderId) params.set("folderId", activeFolderId);
      if (search.trim()) params.set("q", search.trim());
      const data = await jsonFetch<{ emails: MailEmailRow[] }>(
        `/api/mail/emails?${params.toString()}`,
      );
      setEmails(data.emails);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки писем");
    } finally {
      setLoadingEmails(false);
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
    void loadEmails();
  }, [loadEmails]);

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
    await loadEmails();
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

  async function saveAccount(form: FormData) {
    try {
      await jsonFetch("/api/mail/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") || ""),
          displayName: String(form.get("displayName") || ""),
          appPassword: String(form.get("appPassword") || ""),
        }),
      });
      setAccountModal(false);
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось подключить аккаунт");
    }
  }

  async function syncActive() {
    if (!activeAccountId) return;
    setSyncing(true);
    setError("");
    try {
      await jsonFetch(`/api/mail/accounts/${activeAccountId}/sync`, { method: "POST" });
      await loadAccounts();
      await loadEmails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] overflow-hidden rounded-[28px] border border-[#e1e6ef] bg-[#f6f7fb] shadow-sm">
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
        onConnectAccount={() => setAccountModal(true)}
      />

      {error ? (
        <div className="border-b border-[#ffd3d3] bg-[#fff3f3] px-5 py-2 text-sm text-[#b42323]">
          {error}
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <div className="flex min-h-[560px] items-center justify-center p-8">
          <div className="max-w-md rounded-[28px] bg-white p-8 text-center shadow-sm ring-1 ring-[#e5e9f2]">
            <h2 className="text-2xl font-semibold text-[#15191f]">Подключите Яндекс.Почту</h2>
            <p className="mt-3 text-sm leading-6 text-[#727b8c]">
              Используется только пароль приложения Яндекса. OAuth2 не нужен.
            </p>
            <button
              type="button"
              onClick={() => setAccountModal(true)}
              className="mt-6 rounded-2xl bg-[#2b7cff] px-6 py-3 text-sm font-semibold text-white hover:bg-[#176bf2]"
            >
              Подключить аккаунт
            </button>
          </div>
        </div>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex h-[calc(100vh-190px)] min-h-[620px]">
            <MailSidebar
              account={activeAccount}
              accounts={accounts}
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
              onAccountClick={() => setAccountModal(true)}
            />
            <MailList
              folder={activeFolder}
              emails={emails}
              activeEmailId={activeEmailId}
              selectedIds={selectedIds}
              filter={filter}
              loading={loadingEmails}
              onFilterChange={setFilter}
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
          void loadEmails();
        }}
      />

      {accountModal ? (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#101827]/40 p-4 backdrop-blur-sm" role="presentation" onClick={() => setAccountModal(false)}>
          <form
            className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
            action={(formData) => void saveAccount(formData)}
          >
            <h2 className="text-xl font-semibold text-[#15191f]">Аккаунт Яндекс.Почты</h2>
            <p className="mt-2 text-sm leading-6 text-[#727b8c]">
              Введите email и пароль приложения. Пароль будет зашифрован перед сохранением.
            </p>
            <div className="mt-5 space-y-3">
              <input name="email" type="email" required placeholder="name@yandex.ru" className="h-12 w-full rounded-2xl border border-[#dfe4ee] px-4 text-sm outline-none focus:border-[#2b7cff] focus:ring-4 focus:ring-[#2b7cff]/10" />
              <input name="displayName" placeholder="Имя отправителя" className="h-12 w-full rounded-2xl border border-[#dfe4ee] px-4 text-sm outline-none focus:border-[#2b7cff] focus:ring-4 focus:ring-[#2b7cff]/10" />
              <input name="appPassword" type="password" required placeholder="Пароль приложения Яндекса" className="h-12 w-full rounded-2xl border border-[#dfe4ee] px-4 text-sm outline-none focus:border-[#2b7cff] focus:ring-4 focus:ring-[#2b7cff]/10" />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="rounded-xl px-4 py-2 text-sm text-[#6f7787] hover:bg-[#f1f4f8]" onClick={() => setAccountModal(false)}>
                Отмена
              </button>
              <button type="submit" className="rounded-xl bg-[#2b7cff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#176bf2]">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
