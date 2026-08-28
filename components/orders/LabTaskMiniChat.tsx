"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatRuDateTime } from "@/lib/corrections-history";
import { isChatComposerSendEnter } from "@/lib/kanban/chat-message-edit";
import type { LabTaskChatCommentJson } from "@/lib/lab-task-chat";

export function LabTaskChatToggle({
  unread,
  count,
  open,
  onClick,
}: {
  unread: boolean;
  count: number;
  open: boolean;
  onClick: () => void;
}) {
  const empty = count <= 0;
  const tone = unread
    ? "border-amber-400 bg-amber-400/20 text-amber-950 dark:border-amber-500 dark:bg-amber-500/20 dark:text-amber-100"
    : "border-[var(--input-border)] bg-[var(--surface-muted)] text-[var(--text-muted)]";
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={
        unread
          ? "Чат задачи, есть новые сообщения"
          : empty
            ? "Чат задачи, сообщений нет"
            : "Чат задачи"
      }
      title={unread ? "Есть новые сообщения" : empty ? "Чат не начат" : "Чат"}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone}`}
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path d="M3.5 4.5A1.5 1.5 0 0 1 5 3h10a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 15 14H8.6l-3.3 2.48A.5.5 0 0 1 4.5 16V14H5a1.5 1.5 0 0 1-1.5-1.5v-8Z" />
      </svg>
      {count > 0 ? <span className="tabular-nums">{count}</span> : "Чат"}
    </button>
  );
}

export function LabTaskMiniChat({
  taskId,
  onStats,
}: {
  taskId: string;
  onStats: (next: { chatMessageCount: number; hasUnreadChat: boolean }) => void;
}) {
  const [comments, setComments] = useState<LabTaskChatCommentJson[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<LabTaskChatCommentJson | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  const applyList = useCallback((rows: LabTaskChatCommentJson[]) => {
    setComments(rows);
    const visible = rows.filter((c) => !c.deletedAt).length;
    onStatsRef.current({ chatMessageCount: visible, hasUnreadChat: false });
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      setErr(null);
      try {
        const res = await fetch(
          `/api/lab-tasks/${encodeURIComponent(taskId)}/comments`,
          { credentials: "include", cache: "no-store", signal: ac.signal },
        );
        const j = (await res.json().catch(() => ({}))) as {
          comments?: LabTaskChatCommentJson[];
          error?: string;
        };
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setErr(j.error ?? "Не удалось загрузить чат");
          return;
        }
        applyList(Array.isArray(j.comments) ? j.comments : []);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (ac.signal.aborted) return;
        setErr("Сеть недоступна");
      } finally {
        if (!ac.signal.aborted) setLoaded(true);
      }
    })();
    return () => ac.abort();
  }, [taskId, applyList]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length, loaded]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setErr(null);
    try {
      if (editingId) {
        const res = await fetch(
          `/api/lab-tasks/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(editingId)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: body }),
          },
        );
        const j = (await res.json().catch(() => ({}))) as {
          comments?: LabTaskChatCommentJson[];
          error?: string;
        };
        if (!res.ok) {
          setErr(j.error ?? "Не удалось изменить");
          return;
        }
        applyList(Array.isArray(j.comments) ? j.comments : []);
        setEditingId(null);
        setText("");
        return;
      }
      const res = await fetch(
        `/api/lab-tasks/${encodeURIComponent(taskId)}/comments`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: body,
            parentId: replyTo?.id ?? null,
          }),
        },
      );
      const j = (await res.json().catch(() => ({}))) as {
        comments?: LabTaskChatCommentJson[];
        error?: string;
      };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось отправить");
        return;
      }
      applyList(Array.isArray(j.comments) ? j.comments : []);
      setText("");
      setReplyTo(null);
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }, [text, busy, editingId, replyTo, taskId, applyList]);

  const remove = useCallback(
    async (commentId: string) => {
      if (busy) return;
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch(
          `/api/lab-tasks/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(commentId)}`,
          { method: "DELETE", credentials: "include" },
        );
        const j = (await res.json().catch(() => ({}))) as {
          comments?: LabTaskChatCommentJson[];
          error?: string;
        };
        if (!res.ok) {
          setErr(j.error ?? "Не удалось удалить");
          return;
        }
        applyList(Array.isArray(j.comments) ? j.comments : []);
        if (editingId === commentId) {
          setEditingId(null);
          setText("");
        }
      } catch {
        setErr("Сеть недоступна");
      } finally {
        setBusy(false);
      }
    },
    [busy, taskId, applyList, editingId],
  );

  return (
    <div className="mt-2 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]">
      <div ref={listRef} className="max-h-52 overflow-y-auto px-2.5 py-2">
        {err ? (
          <p className="mb-2 text-xs text-red-600" role="alert">
            {err}
          </p>
        ) : null}
        {!loaded && comments.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Загрузка чата…</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Пока нет сообщений</p>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="min-w-0">
                <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                  {c.authorLabel}
                  <span className="ml-1 font-normal">
                    · {formatRuDateTime(new Date(c.createdAt))}
                    {c.editedAt ? " · изм." : ""}
                  </span>
                </p>
                {c.parentPreview ? (
                  <p className="mt-0.5 border-l-2 border-[var(--sidebar-blue)]/50 pl-1.5 text-[11px] text-[var(--text-muted)]">
                    {c.parentPreview}
                  </p>
                ) : null}
                {c.deletedAt ? (
                  <p className="mt-0.5 text-xs italic text-[var(--text-muted)]">
                    Сообщение удалено
                  </p>
                ) : (
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-[var(--text-body)]">
                    {c.text}
                  </p>
                )}
                <div className="mt-0.5 flex flex-wrap gap-2">
                  {!c.deletedAt ? (
                    <button
                      type="button"
                      className="text-[10px] font-medium text-[var(--sidebar-blue)] hover:underline"
                      onClick={() => {
                        setReplyTo(c);
                        setEditingId(null);
                      }}
                    >
                      Ответить
                    </button>
                  ) : null}
                  {c.canMutate ? (
                    <>
                      <button
                        type="button"
                        className="text-[10px] font-medium text-[var(--text-secondary)] hover:underline"
                        onClick={() => {
                          setEditingId(c.id);
                          setText(c.text);
                          setReplyTo(null);
                        }}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="text-[10px] font-medium text-red-600 hover:underline dark:text-red-400"
                        disabled={busy}
                        onClick={() => void remove(c.id)}
                      >
                        Удалить
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-[var(--card-border)] px-2.5 py-2">
        {replyTo ? (
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
            <span className="min-w-0 truncate">
              Ответ для {replyTo.authorLabel}
            </span>
            <button
              type="button"
              className="shrink-0 hover:underline"
              onClick={() => setReplyTo(null)}
            >
              Снять
            </button>
          </div>
        ) : null}
        {editingId ? (
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
            <span>Редактирование</span>
            <button
              type="button"
              className="shrink-0 hover:underline"
              onClick={() => {
                setEditingId(null);
                setText("");
              }}
            >
              Отмена
            </button>
          </div>
        ) : null}
        <textarea
          className="min-h-[2.75rem] w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-xs text-[var(--app-text)] placeholder:text-[var(--text-muted)]"
          placeholder="Сообщение в чат задачи…"
          value={text}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (isChatComposerSendEnter(e)) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            disabled={busy || !text.trim()}
            className="rounded-md bg-[var(--sidebar-blue)] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
            onClick={() => void send()}
          >
            {busy ? "…" : editingId ? "Сохранить" : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}
