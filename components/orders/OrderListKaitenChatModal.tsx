"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { KaitenTrackLane } from "@prisma/client";
import {
  dedupeParsedKaitenComments,
  parseKaitenListComment,
  textIncludesClicklabMention,
} from "@/lib/kaiten-comment-parse";
import { useOrderListChatPatchClicklab } from "@/components/orders/OrdersListKaitenChatShell";

type CommentRow = {
  id: number;
  text: string;
  created?: string;
  authorName?: string;
  parentId: number | null;
};

type KaitenSnapshot = {
  configured: boolean;
  card: Record<string, unknown>;
  trackLane: KaitenTrackLane | null;
  columns: Array<{ id: number; title?: string; name?: string }>;
  lanes: Array<{ id: number; title?: string }>;
  comments: CommentRow[];
  kaitenCardUrl: string | null;
};

function commentsHaveClicklab(comments: CommentRow[]): boolean {
  return comments.some((c) => textIncludesClicklabMention(c.text));
}

export function OrderListKaitenChatModal({
  orderId,
  orderNumber,
  open,
  onClose,
}: {
  orderId: string;
  orderNumber: string;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const patchClicklab = useOrderListChatPatchClicklab();
  const [snap, setSnap] = useState<KaitenSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newText, setNewText] = useState("");
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const applyClicklabFlag = useCallback(
    (comments: CommentRow[]) => {
      if (patchClicklab) {
        patchClicklab(orderId, commentsHaveClicklab(comments));
      }
    },
    [orderId, patchClicklab],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/kaiten?refresh=1`);
      const data = (await res.json()) as { error?: string } & Partial<KaitenSnapshot>;
      if (!res.ok) {
        setLoadError(data.error ?? "Не удалось загрузить чат");
        setSnap(null);
        return;
      }
      const s = data as KaitenSnapshot;
      setSnap(s);
      applyClicklabFlag(s.comments ?? []);
    } catch {
      setLoadError("Сеть недоступна");
      setSnap(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, applyClicklabFlag]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sendComment = async () => {
    const t = newText.trim();
    if (!t) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/kaiten/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: t,
          parentCommentId: replyToId,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        comment?: Record<string, unknown>;
      };
      if (!res.ok) {
        setPostError(data.error ?? "Не отправлено");
        return;
      }
      setNewText("");
      setReplyToId(null);
      const row = data.comment ? parseKaitenListComment(data.comment) : null;
      if (row) {
        setSnap((prev) => {
          if (!prev) return prev;
          const next = dedupeParsedKaitenComments([...prev.comments, row]);
          applyClicklabFlag(next);
          return { ...prev, comments: next };
        });
      } else {
        await load();
      }
    } catch {
      setPostError("Сеть недоступна");
    } finally {
      setPosting(false);
    }
  };

  if (!open) return null;

  const comments = snap?.comments ?? [];
  const roots = comments.filter((c) => c.parentId == null);
  const childrenOf = (pid: number) =>
    comments.filter((c) => c.parentId === pid);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(92vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--card-border)] px-3 py-2.5 sm:px-4">
          <h2 id={titleId} className="min-w-0 truncate text-sm font-semibold text-[var(--app-text)]">
            Чат · наряд {orderNumber}
          </h2>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--table-row-hover)] hover:text-[var(--app-text)]"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>
          ) : loadError ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
              <p>{loadError}</p>
              <button
                type="button"
                className="mt-2 text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                onClick={() => void load()}
              >
                Повторить
              </button>
            </div>
          ) : (
            <>
              {snap?.kaitenCardUrl ? (
                <a
                  href={snap.kaitenCardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-3 inline-block text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                >
                  Открыть карточку в Kaiten →
                </a>
              ) : null}
              <p className="mb-2 text-[0.65rem] text-[var(--text-muted)]">
                Сообщения из чата карточки Kaiten (канбан). Отправка уходит в Kaiten.
              </p>
              <ul className="space-y-3">
                {roots.length === 0 ? (
                  <li className="text-sm text-[var(--text-muted)]">Сообщений пока нет.</li>
                ) : (
                  roots.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                        <span className="font-medium text-[var(--text-strong)]">
                          {c.authorName ?? "Участник"}
                        </span>
                        {c.created ? (
                          <time dateTime={c.created}>
                            {new Date(c.created).toLocaleString("ru-RU")}
                          </time>
                        ) : null}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--app-text)]">
                        {c.text}
                      </p>
                      <button
                        type="button"
                        className="mt-1 text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                        onClick={() => setReplyToId(c.id)}
                      >
                        Ответить
                      </button>
                      {childrenOf(c.id).length > 0 ? (
                        <ul className="mt-2 space-y-2 border-l-2 border-[var(--card-border)] pl-3">
                          {childrenOf(c.id).map((ch) => (
                            <li key={ch.id} className="text-sm">
                              <div className="text-[10px] text-[var(--text-muted)]">
                                {ch.authorName ?? "Участник"}{" "}
                                {ch.created
                                  ? `· ${new Date(ch.created).toLocaleString("ru-RU")}`
                                  : null}
                              </div>
                              <p className="whitespace-pre-wrap text-[var(--app-text)]">
                                {ch.text}
                              </p>
                              <button
                                type="button"
                                className="mt-0.5 text-xs text-[var(--sidebar-blue)] hover:underline"
                                onClick={() => setReplyToId(ch.id)}
                              >
                                Ответить
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--card-border)] px-3 py-3 sm:px-4">
          {replyToId != null ? (
            <p className="mb-2 text-xs text-[var(--text-muted)]">
              Ответ на #{replyToId}.{" "}
              <button
                type="button"
                className="font-medium text-[var(--sidebar-blue)] hover:underline"
                onClick={() => setReplyToId(null)}
              >
                Отменить
              </button>
            </p>
          ) : null}
          <textarea
            className="min-h-[72px] w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)]"
            placeholder="Новое сообщение…"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            disabled={loading || !!loadError}
          />
          {postError ? (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{postError}</p>
          ) : null}
          <button
            type="button"
            disabled={posting || !newText.trim() || loading || !!loadError}
            onClick={() => void sendComment()}
            className="mt-2 w-full rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {posting ? "Отправка…" : "Отправить в Kaiten"}
          </button>
        </div>
      </div>
    </div>
  );
}
