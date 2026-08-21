"use client";

import type {
  CardComment,
  CardFile,
  ChecklistItem,
  KanbanBoard,
  KanbanCard,
} from "@/lib/kanban/types";
import type { UserRole } from "@prisma/client";
import {
  downloadCardFile,
  isCardFileImage,
  isPdfMime,
  openOrDownloadCardFile,
  readFileAsCardFile,
} from "@/lib/kanban/card-files";
import {
  deleteOrderAttachmentById,
  fetchKanbanMirrorCommentsForOrder,
  fetchOrderKaitenCommentsForKanban,
  patchOrderKaitenCard,
  uploadOrderAttachmentFromFile,
} from "@/lib/kanban/kaiten-linked-kanban-sync";
import { mergeKaitenSnapshotIntoCardComments } from "@/lib/kanban/chat-sync";
import {
  forgetOptimisticKaitenBlock,
  OPTIMISTIC_KAITEN_BLOCK_SHORT_TTL_MS,
  rememberOptimisticKaitenBlock,
} from "@/lib/kanban/optimistic-kaiten-block";
import {
  forgetOptimisticKanbanStageDue,
  rememberOptimisticKanbanStageDue,
} from "@/lib/kanban/optimistic-kaiten-stage-due";
import {
  formatKanbanChatMessageDisplay,
  kanbanChatMessageLabelClass,
  kanbanChatMessageShellClass,
  shouldShowKanbanChatSyncStatus,
} from "@/lib/kanban/chat-message-display";
import { isOrderChatCorrectionTrigger } from "@/lib/order-chat-correction";
import { isOrderProstheticsRequestTrigger } from "@/lib/order-prosthetics-request";
import {
  parseMentionUserIdsFromText,
  sanitizeMentionToken,
  textIncludesMentionToken,
} from "@/lib/kanban-comment-mentions";
import { kanbanCardAbsoluteUrl } from "@/lib/kanban-card-browser-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import Link from "next/link";
import { normalizeProductionMentionTag } from "@/lib/kanban-production-mention-tag";
import {
  isProductionRoutingCandidateFile,
  normalizeProductionSettings,
  syncParentProductionChecklistSnapshot,
} from "@/lib/kanban/production";
import {
  isKanbanAdminGroupRole,
} from "@/lib/kanban-admin-mention";
import { useKanbanAdminMentionTag } from "@/components/kanban/use-kanban-admin-mention-tag";
import { shouldSkipCrmKanbanTelegram } from "@/lib/kanban/crm-kanban-telegram";
import type { KanbanTelegramPrefKey } from "@/lib/kanban-telegram-prefs";
import { getKanbanStageDue, setKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import {
  applyKanbanCardMembersOnBoard,
  notifyKanbanCardMemberChange,
} from "@/lib/kanban/kanban-card-members-client";
import {
  findCard,
  formatBlockedAt,
  formatDate,
  formatDateTimeRu,
  generateId,
  isCardBlocked,
  kaitenCardTypes,
  performUnblock,
  pushActivity,
  relativeTimeRu,
  trackLanes,
  tryBlockCard,
  updateKanbanBlockReason,
  userNameById,
} from "@/lib/kanban/model";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  KANBAN_CARD_MODAL_NARROW_MAX_PX,
  kanbanCardDescriptionAvailableHeight,
  kanbanCardDescriptionForceCollapseOnNarrow,
  kanbanCardDescriptionNeedsCollapse,
} from "@/lib/kanban/kanban-card-desc-collapse";
import { createPortal } from "react-dom";
import { KanbanCardTimerBlock } from "./KanbanCardTimerBlock";
import { PayrollDonePanel } from "@/components/payroll/PayrollDonePanel";
import { OrderSourceEmailsModal } from "@/components/orders/OrderSourceEmailsModal";
import { useKanbanCrmUsers } from "./kanban-crm-users-context";
import { KanbanMemberPickerDialog } from "./KanbanMemberPickerDialog";
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
  IconMail,
  IconPlus,
  IconReply,
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
import { canSendKanbanChatPtMemo } from "@/lib/auth/permissions";
import { formatOrderChatPtMemoMessage } from "@/lib/order-chat-pt-memo";
import { LinkifiedPlainText } from "@/components/ui/LinkifiedPlainText";
import { LinkifiedTextarea } from "@/components/ui/LinkifiedTextarea";

type ChatAction = "comment" | "correction" | "prosthetics" | "pt";

function columnMatchesStage(columnTitle: string, stageTitle: string): boolean {
  const col = String(columnTitle || "").trim().toLowerCase();
  const stage = String(stageTitle || "").trim().toLowerCase();
  if (!col || !stage) return false;
  return col === stage || col.endsWith(`· ${stage}`);
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
  /** Текст комментария — дубль на корне, если mentionContext без commentText. */
  commentText?: string;
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
  /** Все доски приложения для поиска дочерних production-карточек родителя. */
  allBoards?: KanbanBoard[];
  /** Подпись текущего пользователя для журнала активности. */
  activityActorLabel?: string;
  onClose: () => void;
  onApply: (fn: (b: KanbanBoard) => void) => void;
  toast: (msg: string, err?: boolean) => void;
  onMovePrevStage: (id: string) => void;
  onMoveNextStage: (id: string) => void;
  onMoveToColumn?: (cardId: string, targetColumnId: string) => void;
  /** Боевой режим: перенос на доску ортопедия/ортодонтия + PATCH Kaiten. */
  onChangeTrackLane?: (cardId: string, lane: string) => void;
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
  /** Роль текущего пользователя CRM для зарплатной вкладки. */
  sessionUserRole?: UserRole | null;
  canEditTitle?: boolean;
  canEditDueDate?: boolean;
  canEditTrack?: boolean;
  canManageAssignees?: boolean;
  canManageParticipants?: boolean;
  /** Пункты чеклиста на карточке (модуль KANBAN_MANAGE_CHECKLIST). */
  canManageKanbanChecklist?: boolean;
  /** Назначать таймер на карточке (модуль KANBAN_MANAGE_TIMER). */
  canManageKanbanTimer?: boolean;
  /** Перемещать карточку по колонкам (модуль KANBAN_MOVE_COLUMNS). */
  canMoveColumns?: boolean;
  /** Прикреплять файлы к карточке (модуль KANBAN_ATTACH_FILES). */
  canAttachFiles?: boolean;
  /** Блокировка / снятие блокировки: ответственные и участники карточки либо администратор CRM. */
  canManageKanbanBlock?: boolean;
  onOpenLinkedCard?: (cardId: string) => void;
  onParentProductionFilesUpdated?: (cardId: string) => void;
};

const KANBAN_BLOCK_PERM_HINT =
  "Блокировку могут менять ответственные и участники карточки или администратор";

/** Пиктограмма в круглой кнопке тулбара: ~65–70% диаметра, жирнее штрих. */
const TOOLBAR_CIRCLE_ICON =
  "block !h-[68%] !w-[68%] shrink-0 overflow-visible [stroke-width:2.85]";

function KanbanCardPeopleGroup({
  layout,
  label,
  userIds,
  variant,
  board,
  canManage,
  enableTitle,
  disableTitle,
  onOpen,
}: {
  layout: "toolbar" | "stack";
  label: string;
  userIds: string[];
  variant: "assignee" | "participant";
  board: KanbanBoard;
  canManage: boolean;
  enableTitle: string;
  disableTitle: string;
  onOpen: () => void;
}) {
  const plus = (
    <span
      className={
        layout === "stack"
          ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--kaiten-modal-muted)] text-[var(--kaiten-modal-muted)]"
          : "mt-1 inline-flex h-[14px] w-[14px] items-center justify-center rounded-full border border-dashed border-[var(--kaiten-modal-muted)] text-[var(--kaiten-modal-muted)]"
      }
      aria-hidden
    >
      <IconPlus className={layout === "stack" ? "h-5 w-5" : "h-[8px] w-[8px]"} />
    </span>
  );
  const avatars = userIds.map((uid) => (
    <span key={uid} className="pointer-events-none shrink-0">
      <KanbanPersonAvatar
        userId={uid}
        homeBoard={board}
        variant={variant}
        size={layout === "stack" ? "modal" : "listSm"}
        nameCaption
        titleSuffix=""
      />
    </span>
  ));

  if (layout === "stack") {
    return (
      <button
        type="button"
        disabled={!canManage}
        title={canManage ? enableTitle : disableTitle}
        className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-md px-0.5 py-1 text-left hover:bg-[var(--kaiten-modal-control)] disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onOpen}
      >
        <span className="text-[0.58rem] font-medium uppercase leading-none tracking-wide text-[var(--kaiten-modal-muted)]">
          {label}
        </span>
        <div className="flex min-h-8 min-w-0 w-full items-start gap-1 overflow-x-auto">
          {avatars}
          {plus}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={!canManage}
      title={canManage ? enableTitle : disableTitle}
      className="flex shrink-0 flex-col items-center gap-1 rounded-md px-1 py-0.5 text-left hover:bg-[var(--kaiten-modal-control)] disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onOpen}
    >
      <span className="text-[0.58rem] font-medium uppercase leading-none tracking-wide text-[var(--kaiten-modal-muted)]">
        {label}
      </span>
      <div className="flex items-start gap-1">
        {avatars}
        {plus}
      </div>
    </button>
  );
}

type KanbanCardModalTab = "card" | "done" | "chat" | "act";

function KanbanCardModalTabs({
  rightTab,
  setRightTab,
  canUsePayrollDone,
  showCardTab,
}: {
  rightTab: KanbanCardModalTab;
  setRightTab: (tab: KanbanCardModalTab) => void;
  canUsePayrollDone: boolean;
  showCardTab: boolean;
}) {
  const stretch = showCardTab;
  const tabClass = (active: boolean) =>
    `-mb-px border-b-2 text-center font-semibold uppercase tracking-wide ${
      stretch
        ? "min-w-0 flex-1 px-0.5 pb-2 pt-2 text-[0.58rem] leading-tight"
        : "shrink-0 pb-2.5 pt-2.5 text-[0.7rem] sm:text-[0.75rem]"
    } ${
      active
        ? "border-[var(--kaiten-accent)] text-[var(--kaiten-modal-text)]"
        : "border-transparent text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)]"
    }`;
  return (
    <div
      className={`flex w-full border-b border-[var(--kaiten-modal-border)] ${
        stretch
          ? "items-stretch gap-0 px-1"
          : "flex-nowrap gap-3 overflow-x-auto px-3 sm:gap-4"
      }`}
      role="tablist"
      aria-label="Панель карточки"
    >
      {showCardTab ? (
        <button
          type="button"
          role="tab"
          aria-selected={rightTab === "card"}
          className={tabClass(rightTab === "card")}
          onClick={() => setRightTab("card")}
        >
          Карточка
        </button>
      ) : null}
      {canUsePayrollDone ? (
        <button
          type="button"
          role="tab"
          aria-selected={rightTab === "done"}
          className={tabClass(rightTab === "done")}
          onClick={() => setRightTab("done")}
        >
          Что сделано
        </button>
      ) : null}
      <button
        type="button"
        role="tab"
        aria-selected={rightTab === "chat"}
        className={tabClass(rightTab === "chat")}
        onClick={() => setRightTab("chat")}
      >
        Комментарии
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={rightTab === "act"}
        className={tabClass(rightTab === "act")}
        onClick={() => setRightTab("act")}
      >
        Активность
      </button>
    </div>
  );
}

function KanbanDueUrgentControls({
  compact,
  stageDue,
  canEditDueDate,
  urgent,
  onDueChange,
  onToggleUrgent,
  inputClassName,
}: {
  compact?: boolean;
  stageDue: string;
  canEditDueDate: boolean;
  urgent: boolean;
  onDueChange: (value: string) => void;
  onToggleUrgent: () => void;
  inputClassName: string;
}) {
  return (
    <div className={`flex items-center ${compact ? "min-w-0 gap-1.5" : "flex-wrap gap-2"}`}>
      <input
        type="date"
        className={
          compact
            ? "h-9 w-auto max-w-[8.5rem] shrink-0 rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-0 text-[1.02rem] leading-none text-[var(--kaiten-modal-text)] [field-sizing:content] [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:w-4"
            : `${inputClassName} max-w-[12rem]`
        }
        disabled={!canEditDueDate}
        value={stageDue}
        title="Срок карточки канбана (Kaiten). Не лабораторный срок и не дата записи."
        onChange={(e) => onDueChange(e.target.value)}
      />
      <button
        type="button"
        className={
          compact
            ? `inline-flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full border px-0.5 text-center text-[0.42rem] font-extrabold uppercase leading-[1.05] tracking-wide ${
                urgent
                  ? "border-orange-600/80 bg-gradient-to-b from-orange-500 to-red-600 text-white shadow-sm"
                  : "border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-muted)]"
              }`
            : `rounded-md border px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wide transition-colors ${
                urgent
                  ? "border-orange-600/80 bg-gradient-to-b from-orange-500 to-red-600 text-white shadow-sm"
                  : "border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-muted)] hover:border-orange-400/50 hover:text-orange-700 dark:hover:text-orange-300"
              }`
        }
        title={
          urgent
            ? "Снять метку «Срочно» для следующего отдела (только канбан)"
            : "Срочно для следующего отдела (только канбан, наряд не меняется)"
        }
        onClick={onToggleUrgent}
      >
        {compact ? (
          <span className="flex flex-col items-center">
            <span>Сроч</span>
            <span>но</span>
          </span>
        ) : (
          "Срочно"
        )}
      </button>
    </div>
  );
}

type ManualRouteDraftRow = {
  fileIndex: number;
  fileName: string;
  laneId: string;
  skipProduction: boolean;
};

export function KanbanCardModal({
  cardId,
  board,
  allBoards,
  activityActorLabel,
  onClose,
  onApply,
  toast,
  onMovePrevStage,
  onMoveNextStage,
  onMoveToColumn,
  onChangeTrackLane,
  onCopyCardLink,
  trackLaneOptions,
  trackLaneFieldLabel,
  isDemo = false,
  commentAuthorUserId,
  sessionUserRole = null,
  canEditTitle = true,
  canEditDueDate = true,
  canEditTrack = true,
  canManageAssignees = true,
  canManageParticipants = true,
  canManageKanbanChecklist = true,
  canManageKanbanTimer = false,
  canMoveColumns = true,
  canAttachFiles = true,
  canManageKanbanBlock = false,
  onOpenLinkedCard,
  onParentProductionFilesUpdated,
}: KanbanCardModalProps) {
  const [rightTab, setRightTab] = useState<KanbanCardModalTab>("chat");
  const [blockPopupOpen, setBlockPopupOpen] = useState(false);
  const [blockReasonDraft, setBlockReasonDraft] = useState("");
  const [blockReasonEditing, setBlockReasonEditing] = useState(false);
  const [blockReasonEditDraft, setBlockReasonEditDraft] = useState("");
  const blockReasonEditRef = useRef<HTMLTextAreaElement>(null);
  const blockReasonEditingRef = useRef(false);
  const sendCommentInFlightRef = useRef(false);
  const [pickerMode, setPickerMode] = useState<null | "assign" | "part">(null);
  const { byId: crmById, list: crmList } = useKanbanCrmUsers();
  const [descDraft, setDescDraft] = useState("");
  const [kaitenChatLoading, setKaitenChatLoading] = useState(false);
  const [descExpanded, setDescExpanded] = useState(true);
  const [descCanCollapse, setDescCanCollapse] = useState(false);
  const descUserOverrideRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const descBoxRef = useRef<HTMLDivElement>(null);
  const descMeasureRef = useRef<HTMLDivElement>(null);
  const [placementFieldsOpen, setPlacementFieldsOpen] = useState(false);
  const [fileViewer, setFileViewer] = useState<
    | null
    | { mode: "image"; images: CardFile[]; index: number }
    | { mode: "pdf"; pdfs: CardFile[]; index: number }
  >(null);
  const [manualRouteOpen, setManualRouteOpen] = useState(false);
  const [manualRoutePendingFiles, setManualRoutePendingFiles] = useState<File[]>([]);
  const [manualRouteRows, setManualRouteRows] = useState<ManualRouteDraftRow[]>([]);
  const [orderMailOpen, setOrderMailOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const found = cardId ? findCard(board, cardId) : null;
  const card = found?.card;
  const showOrderMailButton =
    Boolean(card?.linkedOrderId) && (card?.sourceEmailCount ?? 0) > 0;
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
    setBlockReasonEditing(false);
    blockReasonEditingRef.current = false;
    setBlockReasonEditDraft("");
    setPickerMode(null);
    setFileViewer(null);
    setManualRouteOpen(false);
    setManualRoutePendingFiles([]);
    setManualRouteRows([]);
    descUserOverrideRef.current = false;
    setDescExpanded(true);
    setDescCanCollapse(false);
    setKaitenChatLoading(false);
    setPlacementFieldsOpen(false);
  }, [cardId]);

  useEffect(() => {
    if (!blockReasonEditing) return;
    const el = blockReasonEditRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [blockReasonEditing]);

  useEffect(() => {
    if (card) setDescDraft(card.description || "");
  }, [cardId, card?.description]);

  const recomputeDescCollapse = useCallback(() => {
    if (descUserOverrideRef.current) return;
    const overlay = overlayRef.current;
    const measure = descMeasureRef.current;
    const box = descBoxRef.current;
    if (!overlay || !descDraft.trim() || !measure) {
      setDescCanCollapse(false);
      setDescExpanded(true);
      return;
    }
    const narrow = window.matchMedia(
      `(max-width: ${KANBAN_CARD_MODAL_NARROW_MAX_PX}px)`,
    ).matches;
    if (kanbanCardDescriptionForceCollapseOnNarrow(narrow, true)) {
      setDescCanCollapse(true);
      setDescExpanded(false);
      return;
    }
    const fullH = measure.scrollHeight;
    const available = kanbanCardDescriptionAvailableHeight(
      overlay.getBoundingClientRect().bottom,
      (box ?? measure).getBoundingClientRect().top,
    );
    const needs = kanbanCardDescriptionNeedsCollapse(fullH, available);
    setDescCanCollapse(needs);
    setDescExpanded(!needs);
  }, [descDraft]);

  useLayoutEffect(() => {
    recomputeDescCollapse();
  }, [recomputeDescCollapse, cardId, card?.files?.length]);

  useEffect(() => {
    const onResize = () => recomputeDescCollapse();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recomputeDescCollapse]);

  const linkedOrderId = card?.linkedOrderId;
  const kaitenCardIdForChat = card?.kaitenCardId;
  const currentColumnTitle = found?.col?.title || "—";
  const productionSettingsForCard = useMemo(
    () => normalizeProductionSettings(board),
    [board],
  );
  const canMarkFilesForRedo = useMemo(() => {
    if (!card || card.parentCardId) return false;
    const col = String(currentColumnTitle || "").trim().toLowerCase();
    const assembly = String(productionSettingsForCard.parentDoneColumnTitle || "")
      .trim()
      .toLowerCase();
    if (!col || !assembly) return false;
    return col === assembly || col.endsWith(`· ${assembly}`);
  }, [card, currentColumnTitle, productionSettingsForCard.parentDoneColumnTitle]);
  const parentInProductionColumn = useMemo(() => {
    if (!card || card.parentCardId) return false;
    const currentRaw = String(currentColumnTitle || "").trim();
    return columnMatchesStage(
      currentRaw,
      productionSettingsForCard.triggerColumnTitle,
    );
  }, [
    card,
    currentColumnTitle,
    productionSettingsForCard.triggerColumnTitle,
  ]);
  const manualProductionLanes = useMemo(
    () =>
      (productionSettingsForCard.lanes || [])
        .filter((lane) => lane.id !== productionSettingsForCard.unmatchedLaneId)
        .map((lane) => ({ id: lane.id, name: lane.name })),
    [
      productionSettingsForCard.lanes,
      productionSettingsForCard.unmatchedLaneId,
    ],
  );
  const columnTransfer = useMemo(() => {
    if (!cardId || !found || !onMoveToColumn) return null;
    const columns: Array<{ id: string; title: string }> = [];
    for (const col of board.columns) {
      columns.push({
        id: col.id,
        title: col.title,
      });
    }
    if (columns.length < 2) return null;
    return {
      currentColumnId: found.col.id,
      columns,
    };
  }, [cardId, found, onMoveToColumn, board.columns]);
  const chatActorUserId =
    (commentAuthorUserId ?? "").trim() || board.users[0]?.id || "";

  useEffect(() => {
    if (!cardId || !linkedOrderId) return;
    let cancelled = false;
    const alreadyLinked =
      kaitenCardIdForChat != null && Number.isFinite(kaitenCardIdForChat);
    if (alreadyLinked) setKaitenChatLoading(true);

    void (async () => {
      const snap = await fetchKanbanMirrorCommentsForOrder(linkedOrderId);
      if (cancelled) return;
      if (snap.ok) {
        onApply((b) => {
          const fc = findCard(b, cardId);
          if (!fc) return;
          const hadLocal = (fc.card.comments || []).length > 0;
          if (snap.comments.length > 0 || !hadLocal) {
            fc.card.comments = withImagePlaceholders(snap.comments, fc.card);
          }
          if (snap.description.trim() && !(fc.card.description || "").trim()) {
            fc.card.description = snap.description;
          }
        });
      }
      const pullKaiten = alreadyLinked || (snap.ok && snap.linkedKaiten);
      if (!pullKaiten) {
        setKaitenChatLoading(false);
        return;
      }
      setKaitenChatLoading(true);
      const kaiten = await fetchOrderKaitenCommentsForKanban(
        linkedOrderId,
        chatActorUserId,
      );
      if (cancelled) return;
      if (kaiten.ok && kaiten.comments.length > 0) {
        onApply((b) => {
          const fc = findCard(b, cardId);
          if (!fc) return;
          fc.card.comments = withImagePlaceholders(
            mergeKaitenSnapshotIntoCardComments(
              fc.card.comments || [],
              kaiten.comments,
            ),
            fc.card,
          );
        });
      }
      setKaitenChatLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId, linkedOrderId, onApply, chatActorUserId, kaitenCardIdForChat]);

  const adminMentionTag = useKanbanAdminMentionTag();
  const adminMentionUserIds = useMemo(
    () => crmList.filter((u) => isKanbanAdminGroupRole(u.role)).map((u) => u.id),
    [crmList],
  );

  const productionMentionTagResolved = useMemo(() => {
    const raw = normalizeProductionSettings(board).productionMentionTag ?? "";
    return normalizeProductionMentionTag(raw || null);
  }, [board]);

  const productionUserIds = useMemo(
    () =>
      crmList
        .filter((u) => u.role === "PRODUCTION" || u.role === "SENIOR_PRODUCTION")
        .map((u) => u.id),
    [crmList],
  );

  if (!cardId || !card) return null;

  const blocked = isCardBlocked(card);
  const stageDue = getKanbanStageDue(card);
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
  const canUsePayrollDone =
    sessionUserRole === "USER" ||
    sessionUserRole === "SENIOR_TECHNICIAN" ||
    sessionUserRole === "OWNER";

  const openBlockPopup = () => {
    if (!canManageKanbanBlock) {
      toast(KANBAN_BLOCK_PERM_HINT, true);
      return;
    }
    setBlockReasonDraft("");
    setBlockPopupOpen(true);
  };

  const persistLinkedOrderBlock = (
    orderId: string,
    body: { blocked: boolean; blockReason?: string },
    blockedAt?: string | null,
  ) => {
    rememberOptimisticKaitenBlock(orderId, {
      blocked: body.blocked,
      blockReason: body.blockReason ?? "",
      blockedAt: blockedAt ?? null,
    });
    void patchOrderKaitenCard(orderId, body).then((r) => {
      if (!r.ok) {
        forgetOptimisticKaitenBlock(orderId);
        toast(r.error, true);
        return;
      }
      rememberOptimisticKaitenBlock(
        orderId,
        {
          blocked: body.blocked,
          blockReason: body.blockReason ?? "",
          blockedAt: blockedAt ?? null,
        },
        OPTIMISTIC_KAITEN_BLOCK_SHORT_TTL_MS,
      );
    });
  };

  const confirmBlock = () => {
    if (!canManageKanbanBlock) return;
    const reasonForTg = (blockReasonDraft || "").trim();
    const oid = card?.linkedOrderId?.trim() || "";
    const hasKaiten =
      card?.kaitenCardId != null && Number.isFinite(card.kaitenCardId);
    let blockedOk = false;
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      const ok = tryBlockCard(fc.card, b, blockReasonDraft, act);
      if (!ok) {
        toast("Укажите причину остановки работы", true);
        return;
      }
      blockedOk = true;
      setBlockPopupOpen(false);
      setBlockReasonDraft("");
      if (!shouldSkipCrmKanbanTelegram(fc.card.kaitenCardId)) {
        const titleT = (fc.card.title || "").trim() || "Без названия";
        const linkHtml = kanbanCardLinkHtml(cardId, board.id, titleT);
        const who = escapeTelegramHtml((act || "Пользователь").trim());
        const reasonEsc = escapeTelegramHtml(reasonForTg.slice(0, 240));
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
    if (blockedOk && oid && hasKaiten) {
      persistLinkedOrderBlock(
        oid,
        { blocked: true, blockReason: reasonForTg },
      );
    }
  };

  const beginEditBlockReason = () => {
    if (!canManageKanbanBlock || !card?.blocked) {
      if (!canManageKanbanBlock) toast(KANBAN_BLOCK_PERM_HINT, true);
      return;
    }
    setBlockReasonEditDraft((card.blockReason || "").trim());
    blockReasonEditingRef.current = true;
    setBlockReasonEditing(true);
  };

  const cancelEditBlockReason = () => {
    blockReasonEditingRef.current = false;
    setBlockReasonEditing(false);
    setBlockReasonEditDraft("");
  };

  const saveEditBlockReason = () => {
    if (!canManageKanbanBlock || !cardId) return;
    if (!blockReasonEditingRef.current) return;
    const next = blockReasonEditDraft.trim();
    if (!next) {
      toast("Укажите причину остановки работы", true);
      return;
    }
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      const ok = updateKanbanBlockReason(fc.card, b, next, act);
      if (!ok) {
        toast("Укажите причину остановки работы", true);
        return;
      }
      blockReasonEditingRef.current = false;
      setBlockReasonEditing(false);
      setBlockReasonEditDraft("");
    });
    const oid = card?.linkedOrderId?.trim() || "";
    const hasKaiten =
      card?.kaitenCardId != null && Number.isFinite(card.kaitenCardId);
    if (oid && hasKaiten) {
      persistLinkedOrderBlock(
        oid,
        { blocked: true, blockReason: next },
        card?.blockedAt ?? null,
      );
    }
  };

  const savePicker = (userIds: string[]) => {
    if (!pickerMode || !card) return;
    const prevAssign = card.assignees || [];
    const prevPart = card.participants || [];
    const actorId = (commentAuthorUserId ?? "").trim() || board.users[0]?.id || "";
    const actorLabel =
      crmById.get(actorId)?.displayName ??
      userNameById(board, actorId) ??
      "Пользователь";

    onApply((b) => {
      applyKanbanCardMembersOnBoard(b, cardId, pickerMode, userIds, act);
    });

    notifyKanbanCardMemberChange({
      card,
      cardId,
      boardId: board.id,
      mode: pickerMode,
      prevAssign,
      prevPart,
      nextAssign: pickerMode === "assign" ? [...userIds] : [...prevAssign],
      nextPart: pickerMode === "part" ? [...userIds] : [...prevPart],
      actorLabel,
    });
    setPickerMode(null);
  };

  const addCheckItem = () => {
    if (!canManageKanbanChecklist) return;
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      if (fc.card.parentCardId) {
        fc.card.productionChecklist = fc.card.productionChecklist || [];
        fc.card.productionChecklist.push({
          id: generateId("pchk"),
          text: "Новый пункт",
          completed: false,
          completedAt: null,
          sourceFileId: "manual",
          sourceFileName: "manual",
          fromArchive: false,
          reworkCount: 0,
          reworkEvents: [],
        });
        syncParentProductionChecklistSnapshot(b, fc.card.id);
        return;
      }
      fc.card.checklist.push({
        id: generateId("ch"),
        text: "Новый пункт",
        completed: false,
        completedAt: null,
      });
    });
  };

  const sendComment = async (
    text: string,
    requestedAction: ChatAction = "comment",
    parentId: string | null = null,
  ): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (sendCommentInFlightRef.current) return false;
    sendCommentInFlightRef.current = true;
    try {
      return await sendCommentBody(trimmed, requestedAction, parentId);
    } finally {
      sendCommentInFlightRef.current = false;
    }
  };

  const sendCommentBody = async (
    trimmed: string,
    requestedAction: ChatAction = "comment",
    parentId: string | null = null,
  ): Promise<boolean> => {
    const replyParentId = String(parentId || "").trim() || null;

    const actor = chatActorUserId || board.users[0]?.id || "";
    const mentionedIds = parseMentionUserIdsFromText(trimmed, crmList, {
      adminMentionTag,
      adminUserIds: adminMentionUserIds,
      productionMentionTag: productionMentionTagResolved,
      productionUserIds,
    });

    const hasProductionTag =
      productionUserIds.length > 0 &&
      textIncludesMentionToken(trimmed, productionMentionTagResolved);

    const fireMentionTelegram = () => {
      const actorRow = crmById.get(actor);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const orderNum = extractOrderNumberLabelFromKanbanCardTitle(
        (card.title || "").trim(),
      );
      const oid = card.linkedOrderId?.trim();
      const mentionCtxPayload = {
        actorDisplayName: userPersonDisplayName(actorRow ?? {}),
        actorMentionHandle: actorRow?.mentionHandle ?? null,
        linkedOrderId: oid ?? null,
        orderNumberLabel: orderNum || null,
        kaitenCardId: card.kaitenCardId ?? null,
        kanbanCardAbsoluteUrl: kanbanCardAbsoluteUrl(cardId, board.id),
        orderPageAbsoluteUrl: oid
          ? `${origin}/orders/${encodeURIComponent(oid)}`
          : null,
        commentText: trimmed,
      };

      const prodTargets = hasProductionTag
        ? productionUserIds.filter((id) => id !== actor)
        : [];
      const mentionForGeneral = mentionedIds.filter(
        (id) => !(hasProductionTag && prodTargets.includes(id)),
      );

      if (prodTargets.length > 0) {
        postKanbanCrmTelegramNotify({
          kaitenCardId: card.kaitenCardId,
          event: "tg_production_mentioned",
          targetUserIds: prodTargets,
          mentionContext: mentionCtxPayload,
          commentText: trimmed,
        });
      }
      if (mentionForGeneral.length > 0) {
        postKanbanCrmTelegramNotify({
          kaitenCardId: card.kaitenCardId,
          event: "tg_mentioned_in_comment",
          alternatePrefKeys: ["tg_comment_added"],
          targetUserIds: mentionForGeneral,
          mentionContext: mentionCtxPayload,
          commentText: trimmed,
        });
      }
    };

    const refreshCommentsAfterKanbanChatPost = async (
      orderId: string,
    ): Promise<boolean> => {
      try {
        const getRes = await fetch(`/api/orders/${orderId}/kanban-chat?local=1`, {
          credentials: "include",
          cache: "no-store",
        });
        const getData = (await getRes.json().catch(() => ({}))) as {
          comments?: CardComment[];
        };
        if (getRes.ok && Array.isArray(getData.comments)) {
          const nextComments = getData.comments as CardComment[];
          onApply((b) => {
            const fc = findCard(b, cardId);
            if (!fc) return;
            fc.card.comments = withImagePlaceholders(nextComments, fc.card);
            pushActivity(fc.card, "Комментарий", actor, b, act);
          });
        }
      } catch {
        /* POST уже успешен — не дублируем локально/в Telegram */
      }
      return true;
    };

    const postLinkedOrderChat = async (
      action: ChatAction,
      bodyText: string,
    ): Promise<boolean> => {
      const optimisticId = generateId("cm");
      const createdAt = new Date().toISOString();
      const authorLabel =
        crmById.get(actor)?.displayName?.trim() ||
        userNameById(board, actor) ||
        "CRM";
      onApply((b) => {
        const fc = findCard(b, cardId);
        if (!fc) return;
        fc.card.comments = fc.card.comments || [];
        fc.card.comments.push({
          id: optimisticId,
          userId: actor,
          text: bodyText,
          createdAt,
          parentId: replyParentId,
          authorLabel,
          source: "CRM",
          syncStatus: "pending",
        });
        pushActivity(fc.card, "Комментарий", actor, b, act);
      });
      try {
        const postRes = await fetch(`/api/orders/${card.linkedOrderId}/kanban-chat`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            action,
            ...(replyParentId ? { parentId: replyParentId } : {}),
          }),
        });
        const postData = (await postRes.json().catch(() => ({}))) as {
          error?: string;
          comment?: CardComment;
        };
        if (!postRes.ok) {
          onApply((b) => {
            const fc = findCard(b, cardId);
            if (!fc) return;
            fc.card.comments = (fc.card.comments || []).filter(
              (c) => c.id !== optimisticId,
            );
          });
          toast(postData.error ?? "Не удалось отправить сообщение в CRM-канбан", true);
          return false;
        }
        if (postData.comment && postData.comment.id !== optimisticId) {
          onApply((b) => {
            const fc = findCard(b, cardId);
            if (!fc) return;
            fc.card.comments = (fc.card.comments || []).map((c) =>
              c.id === optimisticId ? { ...postData.comment!, parentId: replyParentId } : c,
            );
          });
        }
        return true;
      } catch {
        onApply((b) => {
          const fc = findCard(b, cardId);
          if (!fc) return;
          fc.card.comments = (fc.card.comments || []).filter(
            (c) => c.id !== optimisticId,
          );
        });
        toast("Сеть недоступна", true);
        return false;
      }
    };

    if (
      card.linkedOrderId &&
      (requestedAction === "correction" ||
        requestedAction === "prosthetics" ||
        requestedAction === "pt")
    ) {
      const bodyText =
        requestedAction === "correction"
          ? `!!! ${trimmed}`
          : requestedAction === "prosthetics"
            ? `??? ${trimmed}`
            : formatOrderChatPtMemoMessage(trimmed);
      return postLinkedOrderChat(requestedAction, bodyText);
    }

    if (card.linkedOrderId) {
      let action: ChatAction = requestedAction;
      if (action === "comment") {
        action = isOrderChatCorrectionTrigger(trimmed)
          ? "correction"
          : isOrderProstheticsRequestTrigger(trimmed)
            ? "prosthetics"
            : "comment";
      }
      const bodyText =
        action === "correction"
          ? `!!! ${trimmed}`
          : action === "prosthetics"
            ? `??? ${trimmed}`
            : action === "pt"
              ? formatOrderChatPtMemoMessage(trimmed)
              : trimmed;
      return postLinkedOrderChat(action, bodyText);
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
        parentId: replyParentId,
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

  const persistAttachedFiles = async (
    fileList: File[],
    manualByIndex?: Map<number, { laneId: string; skipProduction: boolean }>,
  ) => {
    if (!fileList.length) return;
    const actor = chatActorUserId || board.users[0]?.id || "";
    const productionOnly = Boolean(card.parentCardId || (card.childCardIds || []).length > 0);
    const linked =
      !productionOnly &&
      Boolean(card.linkedOrderId) &&
      card.kaitenCardId != null &&
      Number.isFinite(card.kaitenCardId);
    let attachedOkCount = 0;
    for (const [i, file] of fileList.entries()) {
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
        if (orderAttId && card.linkedOrderId) {
          const nowIso = new Date().toISOString();
          const oaFile: CardFile = {
            id: `oa-${orderAttId}`,
            name: file.name,
            mime: file.type || "application/octet-stream",
            size: file.size,
            dataUrl: `/api/orders/${card.linkedOrderId}/attachments/${orderAttId}`,
            addedAt: nowIso,
            addedByUserId: actor,
            orderAttachmentId: orderAttId,
          };
          onApply((b) => {
            const fc = findCard(b, cardId);
            if (!fc) return;
            const dup = (fc.card.files || []).some(
              (f) => f.orderAttachmentId === orderAttId || f.id === oaFile.id,
            );
            if (dup) return;
            fc.card.files = [...(fc.card.files || []), oaFile];
            fc.card.updatedAt = nowIso;
            pushActivity(fc.card, `Прикреплён файл: ${oaFile.name}`, actor, b, act);
            if (isCardFileImage(oaFile)) {
              fc.card.comments = fc.card.comments || [];
              if (!fc.card.comments.some((c) => c.imageFileId === oaFile.id)) {
                fc.card.comments.push({
                  id: generateId("cm"),
                  userId: actor,
                  text: "",
                  createdAt: nowIso,
                  imageFileId: oaFile.id,
                });
              }
            }
          });
          attachedOkCount += 1;
          continue;
        }
        const cf = await readFileAsCardFile(file, actor);
        if (manualByIndex) {
          const manual = manualByIndex.get(i);
          if (manual) {
            cf.productionSkip = manual.skipProduction;
            if (!manual.skipProduction && manual.laneId) {
              cf.productionLaneId = manual.laneId;
            }
          }
        }
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

  const attachFilesFromChat = async (fileList: File[]) => {
    if (!fileList.length || !canAttachFiles) return;
    const shouldPromptManual =
      productionSettingsForCard.manualRoutingEnabled === true &&
      parentInProductionColumn &&
      !card.parentCardId;
    if (!shouldPromptManual) {
      await persistAttachedFiles(fileList);
      return;
    }
    const rows: ManualRouteDraftRow[] = [];
    fileList.forEach((file, index) => {
      const candidate = isProductionRoutingCandidateFile(
        file.name,
        file.type,
        productionSettingsForCard.archive3dExtensions,
      );
      if (!candidate) return;
      rows.push({
        fileIndex: index,
        fileName: file.name,
        laneId: "",
        skipProduction: false,
      });
    });
    if (rows.length === 0) {
      await persistAttachedFiles(fileList);
      return;
    }
    setManualRoutePendingFiles(fileList);
    setManualRouteRows(rows);
    setManualRouteOpen(true);
  };

  const saveManualRouteSelection = async () => {
    const map = new Map<number, { laneId: string; skipProduction: boolean }>();
    for (const row of manualRouteRows) {
      map.set(row.fileIndex, {
        laneId: row.skipProduction ? "" : row.laneId,
        skipProduction: row.skipProduction,
      });
    }
    const files = [...manualRoutePendingFiles];
    setManualRouteOpen(false);
    setManualRoutePendingFiles([]);
    setManualRouteRows([]);
    await persistAttachedFiles(files, map);
  };

  const cancelManualRouteSelection = () => {
    setManualRouteOpen(false);
    setManualRoutePendingFiles([]);
    setManualRouteRows([]);
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
  const childLookupBoards = allBoards && allBoards.length > 0 ? allBoards : [board];
  const childStatusRows = (card.childCardIds || [])
    .map((childId) => {
      for (const candidateBoard of childLookupBoards) {
        for (const col of candidateBoard.columns) {
          const child = col.cards.find((x) => x.id === childId);
          if (!child) continue;
          const checklist = child.productionChecklist || [];
          const done = checklist.filter((x) => x.completed).length;
          return {
            id: child.id,
            title: child.title,
            columnTitle: col.title,
            checklistDone: done,
            checklistTotal: checklist.length,
            checklist: checklist.map((row) => ({ ...row })),
            laneId: child.productionLaneId || "",
          };
        }
      }
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const parentProductionChecklistRows = !card.parentCardId
    ? (() => {
        const liveById = new Map(childStatusRows.map((row) => [row.id, row]));
        const snapshotRows = card.productionChecklistSnapshots || [];
        const merged = childStatusRows.map((row) => ({
          id: row.id,
          title: row.title,
          columnTitle: row.columnTitle,
          checklist: row.checklist,
          laneId: row.laneId,
          isLive: true,
        }));
        for (const row of snapshotRows) {
          if (liveById.has(row.childCardId)) continue;
          merged.push({
            id: row.childCardId,
            title: row.childTitle,
            columnTitle: row.columnTitle || "Архив",
            checklist: row.checklist || [],
            laneId: row.laneId || "",
            isLive: false,
          });
        }
        return merged;
      })()
    : [];
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

  const persistStageDue = (v: string) => {
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      setKanbanStageDue(fc.card, v);
      pushActivity(fc.card, "Изменён срок", b.users[0]?.id, b, act);
    });
    const oid = card.linkedOrderId?.trim() || "";
    if (oid && card.kaitenCardId != null && Number.isFinite(card.kaitenCardId)) {
      rememberOptimisticKanbanStageDue(oid, v);
      void patchOrderKaitenCard(oid, { stageDueDate: v || null }).then((r) => {
        if (!r.ok) {
          forgetOptimisticKanbanStageDue(oid);
          toast(r.error, true);
        }
      });
    }
    if (!shouldSkipCrmKanbanTelegram(card.kaitenCardId)) {
      const titleLine = (card.title || "").trim() || "Без названия";
      const linkHtml = kanbanCardLinkHtml(cardId, board.id, titleLine);
      const duePart = v ? `новый срок ${escapeTelegramHtml(v)}` : "срок сброшен";
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
              linesAdmin: [`Изменён срок в ${cardWord} и ${orderWord}: ${duePart}`],
            }
          : {}),
      });
    }
  };

  const toggleUrgent = () => {
    const next = !card.urgent;
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      fc.card.urgent = next;
      pushActivity(
        fc.card,
        next ? "Отмечена как срочная" : "Снята метка «Срочно»",
        b.users[0]?.id,
        b,
        act,
      );
    });
  };

  return (
    <div
      ref={overlayRef}
      className="kanban-root fixed inset-0 z-[200] flex bg-black/55 max-sm:items-stretch max-sm:overflow-hidden max-sm:p-0 sm:items-start sm:justify-center sm:overflow-y-auto sm:p-4 sm:py-6"
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
              disabled={!canManageKanbanBlock}
              className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={confirmBlock}
              >
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}

      {manualRouteOpen && (
        <div
          className="fixed inset-0 z-[255] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancelManualRouteSelection();
          }}
        >
          <div
            className="w-full max-w-3xl rounded-lg border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] p-4 text-[var(--kaiten-modal-text)] shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 text-sm font-semibold">Маршрут 3D/архивов</h3>
            <p className="mt-1 text-[0.75rem] text-[var(--kaiten-modal-muted)]">
              Выберите дорожку для каждого файла или отметьте «Не в производство».
            </p>
            <div className="mt-3 max-h-[42vh] space-y-2 overflow-y-auto pr-1">
              {manualRouteRows.map((row) => (
                <div
                  key={`${row.fileIndex}:${row.fileName}`}
                  className="rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-2"
                >
                  <div className="mb-2 text-[0.78rem] font-medium break-all">
                    {row.fileName}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {manualProductionLanes.map((lane) => {
                      const checked =
                        row.skipProduction === false && row.laneId === lane.id;
                      return (
                        <label
                          key={lane.id}
                          className="inline-flex items-center gap-1.5 text-[0.75rem]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setManualRouteRows((prev) =>
                                prev.map((x) =>
                                  x.fileIndex !== row.fileIndex
                                    ? x
                                    : {
                                        ...x,
                                        laneId: e.target.checked ? lane.id : "",
                                        skipProduction: false,
                                      },
                                ),
                              )
                            }
                            className="rounded"
                          />
                          {lane.name}
                        </label>
                      );
                    })}
                    <label className="inline-flex items-center gap-1.5 text-[0.75rem]">
                      <input
                        type="checkbox"
                        checked={row.skipProduction}
                        onChange={(e) =>
                          setManualRouteRows((prev) =>
                            prev.map((x) =>
                              x.fileIndex !== row.fileIndex
                                ? x
                                : {
                                    ...x,
                                    skipProduction: e.target.checked,
                                    laneId: e.target.checked ? "" : x.laneId,
                                  },
                            ),
                          )
                        }
                        className="rounded"
                      />
                      Не в производство
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--kaiten-modal-border)] px-3 py-1.5 text-sm"
                onClick={cancelManualRouteSelection}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-medium text-white"
                onClick={() => void saveManualRouteSelection()}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {pickerMode && card ? (
        <KanbanMemberPickerDialog
          open
          mode={pickerMode}
          board={board}
          initialUserIds={
            pickerMode === "assign"
              ? [...(card.assignees || [])]
              : [...(card.participants || [])]
          }
          onClose={() => setPickerMode(null)}
          onSave={savePicker}
        />
      ) : null}

      <div
        className="flex w-full flex-col max-sm:h-dvh max-sm:max-h-dvh max-sm:pt-[env(safe-area-inset-top)] sm:max-w-[min(1200px,100vw-24px)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {blocked && (
          <div className="flex shrink-0 items-stretch gap-2 rounded-t-[10px] border border-b-0 border-red-900/50 bg-gradient-to-b from-[#dc2626] to-[#b91c1c] px-3 py-2.5 text-white shadow-md max-sm:rounded-none max-sm:ps-[var(--app-mobile-menu-inset,3.5rem)] dark:from-[#991b1b] dark:to-[#7f1d1d]">
            <IconBrick className="h-5 w-5 shrink-0 text-white" />
            <div className="min-w-0 flex-1">
              <div className="text-[0.65rem] font-bold uppercase tracking-wide opacity-90">
                Работа остановлена
                {card.blockedAt ? ` · ${formatBlockedAt(card.blockedAt)}` : ""}
              </div>
              {blockReasonEditing ? (
                <textarea
                  ref={blockReasonEditRef}
                  value={blockReasonEditDraft}
                  onChange={(e) => setBlockReasonEditDraft(e.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-y rounded-md border border-white/30 bg-black/20 px-2 py-1.5 text-[0.8125rem] font-medium leading-snug text-white outline-none placeholder:text-white/50 focus:border-white/60"
                  placeholder="Причина остановки…"
                  aria-label="Причина блокировки"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEditBlockReason();
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      saveEditBlockReason();
                    }
                  }}
                  onBlur={() => {
                    if (!blockReasonEditingRef.current) return;
                    saveEditBlockReason();
                  }}
                />
              ) : (
                <div
                  className={`mt-0.5 text-[0.8125rem] font-medium leading-snug ${
                    canManageKanbanBlock
                      ? "cursor-text rounded-sm outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40"
                      : ""
                  }`}
                  title={
                    canManageKanbanBlock
                      ? "Двойной клик — изменить причину"
                      : undefined
                  }
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    beginEditBlockReason();
                  }}
                >
                  {(card.blockReason || "").trim() || "—"}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={!canManageKanbanBlock}
              title={canManageKanbanBlock ? undefined : KANBAN_BLOCK_PERM_HINT}
              className="shrink-0 self-center rounded-md bg-white/15 px-3 py-1.5 text-[0.75rem] font-semibold text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                if (!canManageKanbanBlock) return;
                const oid = card.linkedOrderId?.trim() || "";
                const hasKaiten =
                  card.kaitenCardId != null && Number.isFinite(card.kaitenCardId);
                onApply((b) => {
                  const fc = findCard(b, cardId);
                  if (!fc) return;
                  performUnblock(fc.card, b, act);
                });
                if (oid && hasKaiten) {
                  persistLinkedOrderBlock(oid, { blocked: false });
                }
              }}
            >
              Снять блокировку
            </button>
          </div>
        )}

        <div
          className={`relative flex flex-col border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] text-[var(--kaiten-modal-text)] shadow-[0_16px_40px_rgba(0,0,0,0.55)] max-sm:min-h-0 max-sm:flex-1 max-sm:overflow-hidden max-sm:rounded-none max-sm:border-x-0 max-sm:shadow-none ${
            blocked ? "rounded-b-[10px] rounded-t-none border-t-0" : "rounded-[10px]"
          }`}
          style={{ backgroundColor: "var(--kaiten-modal-bg)" }}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--kaiten-modal-border)] px-4 py-5 max-sm:ps-[var(--app-mobile-menu-inset,3.5rem)] sm:gap-4 sm:px-6 sm:py-6">
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
              <div className="mt-1.5 text-[0.7rem] leading-snug text-[var(--kaiten-modal-muted)] sm:mt-2 sm:text-[0.75rem]">
                <span>создана</span>
                {creatorLabel && creatorLabel !== "—" ? (
                  <>
                    <span> · </span>
                    <span>{creatorLabel}</span>
                  </>
                ) : null}
                <span> · </span>
                <span>{createdWhen || "—"}</span>
              </div>
              {card.continuesFromOrderId && card.continuesFromOrderNumber ? (
                <p className="mt-1 text-[0.7rem] leading-snug text-[var(--kaiten-modal-muted)] sm:text-[0.75rem]">
                  <span>Продолжение работы </span>
                  <Link
                    href={kanbanOrderDeepLinkPath(card.continuesFromOrderId)}
                    className="font-medium text-[var(--sidebar-blue)] underline-offset-2 hover:underline"
                  >
                    {card.continuesFromOrderNumber}
                  </Link>
                </p>
              ) : null}
              {(card.continuationFollowups ?? []).map((child) => (
                <p
                  key={child.orderId}
                  className="mt-1 text-[0.7rem] leading-snug text-[var(--kaiten-modal-muted)] sm:text-[0.75rem]"
                >
                  <span>У этой работы есть продолжение </span>
                  <Link
                    href={kanbanOrderDeepLinkPath(child.orderId)}
                    className="font-medium text-[var(--sidebar-blue)] underline-offset-2 hover:underline"
                  >
                    {child.orderNumber}
                  </Link>
                </p>
              ))}
              {card.lastMovedAt && (
                <div className="mt-1 text-[0.7rem] text-[var(--kaiten-modal-muted)] sm:text-[0.75rem]">
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

          <div className="flex w-full min-w-0 shrink-0 flex-nowrap items-center gap-0.5 overflow-x-auto border-b border-[var(--kaiten-modal-border)] px-1.5 py-1.5 sm:gap-2 sm:px-3 sm:py-2.5">
            <button
              type="button"
              title={
                canManageKanbanBlock
                  ? blocked
                    ? "Снять блокировку"
                    : "Заблокировать карточку"
                  : KANBAN_BLOCK_PERM_HINT
              }
              disabled={!canManageKanbanBlock}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-input)] hover:text-[var(--kaiten-modal-text)] disabled:cursor-not-allowed disabled:opacity-40 sm:h-[2.1rem] sm:w-[2.1rem]"
              onClick={() => {
                if (!canManageKanbanBlock) {
                  toast(KANBAN_BLOCK_PERM_HINT, true);
                  return;
                }
                if (blocked) {
                  const oid = card.linkedOrderId?.trim() || "";
                  const hasKaiten =
                    card.kaitenCardId != null &&
                    Number.isFinite(card.kaitenCardId);
                  onApply((b) => {
                    const fc = findCard(b, cardId);
                    if (!fc) return;
                    performUnblock(fc.card, b, act);
                    if (!shouldSkipCrmKanbanTelegram(fc.card.kaitenCardId)) {
                      const t = (fc.card.title || "").trim() || "Без названия";
                      const linkHtml = kanbanCardLinkHtml(cardId, board.id, t);
                      const who = escapeTelegramHtml((act || "Пользователь").trim());
                      const linkedOid = fc.card.linkedOrderId?.trim();
                      const { cardWord, orderWord } = linkedOid
                        ? cardOrderWordLinks(linkedOid, cardId, board.id)
                        : { cardWord: "", orderWord: "" };
                      postKanbanCrmTelegramNotify({
                        kaitenCardId: fc.card.kaitenCardId,
                        event: "tg_card_unblocked",
                        parseMode: "HTML",
                        lines: [`${who} снял(а) блокировку с ${linkHtml}`],
                        ...(linkedOid
                          ? {
                              linesAdmin: [
                                `${who} снял(а) блокировку с ${cardWord} и ${orderWord}`,
                              ],
                            }
                          : {}),
                      });
                    }
                  });
                  if (oid && hasKaiten) {
                    persistLinkedOrderBlock(oid, { blocked: false });
                  }
                } else openBlockPopup();
              }}
            >
              {blocked ? (
                <IconUnlock className={TOOLBAR_CIRCLE_ICON} />
              ) : (
                <IconBrick className={TOOLBAR_CIRCLE_ICON} />
              )}
            </button>
            <button
              type="button"
              title={movePrevTitle}
              disabled={!canMoveColumns}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-text)] disabled:opacity-40 sm:h-[2.1rem] sm:w-[2.1rem]"
              onClick={() => onMovePrevStage(cardId)}
            >
              <IconArrowLeft className={TOOLBAR_CIRCLE_ICON} />
            </button>
            <button
              type="button"
              title={moveNextTitle}
              disabled={!canMoveColumns}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-text)] disabled:opacity-40 sm:h-[2.1rem] sm:w-[2.1rem]"
              onClick={() => onMoveNextStage(cardId)}
            >
              <IconArrowRight className={TOOLBAR_CIRCLE_ICON} />
            </button>
            <div className="flex min-w-0 flex-1 justify-center sm:hidden">
              <KanbanDueUrgentControls
                compact
                stageDue={stageDue}
                canEditDueDate={canEditDueDate}
                urgent={Boolean(card.urgent)}
                onDueChange={persistStageDue}
                onToggleUrgent={toggleUrgent}
                inputClassName={baseInput}
              />
            </div>
            <div className="mx-0.5 hidden h-6 w-px shrink-0 bg-[var(--kaiten-modal-border)] sm:mx-1 sm:block" aria-hidden />
            <div className="hidden min-w-0 shrink items-center gap-2 overflow-x-auto sm:flex">
              <KanbanCardPeopleGroup
                layout="toolbar"
                label="Отв."
                userIds={card.assignees || []}
                variant="assignee"
                board={board}
                canManage={canManageAssignees}
                enableTitle="Ответственные — нажмите, чтобы изменить"
                disableTitle="Нет прав менять ответственных"
                onOpen={() => setPickerMode("assign")}
              />
              <KanbanCardPeopleGroup
                layout="toolbar"
                label="Участн."
                userIds={card.participants || []}
                variant="participant"
                board={board}
                canManage={canManageParticipants}
                enableTitle="Участники — нажмите, чтобы изменить"
                disableTitle="Нет прав менять участников"
                onOpen={() => setPickerMode("part")}
              />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
              {showOrderMailButton && card?.linkedOrderId ? (
                <button
                  type="button"
                  title={`Письма наряда (${card.sourceEmailCount})`}
                  aria-label="Письма наряда"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-input)] hover:text-[var(--kaiten-modal-text)] sm:h-[2.1rem] sm:w-[2.1rem]"
                  onClick={() => setOrderMailOpen(true)}
                >
                  <IconMail className={TOOLBAR_CIRCLE_ICON} />
                </button>
              ) : null}
              <button
                type="button"
                title="Скопировать ссылку на карточку"
                aria-label="Поделиться — копировать ссылку"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-input)] hover:text-[var(--kaiten-modal-text)] sm:h-[2.1rem] sm:w-[2.1rem]"
                onClick={() => onCopyCardLink(cardId)}
              >
                <IconLink className={TOOLBAR_CIRCLE_ICON} />
              </button>
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-2 border-b border-[var(--kaiten-modal-border)] px-2 py-1.5 sm:hidden">
            <KanbanCardPeopleGroup
              layout="stack"
              label="Отв."
              userIds={card.assignees || []}
              variant="assignee"
              board={board}
              canManage={canManageAssignees}
              enableTitle="Ответственные — нажмите, чтобы изменить"
              disableTitle="Нет прав менять ответственных"
              onOpen={() => setPickerMode("assign")}
            />
            <KanbanCardPeopleGroup
              layout="stack"
              label="Участн."
              userIds={card.participants || []}
              variant="participant"
              board={board}
              canManage={canManageParticipants}
              enableTitle="Участники — нажмите, чтобы изменить"
              disableTitle="Нет прав менять участников"
              onOpen={() => setPickerMode("part")}
            />
          </div>
          {card.kaitenMembersSyncWarning ? (
            <p className="border-b border-[var(--kaiten-modal-border)] px-3 py-1.5 text-[0.65rem] leading-snug text-amber-700 dark:text-amber-300">
              {card.kaitenMembersSyncWarning}
            </p>
          ) : null}

          <div className="flex min-h-0 max-sm:flex-1 max-sm:flex-col sm:flex-row sm:items-start">
            <div
              className={`flex min-w-0 flex-col max-sm:min-h-0 ${
                rightTab === "card" ? "max-sm:min-h-0 max-sm:flex-1" : "max-sm:shrink-0"
              } sm:flex-1`}
            >
              <div className="shrink-0 px-3 pb-2 pt-2.5">
              <div className="mb-0 sm:mb-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] px-2.5 py-1.5 text-left hover:bg-[var(--kaiten-modal-input)]"
                  onClick={() => setPlacementFieldsOpen((v) => !v)}
                  aria-expanded={placementFieldsOpen}
                >
                  <span className="min-w-0 truncate text-[0.65rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    Положение на доске
                    {!placementFieldsOpen ? (
                      <span className="ml-1.5 normal-case tracking-normal text-[var(--kaiten-modal-text)]">
                        {(
                          (trackLaneOptions ?? [...trackLanes()]).find(
                            (l) => l.id === card.trackLane,
                          )?.name || "—"
                        ).slice(0, 18)}
                        {" · "}
                        {String(currentColumnTitle || "—").slice(0, 16)}
                        {" · "}
                        {(
                          (board.cardTypes || kaitenCardTypes()).find(
                            (t) => t.id === card.cardTypeId,
                          )?.name || "—"
                        ).slice(0, 14)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[0.65rem] font-semibold text-[var(--kaiten-modal-text)]">
                    {placementFieldsOpen ? "Свернуть" : "Развернуть"}
                  </span>
                </button>
                {placementFieldsOpen ? (
              <div className="mt-2 grid gap-3 crm-t2:grid-cols-3">
                <div>
                  <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    {trackLaneFieldLabel ?? "Расположение"}
                  </div>
                  <select
                    className={baseInput}
                    disabled={!canEditTrack}
                    title={
                      canEditTrack
                        ? undefined
                        : "Нет права менять положение на доске"
                    }
                    value={card.trackLane || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (onChangeTrackLane && cardId) {
                        onChangeTrackLane(cardId, v);
                        return;
                      }
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
                </div>
                <div>
                  <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    Столбец
                  </div>
                  {columnTransfer && canMoveColumns ? (
                    <select
                      className={baseInput}
                      value={columnTransfer.currentColumnId}
                      onChange={(e) => {
                        const targetColumnId = e.target.value;
                        if (targetColumnId === columnTransfer.currentColumnId) return;
                        if (!cardId || !onMoveToColumn) return;
                        onMoveToColumn(cardId, targetColumnId);
                      }}
                    >
                      {columnTransfer.columns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={`${baseInput} min-h-[2.25rem] truncate`}>
                      {currentColumnTitle}
                    </div>
                  )}
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
                ) : null}
              </div>
              </div>
              <div className="sm:hidden">
                <KanbanCardModalTabs
                  rightTab={rightTab}
                  setRightTab={setRightTab}
                  canUsePayrollDone={canUsePayrollDone}
                  showCardTab
                />
              </div>

              <div
                className={`px-3 pb-3 ${
                  rightTab === "card"
                    ? "max-sm:min-h-0 max-sm:flex-1 max-sm:overflow-y-auto max-sm:overscroll-contain"
                    : "max-sm:hidden"
                }`}
              >
              <div className="mb-3 hidden sm:block">
                <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-amber-800/90 dark:text-amber-300/90">
                  Срок
                </div>
                <KanbanDueUrgentControls
                  stageDue={stageDue}
                  canEditDueDate={canEditDueDate}
                  urgent={Boolean(card.urgent)}
                  onDueChange={persistStageDue}
                  onToggleUrgent={toggleUrgent}
                  inputClassName={baseInput}
                />
              </div>

              <div className="mb-3">
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <div className="text-[0.625rem] font-medium uppercase tracking-wide text-sky-800/90 dark:text-sky-300/90">
                    Описание и детали заказа
                  </div>
                  {descDraft.trim() && descCanCollapse ? (
                    <button
                      type="button"
                      className="inline-flex h-5 shrink-0 items-center rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-1.5 text-[0.58rem] font-medium leading-none text-[var(--kaiten-modal-text)] hover:bg-[var(--kaiten-modal-border)]"
                      onClick={() => {
                        descUserOverrideRef.current = true;
                        setDescExpanded((v) => !v);
                      }}
                      aria-expanded={descExpanded}
                    >
                      {descExpanded ? "Свернуть описание" : "Развернуть описание"}
                    </button>
                  ) : descDraft.trim() ? null : (
                    <button
                      type="button"
                      className="inline-flex h-5 shrink-0 items-center rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-1.5 text-[0.58rem] font-medium leading-none text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)]"
                      onClick={() => {
                        descUserOverrideRef.current = true;
                        setDescExpanded(true);
                      }}
                    >
                      Добавить описание
                    </button>
                  )}
                </div>
                <div className="grid min-h-0 gap-2 crm-t2:grid-cols-[minmax(0,1fr)_minmax(10.5rem,34%)] crm-t2:items-start">
                  <div className="relative min-w-0">
                    <div
                      ref={descMeasureRef}
                      className={`${baseInput} pointer-events-none invisible absolute left-0 right-0 top-0 min-h-[100px] whitespace-pre-wrap break-words sm:min-h-[120px]`}
                      aria-hidden
                    >
                      {descDraft}
                    </div>
                    <div ref={descBoxRef}>
                    {descExpanded ? (
                      <LinkifiedTextarea
                        className={baseInput}
                        rows={3}
                        value={descDraft}
                        onChange={setDescDraft}
                        onBlur={() => {
                          void (async () => {
                            if (descDraft === (card.description || "")) return;
                            // Пока description подтягивается из наряда (slim чистит persist),
                            // пустой blur не должен затирать полное описание в Kaiten.
                            if (card.linkedOrderId && !descDraft.trim()) {
                              setDescDraft(card.description || "");
                              return;
                            }
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
                    ) : (
                      <div
                        className={`${baseInput} block w-full min-h-[4.5rem] max-h-[4.5rem] overflow-hidden text-left sm:min-h-[5rem] sm:max-h-[5rem]`}
                        aria-label="Описание заказа (сокращённо)"
                      >
                        <span className="line-clamp-3 whitespace-pre-wrap break-words sm:line-clamp-4">
                          {descDraft.trim() ? (
                            <LinkifiedPlainText text={descDraft} />
                          ) : (
                            <span className="text-[var(--kaiten-modal-muted)]">
                              Описание пустое
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    </div>
                  </div>
                  <aside
                    className="flex min-h-[100px] flex-col rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] p-1.5 sm:min-h-[120px]"
                  >
                    <div className="mb-1 shrink-0 text-[0.55rem] font-semibold uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                      Файлы наряда и чата
                    </div>
                    <div className="space-y-1.5 overflow-x-hidden">
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
                            {canMarkFilesForRedo ? (
                              <label
                                className="mt-0.5 inline-flex items-center gap-1.5 rounded px-0.5 py-0.5 text-[0.62rem] text-[var(--kaiten-modal-muted)]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={f.productionRedo === true}
                                  onChange={(e) =>
                                    onApply((b) => {
                                      const fc = findCard(b, cardId);
                                      if (!fc) return;
                                      const row = (fc.card.files || []).find((x) => x.id === f.id);
                                      if (!row) return;
                                      row.productionRedo = e.target.checked;
                                      fc.card.updatedAt = new Date().toISOString();
                                      pushActivity(
                                        fc.card,
                                        `${e.target.checked ? "Отмечен" : "Снят"} «переделать»: ${row.name}`,
                                        b.users[0]?.id,
                                        b,
                                        act,
                                      );
                                    })
                                  }
                                />
                                Переделать в новом цикле
                              </label>
                            ) : null}
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
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    {card.parentCardId ? "Производственный чеклист" : "Чеклист"}
                  </span>
                  <button
                    type="button"
                    className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-text)] hover:bg-[var(--kaiten-modal-input)] disabled:opacity-40"
                    disabled={!canManageKanbanChecklist}
                    onClick={addCheckItem}
                    aria-label="Добавить пункт"
                    title="Добавить пункт"
                  >
                    <span className="text-[0.65rem] font-semibold leading-none">+</span>
                  </button>
                </div>
                <ChecklistEditor
                  card={card}
                  cardId={cardId}
                  onApply={onApply}
                  activityActorLabel={act}
                  canEdit={canManageKanbanChecklist}
                />
              </div>

              <KanbanCardTimerBlock
                card={card}
                cardId={cardId}
                onApply={onApply}
                activityActorLabel={act}
                canManage={canManageKanbanTimer}
                sessionUserId={commentAuthorUserId ?? null}
              />

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

              {!card.parentCardId && parentProductionChecklistRows.length > 0 ? (
                <div className="mb-3">
                  <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    Чеклисты производства (только чтение)
                  </div>
                  <div className="space-y-2">
                    {parentProductionChecklistRows.map((row) => (
                      <div
                        key={`snapshot-${row.id}`}
                        className="rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-2"
                      >
                        <div className="mb-1 min-w-0 truncate text-[0.76rem] text-[var(--kaiten-modal-text)]">
                          {row.title}
                        </div>
                        {row.checklist.length === 0 ? (
                          <div className="text-[0.72rem] text-[var(--kaiten-modal-muted)]">
                            Чеклист пуст.
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {row.checklist.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 text-[0.74rem] text-[var(--kaiten-modal-text)]"
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.completed)}
                                  readOnly
                                  disabled
                                  className="h-3.5 w-3.5 accent-[var(--kaiten-accent,#9333ea)]"
                                />
                                <span className={item.completed ? "line-through opacity-85" : ""}>
                                  {item.text}
                                </span>
                                {item.completed && item.completedAt ? (
                                  <span className="ml-auto text-[0.66rem] text-[var(--kaiten-modal-muted)]">
                                    {formatDateTimeRu(item.completedAt)}
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-[0.65rem] text-[var(--kaiten-modal-muted)]">
                    Изменения чеклиста доступны только в дочерних карточках производства.
                  </p>
                </div>
              ) : null}

              </div>

            </div>

            <div
              className={`flex w-full min-h-0 flex-col border-t border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-aside)] sm:w-[min(400px,42%)] sm:max-w-md sm:shrink-0 sm:border-l sm:border-t-0 ${
                rightTab === "card"
                  ? "max-sm:hidden"
                  : "max-sm:min-h-0 max-sm:flex-1"
              }`}
              style={{ backgroundColor: "var(--kaiten-modal-aside)" }}
            >
              <div className="hidden sm:block">
                <KanbanCardModalTabs
                  rightTab={rightTab === "card" ? "chat" : rightTab}
                  setRightTab={setRightTab}
                  canUsePayrollDone={canUsePayrollDone}
                  showCardTab={false}
                />
              </div>
              {rightTab === "done" ? (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <PayrollDonePanel
                    orderId={card.linkedOrderId ?? null}
                    kanbanCardId={card.id}
                    sessionRole={sessionUserRole}
                  />
                </div>
              ) : rightTab === "act" ? (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 text-[0.8125rem]">
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
              ) : (
                <ChatPanel
                  card={card}
                  board={board}
                  kaitenLoading={kaitenChatLoading}
                  adminMentionTag={adminMentionTag}
                  adminMentionUserIds={adminMentionUserIds}
                  productionMentionTag={productionMentionTagResolved}
                  productionUserIds={productionUserIds}
                  canSendPt={
                    sessionUserRole != null &&
                    canSendKanbanChatPtMemo(sessionUserRole) &&
                    Boolean(card.linkedOrderId)
                  }
                  onSend={sendComment}
                  onFilesDropped={attachFilesFromChat}
                  onOpenAttachment={openAttachment}
                />
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
      {orderMailOpen && card?.linkedOrderId ? (
        <OrderSourceEmailsModal
          orderId={card.linkedOrderId}
          orderNumber={extractOrderNumberLabelFromKanbanCardTitle(card.title)}
          hideReplyStatus
          onClose={() => setOrderMailOpen(false)}
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
      loading="lazy"
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

function chatSyncStatusLabel(cm: CardComment): string {
  if (cm.syncStatus === "pending") return "Синхронизация…";
  if (cm.syncStatus === "failed") return "Не отправлено в Kaiten";
  if (cm.syncStatus === "retried") return "Повторная отправка…";
  if (cm.syncStatus === "synced") return "Синхронизировано";
  if (cm.syncStatus === "local") return "Локально";
  return "";
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
  kaitenLoading = false,
  adminMentionTag,
  adminMentionUserIds,
  productionMentionTag,
  productionUserIds,
  canSendPt = false,
  onSend,
  onFilesDropped,
  onOpenAttachment,
}: {
  card: KanbanCard;
  board: KanbanBoard;
  kaitenLoading?: boolean;
  adminMentionTag: string;
  adminMentionUserIds: readonly string[];
  /** Нормализованный токен (напр. clickpr) для подстановки @ в текст. */
  productionMentionTag: string;
  productionUserIds: readonly string[];
  /** Кнопка «ПТ»: старший техник, админ, руководитель, владелец; наряд привязан. */
  canSendPt?: boolean;
  onSend: (
    t: string,
    action?: ChatAction,
    parentId?: string | null,
  ) => boolean | Promise<boolean>;
  onFilesDropped: (files: File[]) => void | Promise<void>;
  onOpenAttachment: (f: CardFile) => void;
}) {
  const { byId: crmChatById, list: crmChatList } = useKanbanCrmUsers();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inp, setInp] = useState("");
  const [caretPos, setCaretPos] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [replyTo, setReplyTo] = useState<CardComment | null>(null);
  const chatAuthorName = (userId: string, authorLabel?: string) => {
    const lab = (authorLabel ?? "").trim();
    if (lab) return lab;
    return (
      crmChatById.get(userId)?.displayName ??
      board.users.find((x) => x.id === userId)?.name ??
      "Неизвестно"
    );
  };
  const commentsById = useMemo(() => {
    const m = new Map<string, CardComment>();
    for (const c of card.comments || []) m.set(c.id, c);
    return m;
  }, [card.comments]);
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
    const syntheticLab: ChatMentionOption[] =
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
    const syntheticProd: ChatMentionOption[] =
      productionMentionTag
        ? [
            {
              id: "__kanban_production_team__",
              label: `Производство (@${productionMentionTag})`,
              insertText: `@${productionMentionTag}`,
              searchText:
                `производство ${productionMentionTag} производственный цех`.toLowerCase(),
            },
          ]
        : [];
    const synthetic = [...syntheticProd, ...syntheticLab];
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
    productionMentionTag,
    productionUserIds,
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

  const flushFiles = (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => f.size > 0);
    if (!arr.length) return;
    void Promise.resolve(onFilesDropped(arr));
  };

  const submitMessage = async (action: ChatAction = "comment") => {
    const v = inp.trim();
    if (!v) return;
    const parent = replyTo?.id ?? null;
    setInp("");
    setCaretPos(0);
    setMentionIndex(0);
    setReplyTo(null);
    const ok = await Promise.resolve(onSend(v, action, parent));
    if (!ok) {
      setInp(v);
      setCaretPos(v.length);
    }
  };

  useEffect(() => {
    setReplyTo(null);
  }, [card.id]);
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
      {kaitenLoading ? (
        <div
          className="flex items-center gap-1.5 px-2 pt-2 text-[0.7rem] text-[var(--kaiten-modal-muted)]"
          role="status"
        >
          <span
            className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
          Загрузка из Kaiten…
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        {chatBlocks.map((block) => {
          if (block.kind === "imageRow") {
            const cm0 = block.comments[0];
            const author0 = chatAuthorName(cm0.userId, cm0.authorLabel);
            return (
              <div
                key={block.key}
                className="mb-2 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]"
              >
                <div className="mb-0.5 flex items-start justify-between gap-2 text-[0.7rem] text-[var(--kaiten-modal-muted)]">
                  <span>
                    {author0} · {relativeTimeRu(cm0.createdAt)}
                  </span>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-control)] hover:text-[var(--kaiten-modal-text)]"
                    title="Ответить"
                    aria-label="Ответить на комментарий"
                    onClick={() => {
                      setReplyTo(cm0);
                      requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                  >
                    <IconReply className={TOOLBAR_CIRCLE_ICON} />
                  </button>
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
          const display = formatKanbanChatMessageDisplay(cm.text);
          const parent = cm.parentId ? commentsById.get(cm.parentId) : null;
          const parentAuthor = parent
            ? chatAuthorName(parent.userId, parent.authorLabel)
            : null;
          const parentSnippet = parent
            ? formatKanbanChatMessageDisplay(parent.text).body.trim().slice(0, 80)
            : "";

          return (
            <div
              key={cm.id}
              className={`${kanbanChatMessageShellClass(display.kind)}${
                cm.parentId
                  ? " ml-3 border-l-2 border-[var(--kaiten-accent)]/40 pl-2"
                  : ""
              }`}
            >
              <div className="mb-0.5 flex items-start justify-between gap-2">
                <div className="min-w-0 text-[0.7rem] text-[var(--kaiten-modal-muted)]">
                  {author} · {relativeTimeRu(cm.createdAt)}
                </div>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-control)] hover:text-[var(--kaiten-modal-text)]"
                  title="Ответить"
                  aria-label="Ответить на комментарий"
                  onClick={() => {
                    setReplyTo(cm);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                >
                  <IconReply className={TOOLBAR_CIRCLE_ICON} />
                </button>
              </div>
              {parentAuthor ? (
                <p className="mb-1 text-[0.65rem] leading-snug text-[var(--kaiten-modal-muted)]">
                  в ответ {parentAuthor}
                  {parentSnippet ? `: «${parentSnippet}»` : ""}
                </p>
              ) : null}
              {display.label ? (
                <p className={kanbanChatMessageLabelClass(display.kind)}>{display.label}</p>
              ) : null}
              {shouldShowKanbanChatSyncStatus(display.kind, cm.syncStatus) ? (
                <div className="mb-0.5 text-[0.68rem] text-[var(--kaiten-modal-muted)]">
                  {chatSyncStatusLabel(cm)}
                </div>
              ) : null}
              {cm.imageFileId && !imgFile ? (
                <div className="mt-0.5 text-[0.75rem] text-[var(--kaiten-modal-muted)]">
                  Изображение удалено из карточки
                  {display.body.trim() ? (
                    <span className="mt-0.5 block whitespace-pre-wrap break-words text-[var(--kaiten-modal-text)]">
                      {display.body}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">{display.body}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="relative flex shrink-0 flex-col gap-2 border-t border-[var(--kaiten-modal-border)] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {replyTo ? (
          <div className="flex items-start gap-2 rounded-md border border-[var(--kaiten-accent)]/35 bg-[var(--kaiten-accent)]/10 px-2 py-1.5 text-[0.7rem] text-[var(--kaiten-modal-text)]">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[var(--kaiten-accent)]">
                Ответ{" "}
                {chatAuthorName(replyTo.userId, replyTo.authorLabel)}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[var(--kaiten-modal-muted)]">
                {formatKanbanChatMessageDisplay(replyTo.text).body.trim() || "…"}
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded p-1 text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)]"
              aria-label="Отменить ответ"
              title="Отменить ответ"
              onClick={() => setReplyTo(null)}
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
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
          className="h-11 w-full min-w-0 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-3 py-2 text-center text-[0.8125rem] font-medium text-[var(--kaiten-modal-text)] placeholder:text-[var(--kaiten-modal-muted)]"
          placeholder="Комментарий"
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
        <div className="flex min-w-0 items-stretch gap-1.5 sm:gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 rounded-md border border-amber-400/50 bg-amber-50 px-2 py-2 text-[0.75rem] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-40 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/20 sm:px-2.5 sm:py-2.5 sm:text-[0.8125rem]"
            disabled={!inp.trim()}
            title="Отправить как корректировку"
            onClick={() => {
              void submitMessage("correction");
            }}
          >
            Корректировка
          </button>
          <button
            type="button"
            className="min-w-0 flex-1 rounded-md border border-sky-400/50 bg-sky-50 px-2 py-2 text-[0.75rem] font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-40 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-200 dark:hover:bg-sky-400/20 sm:px-2.5 sm:py-2.5 sm:text-[0.8125rem]"
            disabled={!inp.trim()}
            title="Отправить как заказ протетики"
            onClick={() => {
              void submitMessage("prosthetics");
            }}
          >
            Заказ протетики
          </button>
          {canSendPt ? (
            <button
              type="button"
              className="w-11 shrink-0 rounded-md border border-violet-400/50 bg-violet-50 px-1.5 py-2 text-[0.75rem] font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-40 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-200 dark:hover:bg-violet-400/20 sm:w-12 sm:py-2.5 sm:text-[0.8125rem]"
              disabled={!inp.trim()}
              title="Отправить в чат и в колонку ПТ в заказах"
              onClick={() => {
                void submitMessage("pt");
              }}
            >
              ПТ
            </button>
          ) : null}
          <button
            type="button"
            className="flex w-11 shrink-0 items-center justify-center rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] px-2 py-2 text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)] disabled:opacity-40 sm:w-12 sm:py-2.5"
            disabled={!inp.trim()}
            aria-label="Отправить комментарий"
            onClick={() => {
              void submitMessage();
            }}
          >
            <IconSend className="h-5 w-5" />
          </button>
        </div>
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

function productionReworkCount(item: ChecklistItem): number {
  const n = Number((item as ChecklistItem & { reworkCount?: unknown }).reworkCount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function ChecklistEditor({
  card,
  cardId,
  onApply,
  activityActorLabel,
  canEdit,
}: {
  card: KanbanCard;
  cardId: string;
  onApply: (fn: (b: KanbanBoard) => void) => void;
  activityActorLabel?: string;
  canEdit: boolean;
}) {
  const isProductionChecklist = Boolean(card.parentCardId);
  const cl = isProductionChecklist
    ? card.productionChecklist || []
    : card.checklist || [];
  const hasZipSourceFile =
    isProductionChecklist &&
    (card.files || []).some((f) => {
      const name = String(f.name || "").trim().toLowerCase();
      const mime = String(f.mime || "").trim().toLowerCase();
      return name.endsWith(".zip") || mime.includes("zip");
    });
  const hasArchiveChecklistRows =
    isProductionChecklist &&
    (card.productionChecklist || []).some((row) => row.fromArchive);
  const showNo3dInArchiveWarning = hasZipSourceFile && !hasArchiveChecklistRows;
  const done = cl.filter((i) => i.completed).length;
  const total = cl.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      {showNo3dInArchiveWarning ? (
        <div className="mb-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[0.75rem] leading-snug text-amber-200">
          В архиве не найдено 3D-файлов для чеклиста.
        </div>
      ) : null}
      {cl.map((item) => {
        const reworkCount = isProductionChecklist ? productionReworkCount(item) : 0;
        return (
        <div key={item.id} className="mb-1 flex items-center gap-2">
          <ChecklistCheckboxWithFirework
            completed={item.completed}
            disabled={!canEdit}
            onToggle={() =>
              onApply((b) => {
                if (!canEdit) return;
                const fc = findCard(b, cardId);
                if (!fc) return;
                const list = fc.card.parentCardId
                  ? fc.card.productionChecklist || []
                  : fc.card.checklist || [];
                const it = list.find((x) => x.id === item.id);
                if (!it) return;
                it.completed = !it.completed;
                it.completedAt = it.completed ? new Date().toISOString() : null;
                if (fc.card.parentCardId) {
                  syncParentProductionChecklistSnapshot(b, fc.card.id);
                }
                pushActivity(fc.card, `Чеклист: ${it.text}`, b.users[0]?.id, b, activityActorLabel);
              })
            }
          />
          <input
            type="text"
            readOnly={!canEdit}
            className="min-w-0 flex-1 rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-1.5 py-0.5 text-[0.8125rem] text-[var(--kaiten-modal-text)] read-only:opacity-80"
            defaultValue={item.text}
            onBlur={(e) => {
              if (!canEdit) return;
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
                if (fc.card.parentCardId) {
                  syncParentProductionChecklistSnapshot(b, fc.card.id);
                }
              });
            }}
          />
          {item.completed && item.completedAt ? (
            <span className="shrink-0 text-[0.66rem] text-[var(--kaiten-modal-muted)]">
              {formatDateTimeRu(item.completedAt)}
            </span>
          ) : null}
          {isProductionChecklist ? (
            <button
              type="button"
              disabled={!canEdit}
              className="shrink-0 rounded border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.5 text-[0.66rem] font-medium text-rose-200 hover:bg-rose-500/25 disabled:opacity-40"
              onClick={() =>
                onApply((b) => {
                  if (!canEdit) return;
                  const fc = findCard(b, cardId);
                  if (!fc || !fc.card.parentCardId) return;
                  const list = fc.card.productionChecklist || [];
                  const it = list.find((x) => x.id === item.id);
                  if (!it) return;
                  const at = new Date().toISOString();
                  it.reworkCount = (it.reworkCount || 0) + 1;
                  it.reworkEvents = [...(it.reworkEvents || []), at];
                  it.completed = false;
                  it.completedAt = null;
                  syncParentProductionChecklistSnapshot(b, fc.card.id);
                  pushActivity(
                    fc.card,
                    `Переделка: ${it.text}`,
                    b.users[0]?.id,
                    b,
                    activityActorLabel,
                  );
                })
              }
            >
              Переделываем
            </button>
          ) : null}
          {isProductionChecklist && reworkCount > 0 ? (
            <span className="shrink-0 rounded border border-rose-500/35 bg-rose-500/10 px-1.5 py-0.5 text-[0.62rem] text-rose-200">
              переделок: {reworkCount}
            </span>
          ) : null}
          <button
            type="button"
            disabled={!canEdit}
            className="text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)] disabled:opacity-40"
            onClick={() =>
              onApply((b) => {
                if (!canEdit) return;
                const fc = findCard(b, cardId);
                if (!fc) return;
                if (fc.card.parentCardId) {
                  fc.card.productionChecklist = (fc.card.productionChecklist || []).filter(
                    (x) => x.id !== item.id,
                  );
                  syncParentProductionChecklistSnapshot(b, fc.card.id);
                  return;
                }
                fc.card.checklist = (fc.card.checklist || []).filter((x) => x.id !== item.id);
              })
            }
          >
            <IconX />
          </button>
        </div>
        );
      })}
      {total > 0 ? (
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
      ) : null}
      {!canEdit ? (
        <p className="mt-2 text-[0.65rem] leading-snug text-[var(--kaiten-modal-muted)]">
          Редактирование чеклиста отключено: нет права «Канбан: чек-листы» (настройки
          доступа).
        </p>
      ) : null}
    </div>
  );
}
