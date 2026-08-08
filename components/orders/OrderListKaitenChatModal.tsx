"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ClipboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { KaitenTrackLane } from "@prisma/client";
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import { canAckOrderChatLabMention } from "@/lib/auth/permissions";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { OrderFilesPanel } from "@/components/orders/OrderFilesPanel";
import {
  CRM_UPLOAD_MAX_BYTES,
  CRM_UPLOAD_TOO_LARGE_MESSAGE,
} from "@/lib/crm-upload-limits";
import {
  normalizeOrderAttachmentUploadQueue,
} from "@/lib/order-attachment-upload-client";
import { enqueueOrderAttachmentFiles } from "@/lib/order-attachment-background-queue";
import {
  formatKanbanChatMessageDisplay,
  orderListChatMessageLabelClass,
  orderListChatMessageShellClass,
  shouldShowKanbanChatSyncStatus,
} from "@/lib/kanban/chat-message-display";
import { needsOrderListKaitenChatFallback } from "@/lib/kanban/order-list-chat-hydrate";
import { formatOrderListChatModalTitle } from "@/lib/order-list-chat-modal-title";

type CommentRow = {
  id: string | number;
  text: string;
  created?: string;
  authorName?: string;
  parentId: string | number | null;
  images?: ChatImage[];
  source?: "CRM" | "KAITEN";
  syncStatus?: "local" | "pending" | "synced" | "failed" | "retried";
  syncedAt?: string | null;
};

type ChatImage = {
  id: string;
  name: string;
  url: string;
  mime: string | null;
};

type ChatAction = "comment" | "correction" | "prosthetics";

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

type KanbanChatPayload = {
  error?: string;
  hasCard?: boolean;
  cardImages?: ChatImage[];
  comments?: KanbanChatCommentPayload[];
  orderHeader?: {
    orderNumber: string;
    patientName: string | null;
    doctorName: string | null;
  } | null;
};

function isNoKaitenCardError(errorText: string | null | undefined): boolean {
  const t = String(errorText || "").toLowerCase();
  return t.includes("не привяз") || t.includes("нет карточки kaiten");
}

type KanbanChatCommentPayload = {
  id: string | number;
  text?: string;
  created?: string;
  createdAt?: string;
  authorName?: string;
  authorLabel?: string;
  parentId?: string | number | null;
  images?: ChatImage[];
  source?: "CRM" | "KAITEN";
  syncStatus?: CommentRow["syncStatus"];
  syncedAt?: string | null;
};

/** GET /kanban-chat отдаёт CardComment (createdAt, authorLabel), модалке нужен CommentRow. */
function normalizeKanbanChatComment(raw: KanbanChatCommentPayload): CommentRow {
  return {
    id: raw.id,
    text: String(raw.text ?? ""),
    created: raw.created ?? raw.createdAt,
    authorName: raw.authorName ?? raw.authorLabel,
    parentId: raw.parentId ?? null,
    images: raw.images,
    source: raw.source,
    syncStatus: raw.syncStatus,
    syncedAt: raw.syncedAt,
  };
}

function normalizeKanbanChatComments(
  rows: KanbanChatCommentPayload[] | undefined,
): CommentRow[] {
  return (rows ?? []).map(normalizeKanbanChatComment);
}

/** Комментарии из GET /kaiten, если зеркало канбана ещё пустое. */
function kaitenSnapshotToCommentRows(
  rows: KaitenSnapshot["comments"] | undefined,
): CommentRow[] {
  return (rows ?? []).map((c) => ({
    id: c.id,
    text: String(c.text ?? ""),
    created: c.created,
    authorName: c.authorName,
    parentId: c.parentId ?? null,
    images: c.images,
    source: "KAITEN" as const,
    syncStatus: "synced" as const,
  }));
}

function mergeChatCommentsForDisplay(
  kanbanComments: CommentRow[],
  kaitenComments: CommentRow[],
): CommentRow[] {
  return kanbanComments.length > 0 ? kanbanComments : kaitenComments;
}

export function OrderListKaitenChatModal({
  orderId,
  orderNumber,
  patientName,
  doctorName,
  open,
  onClose,
}: {
  orderId: string;
  orderNumber: string;
  patientName?: string | null;
  doctorName?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { user } = useSessionUser();
  const canAckLabMention =
    user != null && canAckOrderChatLabMention(user.role);
  const titleId = useId();
  const [snap, setSnap] = useState<KaitenSnapshot | null>(null);
  const [chatMode, setChatMode] = useState<"kaiten" | "kanban">("kaiten");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newText, setNewText] = useState("");
  const [replyToId, setReplyToId] = useState<string | number | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState<string | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [titlePatient, setTitlePatient] = useState<string | null>(null);
  const [titleDoctor, setTitleDoctor] = useState<string | null>(null);
  const [titleOrderNumber, setTitleOrderNumber] = useState(orderNumber);

  useEffect(() => {
    if (!open) return;
    setTitlePatient(patientName?.trim() || null);
    setTitleDoctor(doctorName?.trim() || null);
    setTitleOrderNumber(orderNumber);
  }, [open, orderNumber, patientName, doctorName]);

  const chatTitle = formatOrderListChatModalTitle(
    titleOrderNumber,
    titlePatient,
    titleDoctor,
  );

  const applyOrderHeader = useCallback(
    (header: KanbanChatPayload["orderHeader"]) => {
      if (!header) return;
      if (header.orderNumber?.trim()) {
        setTitleOrderNumber(header.orderNumber.trim());
      }
      if (header.patientName?.trim()) {
        setTitlePatient(header.patientName.trim());
      }
      if (header.doctorName?.trim()) {
        setTitleDoctor(header.doctorName.trim());
      }
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setChatMode("kanban");
    try {
      // Как карточка на доске: без local=1 — сервер подмешивает Kaiten в зеркало CRM.
      const chatRes = await fetch(`/api/orders/${orderId}/kanban-chat`, {
        credentials: "include",
        cache: "no-store",
      });
      const chatData = (await chatRes.json().catch(() => ({}))) as KanbanChatPayload;
      applyOrderHeader(chatData.orderHeader);
      const hasCard = chatRes.ok && chatData.hasCard === true;
      let kanbanComments =
        hasCard
          ? normalizeKanbanChatComments(chatData.comments)
          : chatRes.ok && Array.isArray(chatData.comments) && chatData.comments.length > 0
            ? normalizeKanbanChatComments(chatData.comments)
            : [];
      const kanbanImages =
        chatRes.ok && Array.isArray(chatData.cardImages) ? chatData.cardImages : [];

      if (
        needsOrderListKaitenChatFallback({
          mirrorOk: chatRes.ok,
          commentCount: kanbanComments.length,
        })
      ) {
        const kaitenChatRes = await fetch(`/api/orders/${orderId}/kaiten/chat`, {
          credentials: "include",
          cache: "no-store",
        });
        if (kaitenChatRes.ok) {
          const kaitenChatData = (await kaitenChatRes.json().catch(() => ({}))) as {
            comments?: KaitenSnapshot["comments"];
          };
          const fromKaiten = kaitenSnapshotToCommentRows(kaitenChatData.comments);
          if (fromKaiten.length > 0) {
            kanbanComments = fromKaiten;
          }
        }
      }

      if (chatRes.ok && (hasCard || kanbanComments.length > 0)) {
        setChatMode(hasCard ? "kanban" : "kaiten");
        setSnap({
          configured: true,
          card: {},
          trackLane: null,
          columns: [],
          lanes: [],
          comments: kanbanComments,
          cardImages: kanbanImages,
          kaitenCardUrl: null,
        });
        return;
      }

      // Нет карточки канбана — fallback на полный snapshot Kaiten.
      const kaitenRes = await fetch(`/api/orders/${orderId}/kaiten`);
      const kaitenData = (await kaitenRes.json().catch(() => ({}))) as {
        error?: string;
      } & Partial<KaitenSnapshot>;
      if (kaitenRes.ok) {
        const s = kaitenData as KaitenSnapshot;
        const kaitenComments = kaitenSnapshotToCommentRows(s.comments);
        setChatMode("kaiten");
        setSnap({
          ...s,
          comments: mergeChatCommentsForDisplay(kanbanComments, kaitenComments),
          cardImages: kanbanImages.length > 0 ? kanbanImages : s.cardImages ?? [],
        });
        return;
      }

      if (isNoKaitenCardError(kaitenData.error)) {
        setLoadError(kaitenData.error ?? "Нет карточки чата для этого наряда");
        setSnap(null);
        return;
      }

      setLoadError(kaitenData.error ?? "Не удалось загрузить чат");
      setSnap(null);
    } catch {
      setLoadError("Сеть недоступна");
      setSnap(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, applyOrderHeader]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (open) {
      setHasOpened(true);
    } else {
      setImageViewerOpen(false);
    }
  }, [open]);

  /** Подтверждение просмотра чата для текущего пользователя (БД), затем обновление RSC. */
  useEffect(() => {
    // Отправляем ack только при ЗАКРЫТИИ модалки (если она была открыта), 
    // чтобы она не исчезала из отфильтрованного списка прямо во время чтения
    if (open || !hasOpened || !canAckLabMention) return;

    void (async () => {
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(orderId)}/kaiten-lab-mention-ack`,
          { method: "POST", credentials: "same-origin" },
        );
        if (res.ok) router.refresh();
      } catch {
        /* ignore */
      }
    })();
  }, [open, hasOpened, orderId, router, canAckLabMention]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (imageViewerOpen) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, imageViewerOpen]);

  const sendComment = async (action: ChatAction = "comment") => {
    const t = newText.trim();
    if (!t) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/kanban-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          text: t,
          action,
          parentId: replyToId != null ? String(replyToId) : null,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        comment?: Record<string, unknown>;
      };
      if (!res.ok) {
        if (chatMode !== "kanban") {
          const kaitenText =
            action === "correction"
              ? `!!! ${t}`
              : action === "prosthetics"
                ? `??? ${t}`
                : t;
          const fb = await fetch(`/api/orders/${orderId}/kaiten/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: kaitenText,
              parentCommentId:
                replyToId != null && Number.isFinite(Number(replyToId))
                  ? Number(replyToId)
                  : null,
            }),
          });
          const fbData = (await fb.json().catch(() => ({}))) as { error?: string };
          if (!fb.ok) {
            setPostError(fbData.error ?? data.error ?? "Не отправлено");
            return;
          }
          await load();
          setNewText("");
          setReplyToId(null);
          return;
        }
        setPostError(data.error ?? "Не отправлено");
        return;
      }
      const refreshed = await fetch(`/api/orders/${orderId}/kanban-chat?local=1`, {
        credentials: "include",
        cache: "no-store",
      });
      const refreshedData = (await refreshed.json().catch(() => ({}))) as {
        comments?: KanbanChatCommentPayload[];
        cardImages?: ChatImage[];
      };
      setSnap((prev) =>
        prev
          ? {
              ...prev,
              comments: Array.isArray(refreshedData.comments)
                ? normalizeKanbanChatComments(refreshedData.comments)
                : prev.comments,
              cardImages: Array.isArray(refreshedData.cardImages)
                ? refreshedData.cardImages
                : prev.cardImages,
            }
          : prev,
      );
      setNewText("");
      setReplyToId(null);
    } catch {
      setPostError("Сеть недоступна");
    } finally {
      setPosting(false);
    }
  };

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const { queue: arr, skippedTooLarge } =
        normalizeOrderAttachmentUploadQueue(files, CRM_UPLOAD_MAX_BYTES);
      if (skippedTooLarge) {
        setUploadError(CRM_UPLOAD_TOO_LARGE_MESSAGE);
      }
      if (arr.length === 0) return;
      setUploadError(null);
      setUploadOk(null);
      setUploading(true);
      try {
        const enqueued = await enqueueOrderAttachmentFiles({
          orderId,
          orderNumber,
          files: arr,
          uploadContext: "kanban",
        });
        if (enqueued > 0) {
          setUploadOk(
            enqueued === 1
              ? `Файл поставлен в очередь загрузки (${chatMode === "kanban" ? "CRM/Канбан" : "CRM/Kaiten"}).`
              : `Файлы поставлены в очередь загрузки (${enqueued}) (${chatMode === "kanban" ? "CRM/Канбан" : "CRM/Kaiten"}).`,
          );
        } else {
          setUploadOk("Такой файл уже есть в очереди загрузки.");
        }
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Ошибка загрузки файлов");
      } finally {
        setUploading(false);
      }
    },
    [orderId, orderNumber, chatMode],
  );

  const onPasteIntoMessage = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      if (uploading || loading || !!loadError) return;
      const files = e.clipboardData?.files;
      if (!files || files.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      void uploadFiles(files);
    },
    [loadError, loading, uploading, uploadFiles],
  );

  const comments = snap?.comments ?? [];

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open) return null;
  const isKanbanMode = chatMode === "kanban";
  const kanbanCardUrl = kanbanOrderDeepLinkPath(orderId);
  const roots = comments.filter((c) => c.parentId == null);
  const childrenOf = (pid: string | number) =>
    comments.filter((c) => c.parentId === pid);
  const syncStatusLabel = (v: CommentRow["syncStatus"]) => {
    if (v === "pending") return "Синхронизация…";
    if (v === "failed") return "Не отправлено в Kaiten";
    if (v === "retried") return "Повторная отправка…";
    if (v === "synced") return "Синхронизировано";
    if (v === "local") return "Локально";
    return "";
  };
  const retrySync = async (commentId: string | number) => {
    if (posting || loading) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/kanban-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ retryCommentId: String(commentId) }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPostError(data.error ?? "Не удалось повторить отправку");
        return;
      }
      await load();
    } catch {
      setPostError("Сеть недоступна");
    } finally {
      setPosting(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-black/45 p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(92vh,40rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--card-border)] px-3 py-2.5 sm:px-4">
          <h2
            id={titleId}
            className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[var(--app-text)]"
          >
            {chatTitle}
          </h2>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--table-row-hover)] hover:text-[var(--app-text)]"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
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
              {isKanbanMode ? (
                <a
                  href={kanbanCardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-3 inline-block text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                >
                  Открыть карточку в канбане CRM →
                </a>
              ) : snap?.kaitenCardUrl ? (
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
                {isKanbanMode
                  ? "Чат карточки CRM-канбана. Отправка сохраняется в канбан (и синхронизируется с Kaiten в фоне, если карточка привязана)."
                  : "Сообщения из Kaiten (карточки канбана в CRM нет). Отправка уходит в Kaiten."}
              </p>
              <ul className="space-y-3">
                {roots.length === 0 ? (
                  <li className="text-sm text-[var(--text-muted)]">Сообщений пока нет.</li>
                ) : (
                  roots.map((c) => {
                    const display = formatKanbanChatMessageDisplay(c.text);
                    return (
                    <li
                      key={c.id}
                      className={orderListChatMessageShellClass(display.kind)}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                        <span className="font-medium text-[var(--text-strong)]">
                          {c.authorName ?? "Участник"}
                        </span>
                        {c.created ? (
                          <span suppressHydrationWarning>
                            {mounted ? new Date(c.created).toLocaleString("ru-RU") : ""}
                          </span>
                        ) : null}
                      </div>
                      {display.label ? (
                        <p className={orderListChatMessageLabelClass(display.kind)}>
                          {display.label}
                        </p>
                      ) : null}
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--app-text)]">
                        {display.body}
                      </p>
                      {shouldShowKanbanChatSyncStatus(display.kind, c.syncStatus) ? (
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                          <span>{syncStatusLabel(c.syncStatus)}</span>
                          {c.syncStatus === "failed" ? (
                            <button
                              type="button"
                              className="font-medium text-[var(--sidebar-blue)] hover:underline"
                              onClick={() => void retrySync(c.id)}
                              disabled={posting}
                            >
                              Повторить отправку
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className="mt-1 text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                        onClick={() => setReplyToId(c.id)}
                      >
                        Ответить
                      </button>
                      {childrenOf(c.id).length > 0 ? (
                        <ul className="mt-2 space-y-2 border-l-2 border-[var(--card-border)] pl-3">
                          {childrenOf(c.id).map((ch) => {
                            const childDisplay = formatKanbanChatMessageDisplay(ch.text);
                            return (
                            <li
                              key={ch.id}
                              className={`text-sm ${orderListChatMessageShellClass(childDisplay.kind)}`}
                            >
                              <div className="text-[10px] text-[var(--text-muted)]" suppressHydrationWarning>
                                {ch.authorName ?? "Участник"}
                                {ch.created
                                  ? ` · ${mounted ? new Date(ch.created).toLocaleString("ru-RU") : ""}`
                                  : null}
                              </div>
                              {childDisplay.label ? (
                                <p className={orderListChatMessageLabelClass(childDisplay.kind)}>
                                  {childDisplay.label}
                                </p>
                              ) : null}
                              <p className="whitespace-pre-wrap text-[var(--app-text)]">
                                {childDisplay.body}
                              </p>
                              {shouldShowKanbanChatSyncStatus(
                                childDisplay.kind,
                                ch.syncStatus,
                              ) ? (
                                <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                                  <span>{syncStatusLabel(ch.syncStatus)}</span>
                                  {ch.syncStatus === "failed" ? (
                                    <button
                                      type="button"
                                      className="font-medium text-[var(--sidebar-blue)] hover:underline"
                                      onClick={() => void retrySync(ch.id)}
                                      disabled={posting}
                                    >
                                      Повторить отправку
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                              <button
                                type="button"
                                className="mt-0.5 text-xs text-[var(--sidebar-blue)] hover:underline"
                                onClick={() => setReplyToId(ch.id)}
                              >
                                Ответить
                              </button>
                            </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                    );
                  })
                )}
              </ul>
            </>
          )}
          </div>

          <aside className="flex min-h-0 w-full shrink-0 flex-col border-t border-[var(--card-border)] bg-[var(--surface-subtle)] sm:w-[min(15rem,34%)] sm:max-w-xs sm:border-l sm:border-t-0">
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
              <OrderFilesPanel
                orderId={orderId}
                orderNumber={orderNumber}
                listenPaste={false}
                showUploadZone={false}
                allowDelete={false}
                thumbSize="md"
                uploadContext="kanban"
                onImageViewerOpenChange={setImageViewerOpen}
              />
            </div>
          </aside>
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
              {isKanbanMode
                ? "Вложения сохраняются в наряд и канбан CRM (можно вставить через Ctrl+V)"
                : "Вложения уйдут в карточку Kaiten (можно вставить через Ctrl+V)"}
            </span>
          </div>
          <button
            type="button"
            disabled={posting || !newText.trim() || loading || !!loadError || uploading}
            onClick={() => void sendComment()}
            className="mt-2 w-full rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {posting ? "Отправка…" : isKanbanMode ? "Отправить" : "Отправить в Kaiten"}
          </button>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={posting || !newText.trim() || loading || !!loadError || uploading}
              onClick={() => void sendComment("correction")}
              className="rounded-md border border-amber-400/50 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/20"
            >
              Корректировка
            </button>
            <button
              type="button"
              disabled={posting || !newText.trim() || loading || !!loadError || uploading}
              onClick={() => void sendComment("prosthetics")}
              className="rounded-md border border-sky-400/50 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-50 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-200 dark:hover:bg-sky-400/20"
            >
              Заказ протетики
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
