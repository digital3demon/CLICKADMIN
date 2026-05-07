"use client";

import type { CardComment, CardFile, KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import {
  downloadCardFile,
  isCardFileImage,
  isPdfMime,
  openOrDownloadCardFile,
  readFileAsCardFile,
} from "@/lib/kanban/card-files";
import {
  deleteOrderAttachmentById,
  fetchOrderKaitenCommentsForKanban,
  patchOrderKaitenCard,
  postOrderKaitenComment,
  uploadOrderAttachmentFromFile,
} from "@/lib/kanban/kaiten-linked-kanban-sync";
import { isOrderChatCorrectionTrigger } from "@/lib/order-chat-correction";
import { isOrderProstheticsRequestTrigger } from "@/lib/order-prosthetics-request";
import {
  parseMentionUserIdsFromText,
  sanitizeMentionToken,
} from "@/lib/kanban-comment-mentions";
import {
  isKanbanAdminGroupRole,
} from "@/lib/kanban-admin-mention";
import { useKanbanAdminMentionTag } from "@/components/kanban/use-kanban-admin-mention-tag";
import { shouldSkipCrmKanbanTelegram } from "@/lib/kanban/crm-kanban-telegram";
import type { KanbanTelegramPrefKey } from "@/lib/kanban-telegram-prefs";
import { kaitenClientPollIntervalMs } from "@/lib/kaiten-client-poll-ms";
import {
  findCard,
  formatBlockedAt,
  formatDate,
  formatDateTimeRu,
  generateId,
  deadlineHintKind,
  isCardBlocked,
  kaitenCardTypes,
  performUnblock,
  pushActivity,
  relativeTimeRu,
  trackLanes,
  tryBlockCard,
  userNameById,
} from "@/lib/kanban/model";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DeadlineTomorrowHint } from "./DeadlineTomorrowHint";
import { useKanbanCrmUsers } from "./kanban-crm-users-context";
import {
  KanbanPersonAvatar,
  mergeKanbanPickerUsers,
  pickerRowLabel,
} from "./KanbanPersonAvatar";
import type { KanbanCrmUserRow } from "./kanban-crm-users-context";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBrick,
  IconLink,
  IconPlus,
  IconSend,
  IconUnlock,
  IconX,
} from "./kanban-icons";
import {
  extractOrderNumberLabelFromKanbanCardTitle,
  type KanbanMentionTelegramContext,
} from "@/lib/kanban-mention-telegram-html";
import { escapeTelegramHtml, telegramHtmlLink } from "@/lib/telegram-html";
import { userPersonDisplayName } from "@/lib/user-activity-display-label";
import { useAutosizeTextarea } from "@/lib/use-autosize-textarea";

function kanbanCardAbsoluteUrl(cardId: string, boardId: string): string {
  if (typeof window === "undefined") return "";
  const basePath = window.location.pathname.split("?")[0] || "/kanban";
  const q = new URLSearchParams({ card: cardId, board: boardId });
  return `${window.location.origin}${basePath}?${q.toString()}`;
}

type BoardLaneColumnParts = {
  laneName: string;
  stageName: string;
};

function splitBoardLaneColumnTitle(title: string): BoardLaneColumnParts | null {
  const raw = String(title || "").trim();
  const splitIx = raw.indexOf("·");
  if (splitIx <= 0) return null;
  const laneName = raw.slice(0, splitIx).trim();
  const stageName = raw.slice(splitIx + 1).trim();
  if (!laneName || !stageName) return null;
  return { laneName, stageName };
}

/** Ссылка с подписью «шапка карточки» для Telegram HTML. */
function kanbanCardLinkHtml(
  cardId: string,
  boardId: string,
  title: string,
): string {
  return telegramHtmlLink(
    kanbanCardAbsoluteUrl(cardId, boardId),
    (title || "").trim() || "Без названия",
  );
}

/** Две слово-ссылки для старшего администратора / администратора (наряд привязан). */
function cardOrderWordLinks(
  orderId: string,
  cardId: string,
  boardId: string,
): { cardWord: string; orderWord: string } {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    cardWord: telegramHtmlLink(
      kanbanCardAbsoluteUrl(cardId, boardId),
      "карточке",
    ),
    orderWord: telegramHtmlLink(
      `${origin}/orders/${encodeURIComponent(orderId)}`,
      "заказе",
    ),
  };
}

function postKanbanCrmTelegramNotify(payload: {
  kaitenCardId?: number | null;
  event: KanbanTelegramPrefKey;
  lines?: string[];
  /** Две ссылки «карточке» + «заказе» для ADMINISTRATOR / SENIOR_ADMINISTRATOR. */
  linesAdmin?: string[];
  /** Сервер собирает HTML строку (номер наряда + Kaiten / канбан). */
  mentionContext?: KanbanMentionTelegramContext;
  targetUserIds?: string[];
  broadcastExcludeUserIds?: string[];
  /** На сервере: достаточно любого из ключей (для @упоминаний — комментарий или упоминание). */
  alternatePrefKeys?: KanbanTelegramPrefKey[];
  parseMode?: "HTML";
}) {
  void fetch("/api/kanban/telegram-notify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

/** Короткая подпись расширения для бейджа слева от имени файла. */
function cardFileExtensionLabel(fileName: string, mime: string): string {
  const base = fileName.trim();
  const dot = base.lastIndexOf(".");
  if (dot >= 0 && dot < base.length - 1) {
    const ext = base.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, "");
    if (ext) return ext.length > 5 ? ext.slice(0, 5).toUpperCase() : ext.toUpperCase();
  }
  const sub = (mime || "").split("/")[1];
  if (sub) {
    const short = sub.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5);
    if (short) return short.toUpperCase();
  }
  return "FILE";
}

type KanbanCardModalProps = {
  cardId: string | null;
  board: KanbanBoard;
  /** Подпись текущего пользователя для журнала активности. */
  activityActorLabel?: string;
  onClose: () => void;
  onApply: (fn: (b: KanbanBoard) => void) => void;
  toast: (msg: string, err?: boolean) => void;
  onMovePrevStage: (id: string) => void;
  onMoveNextStage: (id: string) => void;
  onMoveToColumn?: (cardId: string, targetColumnId: string) => void;
  /** Копирует в буфер ссылку на карточку (как в меню на доске). */
  onCopyCardLink: (cardId: string) => void;
  /** Если задано — список дорожек вместо ортопедия/ортодонтия (демо: одна доска). */
  trackLaneOptions?: { id: string; name: string }[];
  /** Подпись поля дорожки; по умолчанию «Расположение (дорожка)». */
  trackLaneFieldLabel?: string;
  /** Демо: тип карточки без Kaiten сохраняется через PATCH наряда. */
  isDemo?: boolean;
  /** id пользователя CRM для комментариев в Kaiten (иначе первый участник доски). */
  commentAuthorUserId?: string | null;
  canEditTitle?: boolean;
  canEditDueDate?: boolean;
  canEditTrack?: boolean;
  canManageAssignees?: boolean;
  canManageParticipants?: boolean;
  onOpenLinkedCard?: (cardId: string) => void;
  onParentProductionFilesUpdated?: (cardId: string) => void;
};

export function KanbanCardModal({
  cardId,
  board,
  activityActorLabel,
  onClose,
  onApply,
  toast,
  onMovePrevStage,
  onMoveNextStage,
  onMoveToColumn,
  onCopyCardLink,
  trackLaneOptions,
  trackLaneFieldLabel,
  isDemo = false,
  commentAuthorUserId,
  canEditTitle = true,
  canEditDueDate = true,
  canEditTrack = true,
  canManageAssignees = true,
  canManageParticipants = true,
  onOpenLinkedCard,
  onParentProductionFilesUpdated,
}: KanbanCardModalProps) {
  const [rightTab, setRightTab] = useState<"chat" | "act">("chat");
  const [blockPopupOpen, setBlockPopupOpen] = useState(false);
  const [blockReasonDraft, setBlockReasonDraft] = useState("");
  const [pickerMode, setPickerMode] = useState<null | "assign" | "part">(null);
  const [pickerIds, setPickerIds] = useState<string[]>([]);
  const [pickerQuery, setPickerQuery] = useState("");
  const { byId: crmById, list: crmList } = useKanbanCrmUsers();
  const [descDraft, setDescDraft] = useState("");
  const descTextareaRef = useAutosizeTextarea(descDraft);
  const [fileViewer, setFileViewer] = useState<
    | null
    | { mode: "image"; images: CardFile[]; index: number }
    | { mode: "pdf"; pdfs: CardFile[]; index: number }
  >(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const found = cardId ? findCard(board, cardId) : null;
  const card = found?.card;
  const act = (activityActorLabel ?? "").trim() || undefined;

  const closeFileViewer = useCallback(() => setFileViewer(null), []);

  const viewerGoPrev = useCallback(() => {
    setFileViewer((v) => {
      if (!v) return v;
      const L = v.mode === "image" ? v.images.length : v.pdfs.length;
      if (L <= 1) return v;
      const idx = (v.index - 1 + L) % L;
      return v.mode === "image"
        ? { mode: "image", images: v.images, index: idx }
        : { mode: "pdf", pdfs: v.pdfs, index: idx };
    });
  }, []);

  const viewerGoNext = useCallback(() => {
    setFileViewer((v) => {
      if (!v) return v;
      const L = v.mode === "image" ? v.images.length : v.pdfs.length;
      if (L <= 1) return v;
      const idx = (v.index + 1) % L;
      return v.mode === "image"
        ? { mode: "image", images: v.images, index: idx }
        : { mode: "pdf", pdfs: v.pdfs, index: idx };
    });
  }, []);

  useEffect(() => {
    if (!card || !titleRef.current) return;
    titleRef.current.textContent = card.title;
  }, [card?.id, card?.title]);

  useEffect(() => {
    setRightTab("chat");
    setBlockReasonDraft("");
    setBlockPopupOpen(false);
    setPickerMode(null);
    setFileViewer(null);
  }, [cardId]);

  useEffect(() => {
    if (card) setDescDraft(card.description || "");
  }, [cardId, card?.description]);

  useEffect(() => {
    if (pickerMode === "assign" && card) {
      setPickerIds([...(card.assignees || [])]);
    } else if (pickerMode === "part" && card) {
      setPickerIds([...(card.participants || [])]);
    }
    setPickerQuery("");
  }, [pickerMode, card?.id, cardId]);

  const linkedOrderId = card?.linkedOrderId;
  const kaitenCardIdForChat = card?.kaitenCardId;
  const currentColumnTitle = found?.col?.title || "—";
  const laneTransfer = useMemo(() => {
    if (!cardId || !found || !onMoveToColumn) return null;
    const current = splitBoardLaneColumnTitle(found.col.title);
    if (!current) return null;
    const lanes = new Set<string>();
    const targetColumnByLane = new Map<string, string>();
    for (const col of board.columns) {
      const parts = splitBoardLaneColumnTitle(col.title);
      if (!parts) continue;
      lanes.add(parts.laneName);
      if (parts.stageName.trim().toLowerCase() !== current.stageName.trim().toLowerCase()) continue;
      targetColumnByLane.set(parts.laneName, col.id);
    }
    if (lanes.size < 2) return null;
    return {
      currentLaneName: current.laneName,
      laneNames: [...lanes],
      targetColumnByLane,
    };
  }, [cardId, found, onMoveToColumn, board.columns]);
  const chatActorUserId =
    (commentAuthorUserId ?? "").trim() || board.users[0]?.id || "";

  useEffect(() => {
    if (
      !cardId ||
      !linkedOrderId ||
      kaitenCardIdForChat == null ||
      !Number.isFinite(kaitenCardIdForChat)
    ) {
      return;
    }
    let cancelled = false;
    const load = (opts?: { refresh?: boolean }) => {
      if (cancelled) return;
      if (document.visibilityState !== "visible" && !opts?.refresh) return;
      void (async () => {
        const snap = await fetchOrderKaitenCommentsForKanban(
          linkedOrderId,
          chatActorUserId,
          { refresh: opts?.refresh },
        );
        if (cancelled || !snap.ok) return;
        onApply((b) => {
          const fc = findCard(b, cardId);
          if (!fc) return;
          fc.card.comments = withImagePlaceholders(snap.comments, fc.card);
        });
      })();
    };
    load();
    const pollMs = kaitenClientPollIntervalMs();
    const iv = window.setInterval(() => load(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [cardId, linkedOrderId, kaitenCardIdForChat, chatActorUserId, onApply]);

  const pickerMerged = useMemo(
    () =>
      mergeKanbanPickerUsers(crmList, board.users, board.excludedCrmUserIds),
    [crmList, board.users, board.excludedCrmUserIds],
  );

  const pickerFiltered = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return pickerMerged;
    return pickerMerged.filter((r) => {
      if (pickerRowLabel(r).toLowerCase().includes(q)) return true;
      if ("email" in r && typeof r.email === "string" && r.email.toLowerCase().includes(q)) {
        return true;
      }
      return false;
    });
  }, [pickerMerged, pickerQuery]);

  const adminMentionTag = useKanbanAdminMentionTag();
  const adminMentionUserIds = useMemo(
    () => crmList.filter((u) => isKanbanAdminGroupRole(u.role)).map((u) => u.id),
    [crmList],
  );

  if (!cardId || !card) return null;

  const blocked = isCardBlocked(card);
  const dueHintKind = deadlineHintKind(card.dueDate);
  const currentColumnIndex = board.columns.findIndex((col) => col.id === found.col.id);
  const prevColumnTitle =
    currentColumnIndex > 0 ? board.columns[currentColumnIndex - 1]?.title || "" : "";
  const nextColumnTitle =
    currentColumnIndex >= 0 && currentColumnIndex + 1 < board.columns.length
      ? board.columns[currentColumnIndex + 1]?.title || ""
      : "";
  const movePrevTitle = prevColumnTitle
    ? `Перенести в "${prevColumnTitle}"`
    : "Карточка уже в первом столбце";
  const moveNextTitle = nextColumnTitle
    ? `Перенести в "${nextColumnTitle}"`
    : "Карточка уже в последнем столбце";

  const openBlockPopup = () => {
    setBlockReasonDraft("");
    setBlockPopupOpen(true);
  };

  const confirmBlock = () => {
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      const ok = tryBlockCard(fc.card, b, blockReasonDraft, act);
      if (!ok) {
        toast("Укажите причину остановки работы", true);
        return;
      }
      const reasonForTg = (blockReasonDraft || "").trim();
      setBlockPopupOpen(false);
      setBlockReasonDraft("");
      if (!shouldSkipCrmKanbanTelegram(fc.card.kaitenCardId)) {
        const titleT = (fc.card.title || "").trim() || "Без названия";
        const linkHtml = kanbanCardLinkHtml(cardId, board.id, titleT);
        const who = escapeTelegramHtml((act || "Пользователь").trim());
        const reasonEsc = escapeTelegramHtml(reasonForTg.slice(0, 240));
        const oid = fc.card.linkedOrderId?.trim();
        const { cardWord, orderWord } = oid
          ? cardOrderWordLinks(oid, cardId, board.id)
          : { cardWord: "", orderWord: "" };
        postKanbanCrmTelegramNotify({
          kaitenCardId: fc.card.kaitenCardId,
          event: "tg_block_added",
          parseMode: "HTML",
          lines: [
            `${who} заблокировал(а) ${linkHtml}`,
            ...(reasonEsc ? [`Причина: ${reasonEsc}`] : []),
          ],
          ...(oid
            ? {
                linesAdmin: [
                  `${who} заблокировал(а) ${cardWord} и ${orderWord}`,
                  ...(reasonEsc ? [`Причина: ${reasonEsc}`] : []),
                ],
              }
            : {}),
        });
      }
    });
  };

  const savePicker = () => {
    if (!pickerMode) return;
    const prevAssign = card.assignees || [];
    const prevPart = card.participants || [];
    const kaitenId = card.kaitenCardId;
    const titleLine = (card.title || "").trim() || "Без названия";
    const actorId = (commentAuthorUserId ?? "").trim() || board.users[0]?.id || "";
    const actorLabel =
      crmById.get(actorId)?.displayName ??
      userNameById(board, actorId) ??
      "Пользователь";

    if (pickerMode === "assign") {
      onApply((b) => {
        const fc = findCard(b, cardId);
        if (!fc) return;
        fc.card.assignees = [...pickerIds];
        pushActivity(fc.card, "Изменены ответственные", b.users[0]?.id, b, act);
      });
      if (!shouldSkipCrmKanbanTelegram(kaitenId)) {
        const linkHtml = kanbanCardLinkHtml(cardId, board.id, titleLine);
        const who = escapeTelegramHtml(actorLabel);
        const oid = card.linkedOrderId?.trim();
        const { cardWord, orderWord } = oid
          ? cardOrderWordLinks(oid, cardId, board.id)
          : { cardWord: "", orderWord: "" };
        const added = pickerIds.filter((id) => !prevAssign.includes(id));
        const removed = prevAssign.filter((id) => !pickerIds.includes(id));
        if (added.length) {
          postKanbanCrmTelegramNotify({
            kaitenCardId: kaitenId,
            event: "tg_person_assigned_responsible",
            targetUserIds: added,
            parseMode: "HTML",
            lines: [`${who} назначил(а) вас ответственным в ${linkHtml}`],
            ...(oid
              ? {
                  linesAdmin: [
                    `${who} назначил(а) вас ответственным в ${cardWord} и ${orderWord}`,
                  ],
                }
              : {}),
          });
        }
        if (removed.length) {
          postKanbanCrmTelegramNotify({
            kaitenCardId: kaitenId,
            event: "tg_person_removed_from_card",
            targetUserIds: removed,
            parseMode: "HTML",
            lines: [`${who} снял(а) вас с ответственных по ${linkHtml}`],
            ...(oid
              ? {
                  linesAdmin: [
                    `${who} снял(а) вас с ответственных по ${cardWord} и ${orderWord}`,
                  ],
                }
              : {}),
          });
        }
      }
    } else {
      onApply((b) => {
        const fc = findCard(b, cardId);
        if (!fc) return;
        fc.card.participants = [...pickerIds];
        pushActivity(fc.card, "Изменён состав участников", b.users[0]?.id, b, act);
      });
      if (!shouldSkipCrmKanbanTelegram(kaitenId)) {
        const linkHtml = kanbanCardLinkHtml(cardId, board.id, titleLine);
        const who = escapeTelegramHtml(actorLabel);
        const oid = card.linkedOrderId?.trim();
        const { cardWord, orderWord } = oid
          ? cardOrderWordLinks(oid, cardId, board.id)
          : { cardWord: "", orderWord: "" };
        const added = pickerIds.filter((id) => !prevPart.includes(id));
        const removed = prevPart.filter((id) => !pickerIds.includes(id));
        if (added.length) {
          postKanbanCrmTelegramNotify({
            kaitenCardId: kaitenId,
            event: "tg_person_added_to_card",
            targetUserIds: added,
            parseMode: "HTML",
            lines: [`${who} добавил(а) вас в ${linkHtml}`],
            ...(oid
              ? {
                  linesAdmin: [`${who} добавил(а) вас в ${cardWord} и ${orderWord}`],
                }
              : {}),
          });
        }
        if (removed.length) {
          postKanbanCrmTelegramNotify({
            kaitenCardId: kaitenId,
            event: "tg_person_removed_from_card",
            targetUserIds: removed,
            parseMode: "HTML",
            lines: [`${who} исключил(а) вас из участников ${linkHtml}`],
            ...(oid
              ? {
                  linesAdmin: [
                    `${who} исключил(а) вас из участников ${cardWord} и ${orderWord}`,
                  ],
                }
              : {}),
          });
        }
      }
    }
    setPickerMode(null);
  };

  const togglePickerId = (uid: string) => {
    setPickerIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
    );
  };

  const addCheckItem = () => {
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      if (fc.card.parentCardId) {
        fc.card.productionChecklist = fc.card.productionChecklist || [];
        fc.card.productionChecklist.push({
          id: generateId("pchk"),
          text: "Новый пункт",
          completed: false,
          sourceFileId: "manual",
          sourceFileName: "manual",
          fromArchive: false,
        });
        return;
      }
      fc.card.checklist.push({ id: generateId("ch"), text: "Новый пункт", completed: false });
    });
  };

  const sendComment = async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const actor = chatActorUserId || board.users[0]?.id || "";
    const mentionedIds = parseMentionUserIdsFromText(trimmed, crmList, {
      adminMentionTag,
      adminUserIds: adminMentionUserIds,
    }).filter((id) => id !== actor);

    const fireMentionTelegram = () => {
      if (!mentionedIds.length) return;
      const actorRow = crmById.get(actor);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const orderNum = extractOrderNumberLabelFromKanbanCardTitle(
        (card.title || "").trim(),
      );
      const oid = card.linkedOrderId?.trim();
      postKanbanCrmTelegramNotify({
        kaitenCardId: card.kaitenCardId,
        event: "tg_mentioned_in_comment",
        alternatePrefKeys: ["tg_comment_added"],
        targetUserIds: mentionedIds,
        mentionContext: {
          actorDisplayName: userPersonDisplayName(actorRow ?? {}),
          actorMentionHandle: actorRow?.mentionHandle ?? null,
          linkedOrderId: oid ?? null,
          orderNumberLabel: orderNum || null,
          kaitenCardId: card.kaitenCardId ?? null,
          kanbanCardAbsoluteUrl: kanbanCardAbsoluteUrl(cardId, board.id),
          orderPageAbsoluteUrl: oid
            ? `${origin}/orders/${encodeURIComponent(oid)}`
            : null,
        },
      });
    };

    const linkedKaiten =
      Boolean(card.linkedOrderId) &&
      card.kaitenCardId != null &&
      Number.isFinite(card.kaitenCardId);

    if (linkedKaiten && card.linkedOrderId) {
      const r = await postOrderKaitenComment(card.linkedOrderId, trimmed);
      if (!r.ok) {
        toast(r.error, true);
        return false;
      }
      fireMentionTelegram();
      const chatActor = chatActorUserId || board.users[0]?.id || "";
      let snap = await fetchOrderKaitenCommentsForKanban(card.linkedOrderId, chatActor, {
        refresh: true,
      });
      if (!snap.ok) {
        snap = await fetchOrderKaitenCommentsForKanban(card.linkedOrderId, chatActor);
      }
      if (snap.ok) {
        onApply((b) => {
          const fc = findCard(b, cardId);
          if (!fc) return;
          fc.card.comments = withImagePlaceholders(snap.comments, fc.card);
          pushActivity(fc.card, "Комментарий", chatActor, b, act);
        });
        return true;
      }
      toast("Сообщение ушло в Kaiten, список чата не обновился — откройте карточку снова", true);
      return true;
    }

    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      const c = fc.card;
      const localActor =
        (commentAuthorUserId ?? "").trim() || b.users[0]?.id || "";
      c.comments = c.comments || [];
      c.comments.push({
        id: generateId("cm"),
        userId: localActor,
        text: trimmed,
        createdAt: new Date().toISOString(),
      });
      pushActivity(c, "Комментарий", localActor, b, act);
    });
    fireMentionTelegram();
    if (!shouldSkipCrmKanbanTelegram(card.kaitenCardId)) {
      const authorName =
        crmById.get(actor)?.displayName ??
        userNameById(board, actor) ??
        "Пользователь";
      const titleT = (card.title || "").trim() || "Без названия";
      const linkHtml = kanbanCardLinkHtml(cardId, board.id, titleT);
      const who = escapeTelegramHtml(authorName);
      const snippet = escapeTelegramHtml(trimmed.slice(0, 400));
      const oid = card.linkedOrderId?.trim();
      const { cardWord, orderWord } = oid
        ? cardOrderWordLinks(oid, cardId, board.id)
        : { cardWord: "", orderWord: "" };
      postKanbanCrmTelegramNotify({
        kaitenCardId: card.kaitenCardId,
        event: "tg_comment_added",
        parseMode: "HTML",
        lines: [`${who} оставил(а) комментарий к ${linkHtml}\n«${snippet}»`],
        ...(oid
          ? {
              linesAdmin: [
                `${who} оставил(а) комментарий к ${cardWord} и ${orderWord}\n«${snippet}»`,
              ],
            }
          : {}),
        broadcastExcludeUserIds: mentionedIds,
      });
    }
    if (
      card.linkedOrderId &&
      (isOrderChatCorrectionTrigger(trimmed) ||
        isOrderProstheticsRequestTrigger(trimmed))
    ) {
      void fetch(`/api/orders/${card.linkedOrderId}/chat-corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: trimmed }),
      }).catch(() => {});
    }
    return true;
  };

  const attachFilesFromChat = async (fileList: File[]) => {
    if (!fileList.length) return;
    const actor = chatActorUserId || board.users[0]?.id || "";
    const productionOnly = Boolean(card.parentCardId || (card.childCardIds || []).length > 0);
    const linked =
      !productionOnly &&
      Boolean(card.linkedOrderId) &&
      card.kaitenCardId != null &&
      Number.isFinite(card.kaitenCardId);
    let attachedOkCount = 0;
    for (const file of fileList) {
      try {
        let orderAttId: string | undefined;
        if (linked && card.linkedOrderId) {
          const up = await uploadOrderAttachmentFromFile(card.linkedOrderId, file);
          if (!up.ok) {
            toast(up.error, true);
            continue;
          }
          orderAttId = up.id;
        }
        const cf = await readFileAsCardFile(file, actor);
        if (orderAttId) cf.orderAttachmentId = orderAttId;
        onApply((b) => {
          const fc = findCard(b, cardId);
          if (!fc) return;
          fc.card.files = [...(fc.card.files || []), cf];
          fc.card.updatedAt = new Date().toISOString();
          pushActivity(fc.card, `Прикреплён файл: ${cf.name}`, actor, b, act);
          if (isCardFileImage(cf)) {
            fc.card.comments = fc.card.comments || [];
            fc.card.comments.push({
              id: generateId("cm"),
              userId: actor,
              text: "",
              createdAt: new Date().toISOString(),
              imageFileId: cf.id,
            });
          }
        });
        attachedOkCount += 1;
      } catch (e) {
        toast(e instanceof Error ? e.message : "Не удалось прочитать файл", true);
      }
    }
    if (attachedOkCount > 0 && !card.parentCardId) {
      onParentProductionFilesUpdated?.(cardId);
    }
  };

  const baseInput =
    "w-full rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]";

  const creatorLabel = card.createdByUserId
    ? (crmById.get(card.createdByUserId)?.displayName ??
      userNameById(board, card.createdByUserId))
    : "—";
  const createdWhen = formatDateTimeRu(card.createdAt);

  const cardImageFiles = (card.files || []).filter((f) => isCardFileImage(f));
  const cardPdfFiles = (card.files || []).filter((f) => isPdfMime(f.mime || "", f.name));
  const childStatusRows = (card.childCardIds || [])
    .map((childId) => {
      for (const col of board.columns) {
        const child = col.cards.find((x) => x.id === childId);
        if (child) {
          const checklist = child.productionChecklist || [];
          const done = checklist.filter((x) => x.completed).length;
          return {
            id: child.id,
            title: child.title,
            columnTitle: col.title,
            checklistDone: done,
            checklistTotal: checklist.length,
          };
        }
      }
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const childStatusBadge = (columnTitle: string): string => {
    const col = columnTitle.trim().toLowerCase();
    if (col === "готово") {
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
    }
    if (col === "в работе") {
      return "border-amber-500/40 bg-amber-500/15 text-amber-300";
    }
    if (col === "к исполнению") {
      return "border-zinc-500/40 bg-zinc-500/15 text-zinc-300";
    }
    return "border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-muted)]";
  };

  const openAttachment = (f: CardFile) => {
    if (isCardFileImage(f)) {
      const ix = cardImageFiles.findIndex((x) => x.id === f.id);
      setFileViewer({
        mode: "image",
        images: cardImageFiles,
        index: ix >= 0 ? ix : 0,
      });
    } else if (isPdfMime(f.mime || "", f.name)) {
      const ix = cardPdfFiles.findIndex((x) => x.id === f.id);
      setFileViewer({
        mode: "pdf",
        pdfs: cardPdfFiles,
        index: ix >= 0 ? ix : 0,
      });
    } else {
      openOrDownloadCardFile(f);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      {blockPopupOpen && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setBlockPopupOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] p-4 text-[var(--kaiten-modal-text)] shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 text-sm font-semibold">Блокировка карточки</h3>
            <p className="mt-1 text-[0.75rem] text-[var(--kaiten-modal-muted)]">
              Укажите причину остановки — это метка на доске для команды; редактирование и
              перенос карточки не ограничиваются.
            </p>
            <textarea
              value={blockReasonDraft}
              onChange={(e) => setBlockReasonDraft(e.target.value)}
              placeholder="Например: ждём материалы от клиента…"
              rows={4}
              className={`${baseInput} mt-3 resize-y`}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] px-3 py-1.5 text-sm"
                onClick={() => setBlockPopupOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
                onClick={confirmBlock}
              >
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}

      {pickerMode && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPickerMode(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] p-4 text-[var(--kaiten-modal-text)] shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 text-sm font-semibold">
              {pickerMode === "assign" ? "Ответственные" : "Участники"}
            </h3>
            <p className="mt-1 text-[0.75rem] text-[var(--kaiten-modal-muted)]">
              Любой активный пользователь CRM. Ответственные — с золотой обводкой на карточке.
            </p>
            <input
              type="search"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Поиск по имени или email…"
              className={`${baseInput} mt-2`}
            />
            <div className="mt-3 max-h-[240px] space-y-2 overflow-y-auto">
              {pickerFiltered.length === 0 ? (
                <p className="text-[0.8125rem] text-[var(--kaiten-modal-muted)]">
                  {pickerMerged.length === 0
                    ? "Нет пользователей (проверьте доступ к CRM)."
                    : "Никого не найдено."}
                </p>
              ) : (
                pickerFiltered.map((row) => (
                  <label
                    key={row.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--kaiten-modal-border)] px-2 py-1.5 text-[0.8125rem]"
                  >
                    <input
                      type="checkbox"
                      checked={pickerIds.includes(row.id)}
                      onChange={() => togglePickerId(row.id)}
                      className="rounded"
                    />
                    <KanbanPersonAvatar
                      userId={row.id}
                      homeBoard={board}
                      variant={pickerMode === "assign" ? "assignee" : "participant"}
                      size="picker"
                      titleSuffix=""
                    />
                    {pickerRowLabel(row)}
                  </label>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--kaiten-modal-border)] px-3 py-1.5 text-sm"
                onClick={() => setPickerMode(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-medium text-white"
                onClick={savePicker}
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="flex w-full max-w-[min(1200px,100vw-24px)] flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {blocked && (
          <div className="flex items-stretch gap-2 rounded-t-[10px] border border-b-0 border-red-900/50 bg-gradient-to-b from-[#dc2626] to-[#b91c1c] px-3 py-2.5 text-white shadow-md dark:from-[#991b1b] dark:to-[#7f1d1d]">
            <IconBrick className="h-5 w-5 shrink-0 text-white" />
            <div className="min-w-0 flex-1">
              <div className="text-[0.65rem] font-bold uppercase tracking-wide opacity-90">
                Работа остановлена
                {card.blockedAt ? ` · ${formatBlockedAt(card.blockedAt)}` : ""}
              </div>
              <div className="mt-0.5 text-[0.8125rem] font-medium leading-snug">
                {(card.blockReason || "").trim() || "—"}
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 self-center rounded-md bg-white/15 px-3 py-1.5 text-[0.75rem] font-semibold text-white hover:bg-white/25"
              onClick={() =>
                onApply((b) => {
                  const fc = findCard(b, cardId);
                  if (!fc) return;
                  performUnblock(fc.card, b, act);
                })
              }
            >
              Снять блокировку
            </button>
          </div>
        )}

        <div
          className={`relative flex min-h-[min(72vh,920px)] max-h-[min(96vh,1400px)] flex-col overflow-hidden border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] text-[var(--kaiten-modal-text)] shadow-[0_16px_40px_rgba(0,0,0,0.55)] ${
            blocked ? "rounded-b-[10px] rounded-t-none border-t-0" : "rounded-[10px]"
          }`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--kaiten-modal-border)] px-4 py-5 sm:gap-4 sm:px-6 sm:py-6">
            <div className="min-w-0 flex-1 pr-1">
              <h2
                ref={titleRef}
                contentEditable={canEditTitle}
                suppressContentEditableWarning
                className="m-0 break-words text-2xl font-semibold leading-tight tracking-tight text-[var(--kaiten-modal-text)] outline-none sm:text-3xl md:text-4xl"
                onBlur={() => {
                  void (async () => {
                    if (!canEditTitle) return;
                    const el = titleRef.current;
                    if (!el) return;
                    const t = (el.textContent || "").trim();
                    if (!t) {
                      el.textContent = card.title;
                      return;
                    }
                    if (t === card.title) return;
                    const ok = window.confirm(
                      `Подтвердите смену заголовка карточки.\n\nБыло: ${card.title}\nСтанет: ${t}`,
                    );
                    if (!ok) {
                      el.textContent = card.title;
                      return;
                    }
                    if (
                      card.linkedOrderId &&
                      card.kaitenCardId != null &&
                      Number.isFinite(card.kaitenCardId)
                    ) {
                      const r = await patchOrderKaitenCard(card.linkedOrderId, { title: t });
                      if (!r.ok) {
                        toast(r.error, true);
                        el.textContent = card.title;
                        return;
                      }
                    }
                    onApply((b) => {
                      const fc = findCard(b, cardId);
                      if (!fc) return;
                      fc.card.title = t;
                      pushActivity(fc.card, "Изменён заголовок", b.users[0]?.id, b, act);
                    });
                  })();
                }}
                onKeyDown={(e) => {
                  if (!canEditTitle) return;
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).blur();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    const el = titleRef.current;
                    if (el) el.textContent = card.title;
                    (e.currentTarget as HTMLElement).blur();
                  }
                }}
              />
              <div className="mt-3 text-base leading-relaxed text-emerald-700/95 dark:text-emerald-400/95 sm:mt-4 sm:text-lg">
                <span className="font-semibold">Создал(а):</span> {creatorLabel}
                <span className="text-[var(--kaiten-modal-muted)]"> · </span>
                <span>{createdWhen || "—"}</span>
              </div>
              {card.lastMovedAt && (
                <div className="mt-2 text-sm text-[var(--kaiten-modal-muted)] sm:text-base">
                  Перемещена · {relativeTimeRu(card.lastMovedAt)}
                </div>
              )}
            </div>
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)] sm:h-12 sm:w-12"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <IconX className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 border-b border-[var(--kaiten-modal-border)] px-3 py-2.5">
            <button
              type="button"
              title={blocked ? "Снять блокировку" : "Заблокировать карточку"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-input)] hover:text-[var(--kaiten-modal-text)] disabled:opacity-40"
              onClick={() => {
                if (blocked) {
                  onApply((b) => {
                    const fc = findCard(b, cardId);
                    if (!fc) return;
                    performUnblock(fc.card, b, act);
                    if (!shouldSkipCrmKanbanTelegram(fc.card.kaitenCardId)) {
                      const t = (fc.card.title || "").trim() || "Без названия";
                      const linkHtml = kanbanCardLinkHtml(cardId, board.id, t);
                      const who = escapeTelegramHtml((act || "Пользователь").trim());
                      const oid = fc.card.linkedOrderId?.trim();
                      const { cardWord, orderWord } = oid
                        ? cardOrderWordLinks(oid, cardId, board.id)
                        : { cardWord: "", orderWord: "" };
                      postKanbanCrmTelegramNotify({
                        kaitenCardId: fc.card.kaitenCardId,
                        event: "tg_card_unblocked",
                        parseMode: "HTML",
                        lines: [`${who} снял(а) блокировку с ${linkHtml}`],
                        ...(oid
                          ? {
                              linesAdmin: [
                                `${who} снял(а) блокировку с ${cardWord} и ${orderWord}`,
                              ],
                            }
                          : {}),
                      });
                    }
                  });
                } else openBlockPopup();
              }}
            >
              {blocked ? <IconUnlock className="h-4 w-4" /> : <IconBrick className="h-4 w-4" />}
            </button>
            <button
              type="button"
              title={movePrevTitle}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-text)] disabled:opacity-40"
              onClick={() => onMovePrevStage(cardId)}
            >
              <IconArrowLeft />
            </button>
            <button
              type="button"
              title={moveNextTitle}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-text)] disabled:opacity-40"
              onClick={() => onMoveNextStage(cardId)}
            >
              <IconArrowRight />
            </button>
            <div className="mx-1 h-6 w-px bg-[var(--kaiten-modal-border)]" aria-hidden />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                Отв.
              </span>
              {(card.assignees || []).map((uid) => (
                <span key={uid}>
                  <KanbanPersonAvatar
                    userId={uid}
                    homeBoard={board}
                    variant="assignee"
                    size="md"
                    titleSuffix=""
                  />
                </span>
              ))}
              <button
                type="button"
                disabled={!canManageAssignees}
                title="Добавить ответственного"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-[var(--kaiten-modal-muted)] text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-control)] disabled:opacity-40"
                onClick={() => setPickerMode("assign")}
              >
                <IconPlus />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pl-1">
              <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                Участн.
              </span>
              {(card.participants || []).map((uid) => (
                <span key={uid}>
                  <KanbanPersonAvatar
                    userId={uid}
                    homeBoard={board}
                    variant="participant"
                    size="md"
                    titleSuffix=""
                  />
                </span>
              ))}
              <button
                type="button"
                disabled={!canManageParticipants}
                title="Добавить участника"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-[var(--kaiten-modal-muted)] text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-control)] disabled:opacity-40"
                onClick={() => setPickerMode("part")}
              >
                <IconPlus />
              </button>
            </div>
            <button
              type="button"
              title="Скопировать ссылку на карточку"
              aria-label="Поделиться — копировать ссылку"
              className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] px-2.5 text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-input)] hover:text-[var(--kaiten-modal-text)]"
              onClick={() => onCopyCardLink(cardId)}
            >
              <IconLink className="h-4 w-4 shrink-0" />
              <span className="hidden text-[0.65rem] font-semibold uppercase tracking-wide sm:inline">
                Поделиться
              </span>
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-2.5">
              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    {trackLaneFieldLabel ?? "Расположение"}
                  </div>
                  <select
                    className={baseInput}
                    disabled={!canEditTrack}
                    value={card.trackLane || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onApply((b) => {
                        const fc = findCard(b, cardId);
                        if (!fc) return;
                        fc.card.trackLane = v;
                        pushActivity(
                          fc.card,
                          trackLaneFieldLabel ? "Изменена доска" : "Изменена дорожка",
                          b.users[0]?.id,
                          b,
                          act,
                        );
                      });
                    }}
                  >
                    <option value="">— не выбрано —</option>
                    {(trackLaneOptions ?? [...trackLanes()]).map((lane) => (
                      <option key={lane.id} value={lane.id}>
                        {lane.name}
                      </option>
                    ))}
                  </select>
                  {laneTransfer ? (
                    <div className="mt-2">
                      <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                        Перенос между дорожками
                      </div>
                      <select
                        className={baseInput}
                        value={laneTransfer.currentLaneName}
                        onChange={(e) => {
                          const laneName = e.target.value;
                          if (laneName === laneTransfer.currentLaneName) return;
                          const targetColumnId = laneTransfer.targetColumnByLane.get(laneName);
                          if (!targetColumnId) {
                            toast("Для этой дорожки нет подходящего столбца этапа", true);
                            return;
                          }
                          if (!cardId || !onMoveToColumn) return;
                          onMoveToColumn(cardId, targetColumnId);
                        }}
                      >
                        {laneTransfer.laneNames.map((laneName) => (
                          <option key={laneName} value={laneName}>
                            {laneName}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
                <div>
                  <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    Столбец
                  </div>
                  <div className={`${baseInput} min-h-[2.25rem] truncate`}>
                    {currentColumnTitle}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    Тип карточки
                  </div>
                  <select
                    className={baseInput}
                    value={card.cardTypeId || ""}
                    onChange={(e) => {
                      void (async () => {
                        const v = e.target.value;
                        const selectedTypeName =
                          v.trim().length > 0
                            ? ((board.cardTypes || kaitenCardTypes()).find(
                                (t) => t.id === v,
                              )?.name ?? null)
                            : null;
                        if (card.linkedOrderId) {
                          const hasKaiten =
                            card.kaitenCardId != null &&
                            Number.isFinite(card.kaitenCardId);
                          if (hasKaiten) {
                            const r = await patchOrderKaitenCard(card.linkedOrderId, {
                              kaitenCardTypeId: v.trim() ? v : null,
                              kaitenCardTypeName: selectedTypeName,
                            });
                            if (!r.ok) {
                              toast(r.error, true);
                              return;
                            }
                          } else if (isDemo) {
                            const res = await fetch(
                              `/api/orders/${card.linkedOrderId}`,
                              {
                                method: "PATCH",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  kaitenCardTypeId: v.trim() ? v : null,
                                  kaitenCardTypeName: selectedTypeName,
                                }),
                              },
                            );
                            const data = (await res.json().catch(() => ({}))) as {
                              error?: string;
                            };
                            if (!res.ok) {
                              toast(
                                typeof data.error === "string"
                                  ? data.error
                                  : "Не удалось сохранить тип карточки",
                                true,
                              );
                              return;
                            }
                          }
                        }
                        onApply((b) => {
                          const fc = findCard(b, cardId);
                          if (!fc) return;
                          fc.card.cardTypeId = v;
                          pushActivity(
                            fc.card,
                            "Изменён тип карточки",
                            b.users[0]?.id,
                            b,
                            act,
                          );
                        });
                      })();
                    }}
                  >
                    <option value="">— не выбран —</option>
                    {(board.cardTypes || kaitenCardTypes()).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-amber-800/90 dark:text-amber-300/90">
                  Внутренний срок
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    className={`${baseInput} max-w-[12rem]`}
                    disabled={!canEditDueDate}
                    value={card.dueDate || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onApply((b) => {
                        const fc = findCard(b, cardId);
                        if (!fc) return;
                        fc.card.dueDate = v;
                        pushActivity(fc.card, "Изменён срок", b.users[0]?.id, b, act);
                      });
                      if (!shouldSkipCrmKanbanTelegram(card.kaitenCardId)) {
                        const titleLine = (card.title || "").trim() || "Без названия";
                        const linkHtml = kanbanCardLinkHtml(cardId, board.id, titleLine);
                        const duePart = v
                          ? `новый срок ${escapeTelegramHtml(v)}`
                          : "срок сброшен";
                        const oid = card.linkedOrderId?.trim();
                        const { cardWord, orderWord } = oid
                          ? cardOrderWordLinks(oid, cardId, board.id)
                          : { cardWord: "", orderWord: "" };
                        postKanbanCrmTelegramNotify({
                          kaitenCardId: card.kaitenCardId,
                          event: "tg_due_changed",
                          parseMode: "HTML",
                          lines: [`Изменён срок в ${linkHtml}: ${duePart}`],
                          ...(oid
                            ? {
                                linesAdmin: [
                                  `Изменён срок в ${cardWord} и ${orderWord}: ${duePart}`,
                                ],
                              }
                            : {}),
                        });
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wide transition-colors ${
                      card.urgent
                        ? "border-orange-600/80 bg-gradient-to-b from-orange-500 to-red-600 text-white shadow-sm"
                        : "border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-muted)] hover:border-orange-400/50 hover:text-orange-700 dark:hover:text-orange-300"
                    }`}
                    title={
                      card.urgent
                        ? "Снять метку «Срочно» (срок не меняется)"
                        : "Пометить как срочное (срок не меняется)"
                    }
                    onClick={() =>
                      onApply((b) => {
                        const fc = findCard(b, cardId);
                        if (!fc) return;
                        const next = !fc.card.urgent;
                        fc.card.urgent = next;
                        pushActivity(
                          fc.card,
                          next ? "Отмечена как срочная" : "Снята метка «Срочно»",
                          b.users[0]?.id,
                          b,
                          act,
                        );
                      })
                    }
                  >
                    Срочно
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-sky-800/90 dark:text-sky-300/90">
                  Описание и детали заказа
                </div>
                <div className="grid min-h-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(10.5rem,34%)] sm:items-start">
                  <textarea
                    ref={descTextareaRef}
                    className={`${baseInput} min-h-[100px] resize-none overflow-hidden sm:min-h-[120px]`}
                    rows={3}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    onBlur={() => {
                      void (async () => {
                        if (descDraft === (card.description || "")) return;
                        if (
                          card.linkedOrderId &&
                          card.kaitenCardId != null &&
                          Number.isFinite(card.kaitenCardId)
                        ) {
                          const r = await patchOrderKaitenCard(card.linkedOrderId, {
                            description: descDraft,
                          });
                          if (!r.ok) {
                            toast(r.error, true);
                            setDescDraft(card.description || "");
                            return;
                          }
                        }
                        onApply((b) => {
                          const fc = findCard(b, cardId);
                          if (!fc) return;
                          fc.card.description = descDraft;
                          pushActivity(fc.card, "Обновлено описание", b.users[0]?.id, b, act);
                        });
                        if (!shouldSkipCrmKanbanTelegram(card.kaitenCardId)) {
                          const titleLine = (card.title || "").trim() || "Без названия";
                          const linkHtml = kanbanCardLinkHtml(cardId, board.id, titleLine);
                          const oid = card.linkedOrderId?.trim();
                          const { cardWord, orderWord } = oid
                            ? cardOrderWordLinks(oid, cardId, board.id)
                            : { cardWord: "", orderWord: "" };
                          postKanbanCrmTelegramNotify({
                            kaitenCardId: card.kaitenCardId,
                            event: "tg_description_changed",
                            parseMode: "HTML",
                            lines: [`Обновлено описание в ${linkHtml}`],
                            ...(oid
                              ? {
                                  linesAdmin: [
                                    `Обновлено описание в ${cardWord} и ${orderWord}`,
                                  ],
                                }
                              : {}),
                          });
                        }
                      })();
                    }}
                  />
                  <aside
                    className={`flex min-h-[100px] flex-col rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] p-1.5 sm:min-h-[120px] sm:max-h-[min(22rem,50vh)]`}
                  >
                    <div className="mb-1 shrink-0 text-[0.55rem] font-semibold uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                      Файлы наряда и чата
                    </div>
                    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden">
                      {(card.files || []).length === 0 ? (
                        <p className="m-0 px-0.5 py-1 text-[0.7rem] leading-snug text-[var(--kaiten-modal-muted)]">
                          {card.parentCardId || (card.childCardIds || []).length > 0
                            ? "Файлы производства хранятся только в CRM-канбане. Перетащите архив/файл в чат справа."
                            : "Вложения из наряда подтягиваются сюда автоматически. Чтобы отправить ещё файл в Kaiten и обсудить в чате — перетащите его в область чата справа."}
                        </p>
                      ) : (
                        (card.files || []).map((f) => (
                          <div
                            key={f.id}
                            className="group relative rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] py-0.5 pl-1 pr-14"
                          >
                            <button
                              type="button"
                              className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded px-0.5 py-0.5 text-left transition-opacity hover:opacity-90"
                              onClick={() => openAttachment(f)}
                              title={f.name}
                            >
                              <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[var(--kaiten-modal-border)] bg-black/25 px-0.5 text-center text-[0.5rem] font-bold uppercase leading-tight tracking-tight text-[var(--kaiten-modal-muted)]"
                                aria-hidden
                              >
                                {cardFileExtensionLabel(f.name, f.mime)}
                              </span>
                              <span className="min-w-0 flex-1 break-words text-left text-[0.7rem] leading-snug text-[var(--kaiten-modal-text)] line-clamp-3">
                                {f.name}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="absolute right-5 top-1/2 -translate-y-1/2 rounded bg-[var(--kaiten-modal-bg)]/90 p-0.5 text-[var(--kaiten-modal-muted)] opacity-0 shadow-sm ring-1 ring-[var(--kaiten-modal-border)] transition-opacity hover:text-[var(--kaiten-modal-text)] group-hover:opacity-100"
                              title="Скачать файл"
                              aria-label="Скачать файл"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadCardFile(f);
                              }}
                            >
                              <span className="px-1 text-[0.6rem] leading-none">↓</span>
                            </button>
                            <button
                              type="button"
                              className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded bg-[var(--kaiten-modal-bg)]/90 p-0.5 text-[var(--kaiten-modal-muted)] opacity-0 shadow-sm ring-1 ring-[var(--kaiten-modal-border)] transition-opacity hover:text-red-500 group-hover:opacity-100"
                              title="Убрать файл"
                              aria-label="Убрать файл"
                              onClick={(e) => {
                                e.stopPropagation();
                                void (async () => {
                                  if (f.orderAttachmentId && card.linkedOrderId) {
                                    const del = await deleteOrderAttachmentById(
                                      card.linkedOrderId,
                                      f.orderAttachmentId,
                                    );
                                    if (!del.ok) {
                                      toast(del.error, true);
                                      return;
                                    }
                                  }
                                  onApply((b) => {
                                    const fc = findCard(b, cardId);
                                    if (!fc) return;
                                    fc.card.files = (fc.card.files || []).filter(
                                      (x) => x.id !== f.id,
                                    );
                                    fc.card.updatedAt = new Date().toISOString();
                                    pushActivity(
                                      fc.card,
                                      `Удалён файл: ${f.name}`,
                                      b.users[0]?.id,
                                      b,
                                      act,
                                    );
                                  });
                                })();
                              }}
                            >
                              <IconX className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </aside>
                </div>
              </div>

              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    {card.parentCardId ? "Производственный чеклист" : "Чеклист"}
                  </span>
                  <button
                    type="button"
                    className="text-[0.75rem] text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)] disabled:opacity-40"
                    onClick={addCheckItem}
                  >
                    + Пункт
                  </button>
                </div>
                <ChecklistEditor
                  card={card}
                  cardId={cardId}
                  onApply={onApply}
                  activityActorLabel={act}
                  kaitenLinked={
                    Boolean(
                      card.linkedOrderId &&
                        card.kaitenCardId != null &&
                        Number.isFinite(card.kaitenCardId),
                    )
                  }
                />
              </div>

              {!card.parentCardId && childStatusRows.length > 0 ? (
                <div className="mb-3">
                  <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    Дочерние карточки производства
                  </div>
                  <div className="space-y-1.5">
                    {childStatusRows.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[0.8rem] text-[var(--kaiten-modal-text)]">
                            {row.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-[0.68rem] text-[var(--kaiten-modal-muted)]">
                            <span
                              className={`inline-flex rounded border px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide ${childStatusBadge(row.columnTitle)}`}
                            >
                              {row.columnTitle}
                            </span>
                            {row.checklistTotal > 0
                              ? ` · чеклист ${row.checklistDone}/${row.checklistTotal}`
                              : ""}
                          </div>
                        </div>
                        {onOpenLinkedCard ? (
                          <button
                            type="button"
                            className="shrink-0 rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] px-2 py-1 text-[0.68rem] text-[var(--kaiten-modal-text)]"
                            onClick={() => onOpenLinkedCard(row.id)}
                          >
                            Открыть
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              </div>

              {dueHintKind !== "none" ? (
                <div className="shrink-0 px-3 pb-0 pt-1">
                  <DeadlineTomorrowHint />
                </div>
              ) : null}
            </div>

            <div className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-aside)] sm:w-[min(400px,42%)] sm:max-w-md sm:border-l sm:border-t-0">
              <div className="flex overflow-hidden rounded-md border border-[var(--kaiten-modal-border)]">
                <button
                  type="button"
                  className={`flex-1 px-2 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide ${
                    rightTab === "chat"
                      ? "bg-[var(--kaiten-modal-control)] text-[var(--kaiten-accent)] shadow-[inset_0_-2px_0_0_var(--kaiten-accent)]"
                      : "bg-[var(--kaiten-modal-bg)] text-[var(--kaiten-modal-muted)]"
                  }`}
                  onClick={() => setRightTab("chat")}
                >
                  Чат карточки
                </button>
                <button
                  type="button"
                  className={`flex-1 px-2 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide ${
                    rightTab === "act"
                      ? "bg-[var(--kaiten-modal-control)] text-[var(--kaiten-accent)] shadow-[inset_0_-2px_0_0_var(--kaiten-accent)]"
                      : "bg-[var(--kaiten-modal-bg)] text-[var(--kaiten-modal-muted)]"
                  }`}
                  onClick={() => setRightTab("act")}
                >
                  Активность
                </button>
              </div>
              {rightTab === "chat" ? (
                <ChatPanel
                  card={card}
                  board={board}
                  adminMentionTag={adminMentionTag}
                  adminMentionUserIds={adminMentionUserIds}
                  onSend={sendComment}
                  onFilesDropped={attachFilesFromChat}
                  onOpenAttachment={openAttachment}
                />
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 text-[0.8125rem]">
                  {(card.activity || []).slice(0, 40).map((a) => {
                    const u = board.users.find((x) => x.id === a.userId);
                    const name =
                      (a.actorLabel || "").trim() ||
                      crmById.get(a.userId)?.displayName ||
                      u?.name ||
                      "—";
                    return (
                      <div
                        key={a.id}
                        className="mb-2 border-b border-[var(--kaiten-modal-border)]/50 pb-2 last:border-0"
                      >
                        <span className="text-[var(--kaiten-modal-muted)]">
                          {relativeTimeRu(a.at)}
                        </span>
                        {" · "}
                        {name}: {a.text}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {fileViewer ? (
        <CardAttachmentViewerOverlay
          state={fileViewer}
          onClose={closeFileViewer}
          onPrev={viewerGoPrev}
          onNext={viewerGoNext}
          onDownload={downloadCardFile}
        />
      ) : null}
    </div>
  );
}

type AttachmentViewerState =
  | { mode: "image"; images: CardFile[]; index: number }
  | { mode: "pdf"; pdfs: CardFile[]; index: number };

/** Превью вложения: повтор при сбое загрузки (сеть / сессия / кэш), плейсхолдер если не удалось. */
function KanbanAttachmentImg({
  file,
  alt,
  className,
  variant = "chat",
}: {
  file: CardFile;
  alt: string;
  className?: string;
  /** В полноэкранном просмотре — светлый текст на чёрном фоне. */
  variant?: "chat" | "viewer";
}) {
  const base = (file.dataUrl || "").trim();
  const [src, setSrc] = useState(base);
  const [failed, setFailed] = useState(!base);
  const retryIx = useRef(0);

  useEffect(() => {
    setSrc(base);
    setFailed(!base);
    retryIx.current = 0;
  }, [base, file.id]);

  const onError = useCallback(() => {
    if (base.startsWith("data:")) {
      setFailed(true);
      return;
    }
    if (!base) {
      setFailed(true);
      return;
    }
    const maxExtra = 2;
    if (retryIx.current >= maxExtra) {
      setFailed(true);
      return;
    }
    retryIx.current++;
    const sep = base.includes("?") ? "&" : "?";
    setSrc(`${base}${sep}_kb=${retryIx.current}_${Date.now()}`);
  }, [base]);

  if (failed) {
    const muted =
      variant === "viewer"
        ? "text-white/75"
        : "text-[var(--kaiten-modal-muted)]";
    const bg = variant === "viewer" ? "bg-white/10" : "bg-black/35";
    return (
      <div
        className={`flex h-full min-h-[4rem] w-full flex-col items-center justify-center gap-1 px-1 text-center ${muted} ${bg} ${className ?? ""}`}
      >
        <span className="text-[0.6rem] leading-tight">
          Превью недоступно · откройте файл по клику
        </span>
        <span className="line-clamp-3 break-all text-[0.55rem] opacity-80">
          {file.name}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || base}
      alt={alt}
      className={className}
      onError={onError}
      decoding="async"
    />
  );
}

function CardAttachmentViewerOverlay({
  state,
  onClose,
  onPrev,
  onNext,
  onDownload,
}: {
  state: AttachmentViewerState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDownload: (file: CardFile) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      const len = state.mode === "image" ? state.images.length : state.pdfs.length;
      if (len <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose, onPrev, onNext]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const count = state.mode === "image" ? state.images.length : state.pdfs.length;
  const current =
    state.mode === "image" ? state.images[state.index] : state.pdfs[state.index];
  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex flex-col items-center justify-center bg-black/88 p-2 sm:p-4"
      role="dialog"
      aria-modal
      aria-label={state.mode === "image" ? "Просмотр изображений" : "Просмотр PDF"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(96vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/15 bg-zinc-950 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-white">
          <span className="min-w-0 truncate text-sm font-medium" title={current.name}>
            {current.name}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-white/20 px-2 py-1 text-xs text-white/90 hover:bg-white/10 hover:text-white"
              onClick={() => onDownload(current)}
            >
              Скачать
            </button>
            {count > 1 ? (
              <span className="text-xs tabular-nums text-white/65">
                {state.index + 1} / {count}
              </span>
            ) : null}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/85 hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <IconX className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="relative min-h-0 flex-1 bg-black">
          {count > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-xl text-white hover:bg-black/75 sm:left-2"
                aria-label="Предыдущий файл"
                onClick={onPrev}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-xl text-white hover:bg-black/75 sm:right-2"
                aria-label="Следующий файл"
                onClick={onNext}
              >
                ›
              </button>
            </>
          ) : null}
          {state.mode === "image" ? (
            <div className="flex h-[min(82vh,800px)] min-h-[200px] items-center justify-center p-2 sm:p-4">
              <KanbanAttachmentImg
                file={current}
                alt=""
                variant="viewer"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <iframe
              title={current.name}
              src={current.dataUrl}
              className="h-[min(82vh,800px)] min-h-[320px] w-full border-0 bg-white"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

type ChatRenderBlock =
  | { kind: "imageRow"; key: string; comments: CardComment[] }
  | { kind: "message"; comment: CardComment };

function resolveChatImageFile(card: KanbanCard, cm: CardComment) {
  if (!cm.imageFileId) return undefined;
  return (card.files || []).find((f) => f.id === cm.imageFileId);
}

/**
 * Снапшот Kaiten содержит только текстовые комментарии.
 * Добавляем недостающие image-комментарии по текущим card.files,
 * чтобы блоки превью не пропадали между poll-циклами.
 */
function withImagePlaceholders(comments: CardComment[], card: KanbanCard): CardComment[] {
  const base = Array.isArray(comments) ? [...comments] : [];
  const imageFiles = (card.files || []).filter((f) => isCardFileImage(f));
  if (imageFiles.length === 0) return base;

  const seenImageIds = new Set(
    base.map((c) => c.imageFileId).filter((v): v is string => typeof v === "string" && !!v),
  );

  for (const f of imageFiles) {
    if (seenImageIds.has(f.id)) continue;
    seenImageIds.add(f.id);
    base.push({
      id: `img-${f.id}`,
      userId: "",
      text: "",
      createdAt: f.addedAt || new Date().toISOString(),
      imageFileId: f.id,
    });
  }

  return base;
}

/** Сначала все превью изображений (как в наряде), затем текст — визуально галерея всегда сверху. */
function orderCommentsImagesFirst(comments: CardComment[], card: KanbanCard): CardComment[] {
  const imgs: CardComment[] = [];
  const rest: CardComment[] = [];
  for (const cm of comments) {
    if (!cm.imageFileId) {
      rest.push(cm);
      continue;
    }
    const f = resolveChatImageFile(card, cm);
    if (f && isCardFileImage(f)) imgs.push(cm);
    else rest.push(cm);
  }
  return [...imgs, ...rest];
}

/** Подряд идущие сообщения с картинками — один блок, сетка по 3 в ряд. */
function buildChatRenderBlocks(comments: CardComment[], card: KanbanCard): ChatRenderBlock[] {
  const list = orderCommentsImagesFirst(comments || [], card);
  const out: ChatRenderBlock[] = [];
  let i = 0;
  while (i < list.length) {
    const cm = list[i];
    const f = resolveChatImageFile(card, cm);
    if (f && isCardFileImage(f)) {
      const group: CardComment[] = [];
      while (i < list.length) {
        const c = list[i];
        const cf = resolveChatImageFile(card, c);
        if (!cf || !isCardFileImage(cf)) break;
        group.push(c);
        i++;
      }
      out.push({ kind: "imageRow", key: group[0].id, comments: group });
      continue;
    }
    out.push({ kind: "message", comment: cm });
    i++;
  }
  return out;
}

type ChatMentionDraft = { start: number; end: number; query: string };

type ChatMentionOption = {
  id: string;
  label: string;
  insertText: string;
  searchText: string;
};

function detectMentionDraft(text: string, caretPos: number): ChatMentionDraft | null {
  const caret = Math.max(0, Math.min(caretPos, text.length));
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  if (at > 0 && /[\p{L}\p{N}_]/u.test(before[at - 1])) {
    return null;
  }
  const token = before.slice(at + 1);
  if (/\s/.test(token)) return null;
  return { start: at, end: caret, query: token.toLowerCase() };
}

function fallbackMentionToken(row: KanbanCrmUserRow | { name: string }): string {
  if ("email" in row) {
    const local = (row.email || "").split("@")[0] || "";
    const byEmail = sanitizeMentionToken(local);
    if (byEmail) return byEmail;
    return sanitizeMentionToken(row.displayName);
  }
  return sanitizeMentionToken(row.name);
}

function ChatPanel({
  card,
  board,
  adminMentionTag,
  adminMentionUserIds,
  onSend,
  onFilesDropped,
  onOpenAttachment,
}: {
  card: KanbanCard;
  board: KanbanBoard;
  adminMentionTag: string;
  adminMentionUserIds: readonly string[];
  onSend: (t: string) => boolean | Promise<boolean>;
  onFilesDropped: (files: File[]) => void | Promise<void>;
  onOpenAttachment: (f: CardFile) => void;
}) {
  const { byId: crmChatById, list: crmChatList } = useKanbanCrmUsers();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inp, setInp] = useState("");
  const [caretPos, setCaretPos] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const chatAuthorName = (userId: string, authorLabel?: string) => {
    const lab = (authorLabel ?? "").trim();
    if (lab) return lab;
    return (
      crmChatById.get(userId)?.displayName ??
      board.users.find((x) => x.id === userId)?.name ??
      "Неизвестно"
    );
  };
  const chatBlocks = useMemo(
    () => buildChatRenderBlocks(card.comments || [], card),
    [card.comments, card.files, card.id],
  );
  const mentionOptions = useMemo<ChatMentionOption[]>(() => {
    const merged = mergeKanbanPickerUsers(
      crmChatList,
      board.users,
      board.excludedCrmUserIds,
    );
    const synthetic: ChatMentionOption[] =
      adminMentionUserIds.length > 0 && adminMentionTag
        ? [
            {
              id: "__kanban_lab_team__",
              label: `Лаборатория (@${adminMentionTag})`,
              insertText: `@${adminMentionTag}`,
              searchText:
                `лаборатория ${adminMentionTag} администратор старший`.toLowerCase(),
            },
          ]
        : [];
    const rest = merged
      .flatMap((row) => {
        if ("role" in row && isKanbanAdminGroupRole(row.role)) {
          return [];
        }
        const label = pickerRowLabel(row);
        const token =
          "mentionHandle" in row
            ? sanitizeMentionToken(row.mentionHandle || "") || fallbackMentionToken(row)
            : fallbackMentionToken(row);
        if (!token) return [];
        const emailPart = "email" in row ? row.email || "" : "";
        return [
          {
            id: row.id,
            label,
            insertText: `@${token}`,
            searchText: `${label} ${emailPart} ${token}`.toLowerCase(),
          },
        ];
      })
      .filter((x): x is ChatMentionOption => x != null);
    return [...synthetic, ...rest];
  }, [
    crmChatList,
    board.users,
    board.excludedCrmUserIds,
    adminMentionTag,
    adminMentionUserIds,
  ]);
  const mentionDraft = useMemo(
    () => detectMentionDraft(inp, caretPos),
    [inp, caretPos],
  );
  const mentionFiltered = useMemo(() => {
    if (!mentionDraft) return [];
    const q = mentionDraft.query.trim();
    const base = q
      ? mentionOptions.filter((x) => x.searchText.includes(q))
      : mentionOptions;
    return base.slice(0, 8);
  }, [mentionDraft, mentionOptions]);

  const lastChatCardIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (lastChatCardIdRef.current !== card.id) {
      lastChatCardIdRef.current = card.id;
      ref.current.scrollTop = 0;
      return;
    }
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [card.id, card.comments?.length, card.files?.length, chatBlocks.length]);

  const flushFiles = (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => f.size > 0);
    if (!arr.length) return;
    void Promise.resolve(onFilesDropped(arr));
  };

  const submitMessage = async () => {
    const v = inp.trim();
    if (!v) return;
    const ok = await Promise.resolve(onSend(v));
    if (ok) {
      setInp("");
      setCaretPos(0);
      setMentionIndex(0);
    }
  };
  const applyMention = useCallback(
    (opt: ChatMentionOption) => {
      if (!mentionDraft) return;
      const before = inp.slice(0, mentionDraft.start);
      const after = inp.slice(mentionDraft.end);
      const next = `${before}${opt.insertText} ${after}`;
      const nextCaret = before.length + opt.insertText.length + 1;
      setInp(next);
      setCaretPos(nextCaret);
      setMentionIndex(0);
      requestAnimationFrame(() => {
        if (!inputRef.current) return;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(nextCaret, nextCaret);
      });
    },
    [inp, mentionDraft],
  );

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionDraft?.start, mentionDraft?.query]);

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col transition-[box-shadow] ${
        dragOver
          ? "ring-2 ring-[var(--kaiten-accent)] ring-inset ring-offset-0"
          : ""
      }`}
      onDragEnter={(e) => {
        if (e.dataTransfer?.types?.includes("Files")) setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) flushFiles(e.dataTransfer.files);
      }}
    >
      <div ref={ref} className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {chatBlocks.map((block) => {
          if (block.kind === "imageRow") {
            const cm0 = block.comments[0];
            const author0 = chatAuthorName(cm0.userId, cm0.authorLabel);
            return (
              <div
                key={block.key}
                className="mb-2 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]"
              >
                <div className="mb-0.5 text-[0.7rem] text-[var(--kaiten-modal-muted)]">
                  {author0} · {relativeTimeRu(cm0.createdAt)}
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {block.comments.map((cm) => {
                    const imgFile = resolveChatImageFile(card, cm)!;
                    return (
                      <div
                        key={cm.id}
                        className="group flex min-w-0 flex-col gap-0.5"
                      >
                        <button
                          type="button"
                          className="cursor-zoom-in text-left transition-opacity hover:opacity-95"
                          title={imgFile.name}
                          onClick={() => onOpenAttachment(imgFile)}
                        >
                          <div className="aspect-square w-full overflow-hidden rounded-md border border-[var(--kaiten-modal-border)] bg-black/20">
                            <KanbanAttachmentImg
                              file={imgFile}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </button>
                        <div className="flex items-start justify-between gap-1">
                          <span className="line-clamp-2 min-w-0 flex-1 break-all text-[0.55rem] leading-tight text-[var(--kaiten-modal-muted)]">
                            {cm.text.trim() || imgFile.name}
                          </span>
                          <button
                            type="button"
                            className="shrink-0 rounded border border-[var(--kaiten-modal-border)] px-1 py-0.5 text-[0.55rem] leading-none text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)]"
                            onClick={() => downloadCardFile(imgFile)}
                            title="Скачать файл"
                            aria-label={`Скачать ${imgFile.name}`}
                          >
                            Скачать
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          const cm = block.comment;
          const author = chatAuthorName(cm.userId, cm.authorLabel);
          const imgFile = resolveChatImageFile(card, cm);

          return (
            <div
              key={cm.id}
              className="mb-2 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]"
            >
              <div className="mb-0.5 text-[0.7rem] text-[var(--kaiten-modal-muted)]">
                {author} · {relativeTimeRu(cm.createdAt)}
              </div>
              {cm.imageFileId && !imgFile ? (
                <div className="mt-0.5 text-[0.75rem] text-[var(--kaiten-modal-muted)]">
                  Изображение удалено из карточки
                  {cm.text.trim() ? (
                    <span className="mt-0.5 block whitespace-pre-wrap break-words text-[var(--kaiten-modal-text)]">
                      {cm.text}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">{cm.text}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="relative flex gap-1 border-t border-[var(--kaiten-modal-border)] p-2">
        {mentionFiltered.length > 0 ? (
          <div className="absolute bottom-[calc(100%+4px)] left-2 right-2 z-20 max-h-56 overflow-y-auto rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] p-1 shadow-xl">
            {mentionFiltered.map((opt, idx) => (
              <button
                key={`${opt.id}-${opt.insertText}`}
                type="button"
                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[0.78rem] ${
                  idx === mentionIndex
                    ? "bg-[var(--kaiten-modal-control)] text-[var(--kaiten-accent)]"
                    : "text-[var(--kaiten-modal-text)] hover:bg-[var(--kaiten-modal-control)]"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyMention(opt);
                }}
              >
                <span className="truncate">{opt.label}</span>
                <span className="ml-3 shrink-0 text-[0.72rem] text-[var(--kaiten-modal-muted)]">
                  {opt.insertText}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="text"
          className="min-w-0 flex-1 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)] placeholder:text-[var(--kaiten-modal-muted)]"
          placeholder="Сообщение в чат (в т.ч. обсуждение файлов)…"
          value={inp}
          onChange={(e) => {
            setInp(e.target.value);
            setCaretPos(e.target.selectionStart ?? e.target.value.length);
          }}
          onClick={(e) => {
            setCaretPos(e.currentTarget.selectionStart ?? inp.length);
          }}
          onSelect={(e) => {
            setCaretPos(e.currentTarget.selectionStart ?? inp.length);
          }}
          onPaste={(e) => {
            const files = e.clipboardData?.files;
            if (files?.length) {
              e.preventDefault();
              flushFiles(files);
            }
          }}
          onKeyDown={(e) => {
            if (mentionFiltered.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex((v) => (v + 1) % mentionFiltered.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex((v) =>
                  v <= 0 ? mentionFiltered.length - 1 : v - 1,
                );
                return;
              }
              if (e.key === "Tab" || e.key === "Enter") {
                e.preventDefault();
                applyMention(
                  mentionFiltered[Math.min(mentionIndex, mentionFiltered.length - 1)],
                );
                return;
              }
            }
            if (e.key === "Enter") {
              e.preventDefault();
              void submitMessage();
            }
          }}
        />
        <button
          type="button"
          className="shrink-0 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] px-2 py-1.5 text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)] disabled:opacity-40"
          onClick={() => {
            void submitMessage();
          }}
        >
          <IconSend />
        </button>
      </div>
    </div>
  );
}

/** 16 лучей — плотнее и заметнее круг. */
const CHECKLIST_SPARK_ANGLES = Array.from({ length: 16 }, (_, i) => i * 22.5);
const CHECKLIST_SPARK_COLORS = [
  "#ff006e",
  "#ffbe0b",
  "#3a86ff",
  "#8338ec",
  "#fb5607",
  "#06ffa5",
  "#ffe066",
  "#f15bb5",
  "#00bbf9",
  "#fee440",
  "#9b5de5",
  "#f72585",
  "#4cc9f0",
  "#ffd60a",
  "#06d6a0",
  "#ef476f",
] as const;

function ChecklistCheckboxWithFirework({
  completed,
  disabled,
  onToggle,
}: {
  completed: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [burst, setBurst] = useState<null | { cx: number; cy: number; key: number }>(
    null,
  );

  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(null), 680);
    return () => window.clearTimeout(t);
  }, [burst]);

  const burstPortal =
    burst &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="pointer-events-none fixed z-[500]"
        style={
          {
            left: burst.cx,
            top: burst.cy,
            transform: "translate(-50%, -50%)",
          } as CSSProperties
        }
        aria-hidden
      >
        <div className="relative h-0 w-0">
          {CHECKLIST_SPARK_ANGLES.map((deg, i) => (
            <span
              key={`${burst.key}-${i}`}
              className="checklist-spark-arm"
              style={{ transform: `rotate(${deg}deg)` }}
            >
              <span
                className="checklist-spark-dot"
                style={
                  {
                    backgroundColor:
                      CHECKLIST_SPARK_COLORS[i % CHECKLIST_SPARK_COLORS.length],
                    color: CHECKLIST_SPARK_COLORS[i % CHECKLIST_SPARK_COLORS.length],
                    animationDelay: `${i * 32}ms`,
                  } as CSSProperties
                }
              />
            </span>
          ))}
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      {burstPortal}
      <span
        ref={wrapRef}
        className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center"
      >
        <input
          type="checkbox"
          className="relative z-[1] h-4 w-4 shrink-0 cursor-pointer accent-[var(--kaiten-accent,#9333ea)] disabled:cursor-not-allowed"
          checked={completed}
          disabled={disabled}
          onChange={() => {
            if (!completed && wrapRef.current) {
              const r = wrapRef.current.getBoundingClientRect();
              setBurst({
                cx: r.left + r.width / 2,
                cy: r.top + r.height / 2,
                key: Date.now(),
              });
            }
            onToggle();
          }}
        />
      </span>
    </>
  );
}

function ChecklistEditor({
  card,
  cardId,
  onApply,
  activityActorLabel,
  kaitenLinked,
}: {
  card: KanbanCard;
  cardId: string;
  onApply: (fn: (b: KanbanBoard) => void) => void;
  activityActorLabel?: string;
  kaitenLinked?: boolean;
}) {
  const cl = card.parentCardId
    ? card.productionChecklist || []
    : card.checklist || [];
  const done = cl.filter((i) => i.completed).length;
  const total = cl.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      {cl.map((item) => (
        <div key={item.id} className="mb-1 flex items-center gap-2">
          <ChecklistCheckboxWithFirework
            completed={item.completed}
            disabled={false}
            onToggle={() =>
              onApply((b) => {
                const fc = findCard(b, cardId);
                if (!fc) return;
                const list = fc.card.parentCardId
                  ? fc.card.productionChecklist || []
                  : fc.card.checklist || [];
                const it = list.find((x) => x.id === item.id);
                if (!it) return;
                it.completed = !it.completed;
                pushActivity(fc.card, `Чеклист: ${it.text}`, b.users[0]?.id, b, activityActorLabel);
              })
            }
          />
          <input
            type="text"
            className="min-w-0 flex-1 rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-1.5 py-0.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]"
            defaultValue={item.text}
            onBlur={(e) => {
              const v = e.target.value;
              if (v === item.text) return;
              onApply((b) => {
                const fc = findCard(b, cardId);
                if (!fc) return;
                const list = fc.card.parentCardId
                  ? fc.card.productionChecklist || []
                  : fc.card.checklist || [];
                const it = list.find((x) => x.id === item.id);
                if (it) it.text = v;
              });
            }}
          />
          <button
            type="button"
            className="text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)] disabled:opacity-40"
            onClick={() =>
              onApply((b) => {
                const fc = findCard(b, cardId);
                if (!fc) return;
                if (fc.card.parentCardId) {
                  fc.card.productionChecklist = (fc.card.productionChecklist || []).filter(
                    (x) => x.id !== item.id,
                  );
                  return;
                }
                fc.card.checklist = (fc.card.checklist || []).filter((x) => x.id !== item.id);
              })
            }
          >
            <IconX />
          </button>
        </div>
      ))}
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 max-w-[280px] flex-1 overflow-hidden rounded-full bg-[var(--kaiten-modal-border)]">
          <div
            className="h-full rounded-full bg-[var(--kaiten-accent)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[0.75rem] text-[var(--kaiten-modal-muted)]">
          {done} из {total}
        </span>
      </div>
      {kaitenLinked ? (
        <p className="mt-2 text-[0.65rem] leading-snug text-[var(--kaiten-modal-muted)]">
          Чеклист здесь — только в CRM-канбане; нативный чеклист Kaiten в API не
          синхронизируется. Чат, заголовок, описание и файлы (как вложения наряда)
          уходят в Kaiten.
        </p>
      ) : null}
    </div>
  );
}
