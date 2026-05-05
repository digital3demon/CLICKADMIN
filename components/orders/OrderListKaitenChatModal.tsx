"use client";

import { useCallback, useEffect, useId, useState, type ClipboardEvent } from "react";
import type { KaitenTrackLane } from "@prisma/client";
import {
  dedupeParsedKaitenComments,
  parseKaitenListComment,
  textIncludesAdminLabMention,
} from "@/lib/kaiten-comment-parse";
import { useKanbanAdminMentionTag } from "@/components/kanban/use-kanban-admin-mention-tag";
import { useOrderListChatPatchClicklab } from "@/components/orders/OrdersListKaitenChatShell";
import {
  CRM_UPLOAD_MAX_BYTES,
  CRM_UPLOAD_TOO_LARGE_MESSAGE,
} from "@/lib/crm-upload-limits";
import { postOrderAttachmentWithRetries } from "@/lib/order-attachment-upload-client";

type CommentRow = {
  id: number;
  text: string;
  created?: string;
  authorName?: string;
  parentId: number | null;
  images?: ChatImage[];
};

type ChatImage = {
  id: string;
  name: string;
  url: string;
  mime: string | null;
};

type KaitenSnapshot = {
  configured: boolean;
  card: Record<string, unknown>;
  trackLane: KaitenTrackLane | null;
  columns: Array<{ id: number; title?: string; name?: string }>;
  lanes: Array<{ id: number; title?: string }>;
  comments: CommentRow[];
  cardImages?: ChatImage[];
  kaitenCardUrl: string | null;
};

type ImagePreview = {
  id: string;
  name: string;
  url: string;
};

function commentsHaveLabMention(
  comments: CommentRow[],
  adminTag: string,
): boolean {
  return comments.some((c) => textIncludesAdminLabMention(c.text, adminTag));
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
  const adminMentionTag = useKanbanAdminMentionTag();
  const patchClicklab = useOrderListChatPatchClicklab();
  const [snap, setSnap] = useState<KaitenSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newText, setNewText] = useState("");
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [openImage, setOpenImage] = useState<{ name: string; url: string } | null>(
    null,
  );

  const clearImagePreviews = useCallback(() => {
    setImagePreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }, []);

  const applyClicklabFlag = useCallback(
    (comments: CommentRow[]) => {
      if (patchClicklab) {
        patchClicklab(orderId, commentsHaveLabMention(comments, adminMentionTag));
      }
    },
    [orderId, patchClicklab, adminMentionTag],
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
    if (open) return;
    clearImagePreviews();
  }, [open, clearImagePreviews]);

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

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      setUploadError(null);
      setUploadOk(null);
      for (const file of arr) {
        if (file.size > CRM_UPLOAD_MAX_BYTES) {
          setUploadError(CRM_UPLOAD_TOO_LARGE_MESSAGE);
          return;
        }
      }
      const previews = arr
        .filter((file) => file.type.startsWith("image/"))
        .map((file, idx) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${idx}`,
          name: file.name,
          url: URL.createObjectURL(file),
        }));
      setImagePreviews((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return previews;
      });
      setUploading(true);
      try {
        let done = 0;
        const warnings: string[] = [];
        for (const file of arr) {
          const result = await postOrderAttachmentWithRetries(orderId, file);
          if (!result.ok) {
            throw new Error(result.error || "Не удалось загрузить файл");
          }
          done += 1;
          if (result.warning) {
            warnings.push(result.warning);
          }
        }
        const base =
          done === 1
            ? "Файл загружен. Вложение отправлено в Kaiten."
            : `Файлы загружены (${done}). Вложения отправлены в Kaiten.`;
        setUploadOk(warnings.length > 0 ? `${base} ${warnings.join(" · ")}` : base);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Ошибка загрузки файлов");
      } finally {
        setUploading(false);
      }
    },
    [orderId],
  );

  const onPasteIntoMessage = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      if (uploading || loading || !!loadError) return;
      const files = e.clipboardData?.files;
      if (!files || files.length === 0) return;
      e.preventDefault();
      void uploadFiles(files);
    },
    [loadError, loading, uploading, uploadFiles],
  );

  if (!open) return null;

  const comments = snap?.comments ?? [];
  const cardImages = snap?.cardImages ?? [];
  const roots = comments.filter((c) => c.parentId == null);
  const childrenOf = (pid: number) =>
    comments.filter((c) => c.parentId === pid);
  const renderChatImages = (images: ChatImage[] | undefined) => {
    if (!images?.length) return null;
    return (
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            className="min-w-0 text-left"
            title={image.name}
            onClick={() => setOpenImage({ name: image.name, url: image.url })}
          >
            <img
              src={image.url}
              alt={image.name}
              className="h-20 w-full rounded border border-[var(--card-border)] object-cover hover:opacity-90"
            />
            <span className="mt-1 block truncate text-[10px] text-[var(--text-muted)]">
              {image.name}
            </span>
          </button>
        ))}
      </div>
    );
  };

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
                      {renderChatImages(c.images)}
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
                              {renderChatImages(ch.images)}
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
              {cardImages.length > 0 ? (
                <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Изображения в карточке
                  </p>
                  {renderChatImages(cardImages)}
                </div>
              ) : null}
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
            onPaste={onPasteIntoMessage}
            disabled={loading || !!loadError || uploading}
          />
          {postError ? (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{postError}</p>
          ) : null}
          {uploadError ? (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{uploadError}</p>
          ) : null}
          {uploadOk ? (
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{uploadOk}</p>
          ) : null}
          {imagePreviews.length > 0 ? (
            <div className="mt-2 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Предпросмотр изображений
                </p>
                <button
                  type="button"
                  className="text-[10px] font-medium text-[var(--sidebar-blue)] hover:underline"
                  onClick={clearImagePreviews}
                >
                  Скрыть
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {imagePreviews.map((preview) => (
                  <figure key={preview.id} className="min-w-0">
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="h-20 w-full rounded border border-[var(--card-border)] object-cover"
                      onClick={() =>
                        setOpenImage({ name: preview.name, url: preview.url })
                      }
                    />
                    <figcaption
                      className="mt-1 truncate text-[10px] text-[var(--text-muted)]"
                      title={preview.name}
                    >
                      {preview.name}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]">
              {uploading ? "Загрузка файлов…" : "Загрузить файл(ы)"}
              <input
                type="file"
                multiple
                className="hidden"
                disabled={uploading || loading || !!loadError}
                onChange={(e) => {
                  const fl = e.currentTarget.files;
                  e.currentTarget.value = "";
                  if (!fl?.length) return;
                  void uploadFiles(fl);
                }}
              />
            </label>
            <span className="text-[10px] text-[var(--text-muted)]">
              Вложения уйдут в карточку Kaiten (можно вставить через Ctrl+V)
            </span>
          </div>
          <button
            type="button"
            disabled={posting || !newText.trim() || loading || !!loadError || uploading}
            onClick={() => void sendComment()}
            className="mt-2 w-full rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {posting ? "Отправка…" : "Отправить в Kaiten"}
          </button>
        </div>
      </div>
      {openImage ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenImage(null);
          }}
        >
          <div className="max-h-full max-w-5xl">
            <div className="mb-2 flex items-center justify-between gap-3 text-white">
              <p className="min-w-0 truncate text-sm font-medium">{openImage.name}</p>
              <button
                type="button"
                className="rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
                onClick={() => setOpenImage(null)}
              >
                Закрыть
              </button>
            </div>
            <img
              src={openImage.url}
              alt={openImage.name}
              className="max-h-[82vh] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
