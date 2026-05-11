"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CRM_MESSENGER_OPEN_COUNT_CHANGED_EVENT } from "@/lib/crm-client-events";
import {
  CLICKLAB_ADMIN_MENTION,
  splitAroundClicklabAdmin,
} from "@/lib/telegram-clicklab-admin-mention";

type Item = {
  id: string;
  createdAt: string;
  doctorId: string;
  doctorName: string;
  telegramChatId: string;
  telegramMessageId: string;
  textFull: string;
  snippetBefore: string;
  snippetAfter: string;
  fromTgUsername: string | null;
  replyText: string | null;
  repliedAt: string | null;
  replyAuthorName: string | null;
  telegramMessageUrl: string | null;
};

export function MessengersClient() {
  const [tab, setTab] = useState<"open" | "archived">("open");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const didScrollToHash = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/messengers?status=${tab === "open" ? "open" : "archived"}&take=50`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        items?: Item[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Ошибка загрузки");
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError("Сеть недоступна");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== "open") return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/messengers/mark-viewed", { method: "POST" });
        if (!cancelled && res.ok) {
          window.dispatchEvent(new Event(CRM_MESSENGER_OPEN_COUNT_CHANGED_EVENT));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (loading || items.length === 0) return;
    if (didScrollToHash.current) return;
    const hash =
      typeof window !== "undefined" ? window.location.hash.trim() : "";
    const m = /^#m-(.+)$/.exec(hash);
    if (!m?.[1]) return;
    const id = m[1];
    if (!items.some((it) => it.id === id)) return;
    didScrollToHash.current = true;
    requestAnimationFrame(() => {
      document.getElementById(`m-${id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [loading, items]);

  const onReply = async (id: string) => {
    const text = (replyDrafts[id] ?? "").trim();
    if (!text) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/messengers/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не отправлено");
        setBusyId(null);
        return;
      }
      setReplyDrafts((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
      await load();
      window.dispatchEvent(new Event(CRM_MESSENGER_OPEN_COUNT_CHANGED_EVENT));
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusyId(null);
    }
  };

  const renderMentionMessageBody = (textFull: string) => {
    const parts = splitAroundClicklabAdmin(textFull);
    if (!parts) return textFull;
    return (
      <>
        {parts.before}
        <span className="font-semibold text-[var(--sidebar-blue)]">
          {CLICKLAB_ADMIN_MENTION}
        </span>
        {parts.after}
      </>
    );
  };

  const onArchive = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/messengers/${id}/archive`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        setBusyId(null);
        return;
      }
      await load();
      window.dispatchEvent(new Event(CRM_MESSENGER_OPEN_COUNT_CHANGED_EVENT));
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            Сообщения из групп Telegram с упоминанием{" "}
            <span className="font-medium text-[var(--app-text)]">
              @clicklab_admin
            </span>
            . Ответ уходит от бота в ту же группу.
          </p>
        </div>
        <div className="flex rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-0.5 text-sm">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              tab === "open"
                ? "bg-[var(--sidebar-blue)] text-white"
                : "text-[var(--text-body)] hover:bg-[var(--surface-subtle)]"
            }`}
            onClick={() => setTab("open")}
          >
            Очередь
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              tab === "archived"
                ? "bg-[var(--sidebar-blue)] text-white"
                : "text-[var(--text-body)] hover:bg-[var(--surface-subtle)]"
            }`}
            onClick={() => setTab("archived")}
          >
            Архив
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          {tab === "open" ? "Очередь пуста." : "В архиве пока ничего нет."}
        </p>
      ) : (
        <ul className="space-y-6">
          {items.map((it) => (
            <li
              key={it.id}
              id={`m-${it.id}`}
              className="scroll-mt-24 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/clients/doctors/${it.doctorId}?tab=requisites`}
                  className="font-medium text-[var(--sidebar-blue)] hover:underline"
                >
                  {it.doctorName}
                </Link>
                <time
                  className="text-xs tabular-nums text-[var(--text-muted)]"
                  dateTime={it.createdAt}
                >
                  {new Date(it.createdAt).toLocaleString("ru-RU")}
                </time>
              </div>
              {it.fromTgUsername ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  От @{it.fromTgUsername}
                </p>
              ) : null}

              <div className="mt-3 space-y-3 text-sm text-[var(--app-text)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Текст сообщения (целиком)
                  </p>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-black/[0.04] px-2 py-1.5 dark:bg-white/10">
                    {renderMentionMessageBody(it.textFull)}
                  </p>
                </div>
                {it.snippetBefore.trim() || it.snippetAfter.trim() ? (
                  <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Соседние сообщения в группе (до 3 до и после)
                    </p>
                    {it.snippetBefore.trim() ? (
                      <p className="whitespace-pre-wrap rounded-md bg-black/[0.04] px-2 py-1.5 dark:bg-white/10">
                        {it.snippetBefore.trim()}
                      </p>
                    ) : null}
                    {it.snippetAfter.trim() ? (
                      <p className="whitespace-pre-wrap rounded-md bg-black/[0.04] px-2 py-1.5 dark:bg-white/10">
                        {it.snippetAfter.trim()}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {tab === "archived" && it.replyText ? (
                <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
                  <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                    Ответ
                    {it.replyAuthorName ? ` · ${it.replyAuthorName}` : ""}
                    {it.repliedAt
                      ? ` · ${new Date(it.repliedAt).toLocaleString("ru-RU")}`
                      : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-emerald-950 dark:text-emerald-50">
                    {it.replyText}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {it.telegramMessageUrl ? (
                  <a
                    href={it.telegramMessageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-strong)] hover:bg-[var(--card-bg)]"
                  >
                    Открыть в Telegram
                  </a>
                ) : null}
                {tab === "open" ? (
                  <>
                    <button
                      type="button"
                      disabled={busyId === it.id}
                      className="inline-flex items-center rounded-full border border-[var(--card-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)] hover:bg-[var(--surface-subtle)] disabled:opacity-50"
                      onClick={() => void onArchive(it.id)}
                    >
                      В архив без ответа
                    </button>
                  </>
                ) : null}
              </div>

              {tab === "open" ? (
                <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Ответ в группу
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                    rows={3}
                    placeholder="Текст от имени бота (reply на исходное сообщение)"
                    value={replyDrafts[it.id] ?? ""}
                    onChange={(e) =>
                      setReplyDrafts((p) => ({
                        ...p,
                        [it.id]: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    disabled={busyId === it.id || !(replyDrafts[it.id] ?? "").trim()}
                    className="mt-2 inline-flex rounded-full bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                    onClick={() => void onReply(it.id)}
                  >
                    {busyId === it.id ? "Отправка…" : "Отправить и в архив"}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
