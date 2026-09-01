"use client";

import type { KanbanAppState, KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import {
  getCardTypeAccent,
  isCardBlocked,
  isDueUrgentRedInList,
  isKanbanAggregateBoardId,
  kaitenCardTypes,
} from "@/lib/kanban/model";
import {
  buildKanbanListViewRows,
  DEFAULT_LIST_SORT,
  defaultDirForSortKey,
  type ListSort,
  type ListSortKey,
} from "@/lib/kanban/list-view-sort";
import { getKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import {
  kanbanCardHoverPreviewBlockReason,
  kanbanCardHoverPreviewBody,
} from "@/lib/kanban/kanban-card-hover-preview";
import type { KanbanMemberPickerMode } from "@/lib/kanban/kanban-card-members-client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

const LIST_ROW_PX = 68;
const LIST_OVERSCAN = 10;
import { IconBrick, IconLink, IconListCheck, IconMail, IconPlus, IconUnlock } from "./kanban-icons";
import { KanbanPersonAvatar } from "./KanbanPersonAvatar";
import { KanbanMemberPickerDialog } from "./KanbanMemberPickerDialog";
import { useKanbanCardHoverPreview } from "./KanbanCardHoverPreview";
import { KanbanTimerIcon } from "./KanbanTimerIcon";
import { OrderSourceEmailsModal } from "@/components/orders/OrderSourceEmailsModal";
import { extractOrderNumberLabelFromKanbanCardTitle } from "@/lib/kanban-mention-telegram-html";

/**
 * Desktop: одна сетка на шапку + все строки (`auto` = max по столбцу).
 * Название — не 1fr: иначе пустота между текстом и «Колонка».
 * Хвост `1fr` забирает лишнюю ширину, карточка остаётся на всю строку.
 */
const LIST_TABLE =
  "grid w-full grid-cols-1 gap-y-1 sm:grid-cols-[minmax(0,60ch)_auto_auto_auto_auto_auto_minmax(0,1fr)] sm:items-stretch sm:gap-x-0 sm:gap-y-1.5";

/** Mobile: своя сетка. Desktop: `contents` — ячейки входят в subgrid карточки. */
const LIST_ROW_INNER = "grid w-full grid-cols-1 gap-y-1 gap-x-2 sm:contents";

const LIST_ROW_CONTROL = "data-list-row-control";

function eventTargetsListRowControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`[${LIST_ROW_CONTROL}]`) != null;
}

function IconChevronRight(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={props.className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M8.22 5.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ListInlineExpandedBody({ card }: { card: KanbanCard }) {
  const body = kanbanCardHoverPreviewBody(card);
  const blockReason = kanbanCardHoverPreviewBlockReason(card);
  const cl = card.checklist || [];
  return (
    <div className="space-y-2 px-0.5 py-1.5 text-[0.72rem] leading-snug text-[var(--kanban-text)]">
      {blockReason ? (
        <div className="rounded-md border border-red-900/45 bg-red-950/35 px-2 py-1.5">
          <p className="text-[0.58rem] font-bold uppercase tracking-wide text-red-400">
            Причина блокировки
          </p>
          <p className="mt-0.5 whitespace-pre-wrap font-medium text-red-100">
            {blockReason}
          </p>
        </div>
      ) : null}
      {body ? (
        <p className="whitespace-pre-wrap text-[var(--kanban-text-muted)]">{body}</p>
      ) : (
        <p className="text-[var(--kanban-text-muted)]">Нет описания заказа</p>
      )}
      {cl.length > 0 ? (
        <ul className="space-y-1">
          {cl.map((item) => (
            <li key={item.id} className="flex items-start gap-1.5">
              <span
                className={`mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm border ${
                  item.completed
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-[var(--kanban-text-muted)]"
                }`}
                aria-hidden
              />
              <span className={item.completed ? "line-through opacity-60" : ""}>
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function homeColumnIndexForCard(homeBoard: KanbanBoard, cardId: string): number {
  for (let i = 0; i < homeBoard.columns.length; i++) {
    if (homeBoard.columns[i].cards.some((c) => c.id === cardId)) return i;
  }
  return -1;
}

function ListMemberAddButton({
  title,
  disabled,
  onClick,
  compact = false,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  /** Mobile list: меньше аватара (16 vs 24). Без data-no-touch-expand глобальный 44px раздувает кружок. */
  compact?: boolean;
  /** @deprecated размер задаёт compact */
  size?: "xs" | "sm";
}) {
  return (
    <button
      type="button"
      data-no-touch-expand
      data-list-row-control
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`box-border inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-[var(--kanban-text-muted)] p-0 text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-accent)] dark:hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40 ${
        compact
          ? "!h-6 !w-6 !min-h-6 !min-w-6 !max-h-6 !max-w-6"
          : "h-6 w-6 min-h-6 min-w-6 max-h-6 max-w-6"
      }`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <IconPlus className={compact ? "h-2 w-2" : "h-2.5 w-2.5"} />
    </button>
  );
}

function ListMembersCell({
  userIds,
  variant,
  homeBoard,
  canManage,
  onAdd,
  size = "sm",
}: {
  userIds: string[];
  variant: "assignee" | "participant";
  homeBoard: KanbanBoard;
  canManage: boolean;
  onAdd: () => void;
  size?: "xs" | "sm";
}) {
  const isMobileList = size === "xs";
  const avatarSize = isMobileList ? "list" : "listSm";
  const maxVisible = isMobileList ? 2 : 5;
  const visible = userIds.slice(0, maxVisible);
  const overflow = userIds.length - visible.length;
  return (
    <div
      data-list-row-control
      className="flex min-w-0 flex-nowrap items-start justify-start gap-0.5 overflow-visible p-0.5 -m-0.5"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {visible.length > 0 ? (
        <div className="flex min-w-0 items-start gap-1">
          {visible.map((uid) => (
            <span key={uid} className="first:ml-0">
              <KanbanPersonAvatar
                userId={uid}
                homeBoard={homeBoard}
                variant={variant}
                size={avatarSize}
                nameCaption
                captionClassName={isMobileList ? "text-[0.5rem]" : undefined}
                titleSuffix=""
              />
            </span>
          ))}
          {overflow > 0 ? (
            <span
              className={`inline-flex shrink-0 items-center justify-center rounded-full bg-black/[0.08] px-1 font-semibold text-[var(--kanban-text-muted)] dark:bg-white/[0.1] ${
                isMobileList
                  ? "h-5 min-w-5 text-[0.45rem]"
                  : "h-7 min-w-7 text-[0.5rem]"
              }`}
              title={`Ещё ${overflow}`}
            >
              +{overflow}
            </span>
          ) : null}
        </div>
      ) : null}
      {canManage ? (
        <span
          className={`inline-flex shrink-0 items-center ${
            isMobileList ? "mt-0.5" : "mt-1.5"
          }`}
        >
          <ListMemberAddButton
            compact={isMobileList}
            title={
              variant === "assignee" ? "Добавить ответственного" : "Добавить участника"
            }
            onClick={onAdd}
          />
        </span>
      ) : userIds.length === 0 ? (
        <span className="mt-1.5 inline-flex items-center text-[0.75rem] text-[var(--kanban-text-muted)]">
          —
        </span>
      ) : null}
    </div>
  );
}

function SortArrows({
  active,
  dir,
}: {
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <span
      className="inline-flex shrink-0 flex-col items-center justify-center leading-none"
      aria-hidden
    >
      <svg
        viewBox="0 0 12 8"
        className={`h-2 w-2.5 ${active && dir === "asc" ? "text-[var(--kanban-accent)]" : "text-[var(--kanban-text-muted)] opacity-45"}`}
      >
        <path d="M6 1L1 7h10L6 1z" fill="currentColor" opacity={active && dir === "asc" ? 1 : 0.65} />
      </svg>
      <svg
        viewBox="0 0 12 8"
        className={`-mt-0.5 h-2 w-2.5 ${active && dir === "desc" ? "text-[var(--kanban-accent)]" : "text-[var(--kanban-text-muted)] opacity-45"}`}
      >
        <path d="M6 7L11 1H1l5 6z" fill="currentColor" opacity={active && dir === "desc" ? 1 : 0.65} />
      </svg>
    </span>
  );
}

function SortHeaderButton({
  label,
  sortKey,
  sort,
  onSortChange,
}: {
  label: string;
  sortKey: ListSortKey;
  sort: ListSort;
  onSortChange: (next: ListSort) => void;
}) {
  const active = sort.key === sortKey;
  const hint =
    sortKey === "created"
      ? "По дате создания"
      : sortKey === "title"
        ? "По названию"
        : sortKey === "column"
          ? "По колонке доски (внутри колонки — новые сверху)"
          : sortKey === "due"
            ? "По сроку"
            : sortKey === "assignee"
              ? "По числу ответственных"
              : sortKey === "participants"
                ? "По числу участников"
                : "Сортировка";
  const orderRu = active
    ? sort.dir === "asc"
      ? "по возрастанию"
      : "по убыванию"
    : "";
  return (
    <button
      type="button"
      className="group inline-flex w-full min-w-0 items-center justify-start gap-0.5 rounded px-0.5 py-0.5 text-left hover:bg-[color-mix(in_srgb,var(--kanban-accent)_10%,transparent)] hover:text-[var(--kanban-text)]"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      title={`${hint}${active ? ` (${orderRu})` : ""}. Нажмите — сортировать, ещё раз — обратный порядок`}
      onClick={() => {
        if (active) {
          onSortChange({
            key: sortKey,
            dir: sort.dir === "asc" ? "desc" : "asc",
          });
        } else {
          onSortChange({ key: sortKey, dir: defaultDirForSortKey(sortKey) });
        }
      }}
    >
      <span className="min-w-0 truncate">{label}</span>
      <SortArrows active={active} dir={sort.dir} />
    </button>
  );
}

function ListStageDueCell({
  stageDue,
  urgent,
  canEditDueDate,
  onDueChange,
  onUrgentChange,
  compact = false,
  hideUrgent = false,
}: {
  stageDue: string;
  urgent: boolean;
  canEditDueDate: boolean;
  onDueChange?: (ymd: string) => void;
  onUrgentChange?: (next: boolean) => void;
  /** Одна строка: дата + «Срочно» рядом (mobile list). */
  compact?: boolean;
  /** «Срочно» вынесено отдельно (mobile mock). */
  hideUrgent?: boolean;
}) {
  const dueUrgentRed = stageDue ? isDueUrgentRedInList(stageDue) : false;
  return (
    <div
      data-list-row-control
      className={
        compact
          ? "flex shrink-0 flex-row items-center gap-0.5 p-0.5 -m-0.5"
          : "flex min-w-0 flex-col gap-1 p-0.5 -m-0.5"
      }
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="date"
        disabled={!canEditDueDate || !onDueChange}
        value={stageDue}
        onChange={(e) => onDueChange?.(e.target.value)}
        title={
          canEditDueDate
            ? "Срок карточки канбана (Kaiten). Не лабораторный срок и не дата записи."
            : "Нет прав менять срок карточки"
        }
        className={`${
          compact
            ? "h-7 min-h-7 w-[6.75rem] min-w-0 px-1.5 py-0 text-[0.65rem] font-semibold"
            : "h-7 min-h-7 w-[7.1rem] px-1.5 py-0.5 text-[0.65rem]"
        } max-w-full shrink-0 rounded border border-[var(--kanban-border)] bg-[var(--kanban-card-bg)] leading-tight text-[var(--kanban-text)] disabled:cursor-not-allowed disabled:opacity-50 ${
          dueUrgentRed ? "font-semibold text-red-500 dark:text-red-400" : ""
        } [color-scheme:light] dark:[color-scheme:dark]`}
      />
      {hideUrgent ? null : (
        <button
          type="button"
          disabled={!onUrgentChange}
          title={
            urgent
              ? "Снять метку «Срочно» для следующего отдела (только канбан)"
              : "Срочно для следующего отдела (только канбан, наряд не меняется)"
          }
          className={`shrink-0 rounded border font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            compact
              ? "h-7 min-h-7 px-1.5 py-0 text-[0.5rem] leading-none"
              : "h-7 min-h-7 w-fit max-w-full px-2 py-0.5 text-[0.58rem]"
          } ${
            urgent
              ? "border-orange-600/80 bg-gradient-to-b from-orange-500 to-red-600 text-white shadow-sm"
              : "border-[var(--kanban-border)] bg-[var(--kanban-card-bg)] text-[var(--kanban-text-muted)] hover:border-orange-400/50 hover:text-orange-700 dark:hover:text-orange-300"
          }`}
          onClick={() => onUrgentChange?.(!urgent)}
        >
          Срочно
        </button>
      )}
    </div>
  );
}

function ListUrgentPillButton({
  urgent,
  onUrgentChange,
}: {
  urgent: boolean;
  onUrgentChange?: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      data-no-touch-expand
      data-list-row-control
      disabled={!onUrgentChange}
      title={
        urgent
          ? "Снять метку «Срочно» для следующего отдела (только канбан)"
          : "Срочно для следующего отдела (только канбан, наряд не меняется)"
      }
      className={`inline-flex h-7 min-h-7 min-w-0 shrink-0 items-center whitespace-nowrap rounded-md border px-2.5 text-[0.5rem] font-extrabold uppercase leading-none tracking-wide disabled:cursor-not-allowed disabled:opacity-50 ${
        urgent
          ? "border-orange-600 bg-gradient-to-b from-orange-500 to-red-600 text-white shadow-sm"
          : "border-[var(--kanban-text-muted)] bg-transparent text-[var(--kanban-text)]"
      }`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onUrgentChange?.(!urgent);
      }}
    >
      Срочно
    </button>
  );
}

function ListMobileIconButton({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-no-touch-expand
      data-list-row-control
      disabled={disabled}
      title={title}
      aria-label={title}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--kanban-border)] text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-text)] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[0.08]"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

type KanbanListViewProps = {
  appState: KanbanAppState;
  board: KanbanBoard;
  /** Карта «карточка → доска-владелец» при глобальном поиске; иначе не передавать. */
  cardHomeBoardId?: Map<string, string>;
  /** Следующая колонка на доске-владельце (как «вперёд» на доске). */
  onAdvanceCardColumn?: (cardId: string) => void;
  canManageAssignees?: boolean;
  canManageParticipants?: boolean;
  onUpdateCardMembers?: (
    cardId: string,
    homeBoardId: string,
    mode: KanbanMemberPickerMode,
    userIds: string[],
  ) => void;
  canEditDueDate?: boolean;
  onUpdateStageDue?: (cardId: string, homeBoardId: string, ymd: string) => void;
  onToggleUrgent?: (cardId: string, homeBoardId: string, urgent: boolean) => void;
  onCopyCardLink?: (cardId: string) => void;
  canManageKanbanBlock?: boolean;
  /** Раскрыть карточку и открыть попап блокировки (как в модалке). */
  onRequestKanbanBlock?: (cardId: string) => void;
  /** Mobile: полная карточка под строкой списка (без оверлея). */
  renderExpandedCard?: (cardId: string) => ReactNode;
  expandedCardId?: string | null;
  onExpandedCardIdChange?: (cardId: string | null) => void;
  sort?: ListSort;
  onSortChange?: (next: ListSort) => void;
};

export function KanbanListView({
  appState,
  board,
  cardHomeBoardId,
  onAdvanceCardColumn,
  canManageAssignees = true,
  canManageParticipants = true,
  onUpdateCardMembers,
  canEditDueDate = true,
  onUpdateStageDue,
  onToggleUrgent,
  onCopyCardLink,
  canManageKanbanBlock = false,
  onRequestKanbanBlock,
  renderExpandedCard,
  expandedCardId: expandedCardIdProp,
  onExpandedCardIdChange,
  sort: sortProp,
  onSortChange: onSortChangeProp,
}: KanbanListViewProps) {
  const [sortLocal, setSortLocal] = useState<ListSort>(DEFAULT_LIST_SORT);
  const sort = sortProp ?? sortLocal;
  const [expandedCardIdLocal, setExpandedCardIdLocal] = useState<string | null>(
    null,
  );
  const expandedControlled = expandedCardIdProp !== undefined;
  const expandedCardId = expandedControlled
    ? expandedCardIdProp
    : expandedCardIdLocal;
  const toggleExpandedCard = useCallback(
    (cardId: string) => {
      const next = expandedCardId === cardId ? null : cardId;
      if (!expandedControlled) setExpandedCardIdLocal(next);
      onExpandedCardIdChange?.(next);
    },
    [expandedCardId, expandedControlled, onExpandedCardIdChange],
  );
  const [picker, setPicker] = useState<null | {
    cardId: string;
    homeBoardId: string;
    mode: KanbanMemberPickerMode;
    initialUserIds: string[];
  }>(null);
  const [mailOrder, setMailOrder] = useState<null | {
    orderId: string;
    orderNumber: string;
  }>(null);

  const onSortChange = useCallback(
    (next: ListSort) => {
      if (onSortChangeProp) onSortChangeProp(next);
      else setSortLocal(next);
    },
    [onSortChangeProp],
  );

  const { onPreviewMove, onPreviewLeave, previewNode } = useKanbanCardHoverPreview(true);
  useEffect(() => {
    if (expandedCardId) onPreviewLeave();
  }, [expandedCardId, onPreviewLeave]);

  const rows = useMemo(
    () =>
      buildKanbanListViewRows(board, appState, sort, {
        cardHomeBoardId,
        allBoards: appState.boards,
      }),
    [board, appState, sort, cardHomeBoardId],
  );
  const [listRange, setListRange] = useState({ start: 0, end: 40 });
  const [mobileListScroll, setMobileListScroll] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setMobileListScroll(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const onListScroll = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const start = Math.max(
        0,
        Math.floor(el.scrollTop / LIST_ROW_PX) - LIST_OVERSCAN,
      );
      const visible =
        Math.ceil((el.clientHeight || 480) / LIST_ROW_PX) + LIST_OVERSCAN * 2;
      const end = Math.min(rows.length, start + visible);
      setListRange((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      );
    },
    [rows.length],
  );
  const windowing = !expandedCardId && !mobileListScroll;
  const listStart = windowing ? Math.min(listRange.start, rows.length) : 0;
  const listEnd = windowing
    ? Math.min(Math.max(listRange.end, listStart), rows.length)
    : rows.length;
  const listSlice = rows.slice(listStart, listEnd);
  const listPadTop = windowing ? listStart * LIST_ROW_PX : 0;
  const listPadBottom = windowing
    ? Math.max(0, (rows.length - listEnd) * LIST_ROW_PX)
    : 0;

  const pickerBoard = useMemo(() => {
    if (!picker) return board;
    return appState.boards.find((b) => b.id === picker.homeBoardId) ?? board;
  }, [picker, appState.boards, board]);

  const openMemberPicker = useCallback(
    (
      cardId: string,
      homeBoardId: string,
      mode: KanbanMemberPickerMode,
      initialUserIds: string[],
    ) => {
      if (mode === "assign" && !canManageAssignees) return;
      if (mode === "part" && !canManageParticipants) return;
      if (!onUpdateCardMembers) return;
      setPicker({ cardId, homeBoardId, mode, initialUserIds });
    },
    [canManageAssignees, canManageParticipants, onUpdateCardMembers],
  );

  return (
    <div className="relative z-0 flex w-full min-h-0 flex-1 flex-col overflow-hidden py-2 pl-2 pr-1 max-sm:flex-none max-sm:overflow-visible sm:pl-3 sm:pr-2">
      <div className="flex w-full min-h-0 max-w-full flex-1 flex-col max-sm:flex-none">
        <div
          className="min-h-0 flex-1 overflow-y-auto max-sm:overflow-visible max-sm:flex-none"
          ref={mobileListScroll ? undefined : onListScroll}
          onScroll={
            mobileListScroll ? undefined : (e) => onListScroll(e.currentTarget)
          }
        >
        <div className={LIST_TABLE}>
        <div
          className="sticky top-0 z-10 hidden border-b border-[var(--kanban-border)] bg-[var(--kanban-workspace-bg)] pb-1 text-[0.52rem] font-semibold uppercase tracking-wide text-[var(--kanban-text-muted)] sm:col-span-full sm:grid sm:grid-cols-subgrid sm:border-l-[3px] sm:border-l-transparent sm:border-r sm:border-r-transparent"
        >
          <div className="min-w-0 sm:px-2">
            <SortHeaderButton
              label="Название"
              sortKey="title"
              sort={sort}
              onSortChange={onSortChange}
            />
          </div>
          <div className="min-w-0 sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5">
            <SortHeaderButton
              label="Колонка"
              sortKey="column"
              sort={sort}
              onSortChange={onSortChange}
            />
          </div>
          <div className="min-w-0 sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5">
            <SortHeaderButton
              label="Срок"
              sortKey="due"
              sort={sort}
              onSortChange={onSortChange}
            />
          </div>
          <div
            className="min-w-0 sm:border-l sm:border-[var(--kanban-border)] sm:px-1"
            title="Срочно для следующего отдела"
          >
            Срочно
          </div>
          <div className="min-w-0 sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5">
            <SortHeaderButton
              label="Ответственный"
              sortKey="assignee"
              sort={sort}
              onSortChange={onSortChange}
            />
          </div>
          <div className="min-w-0 sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5">
            <SortHeaderButton
              label="Участники"
              sortKey="participants"
              sort={sort}
              onSortChange={onSortChange}
            />
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-[0.875rem] text-[var(--kanban-text-muted)] sm:col-span-full">
            Нет карточек по текущим фильтрам и поиску.
          </p>
        ) : (
          <>
          {listPadTop > 0 ? (
            <div className="sm:col-span-full" style={{ height: listPadTop }} aria-hidden />
          ) : null}
          {listSlice.map(({ card, columnTitle, homeBoardId }) => {
            const rowBoard =
              appState.boards.find((b) => b.id === homeBoardId) ?? board;
            const accent = getCardTypeAccent(rowBoard, card.cardTypeId);
            const ct = (rowBoard.cardTypes || kaitenCardTypes()).find(
              (t) => t.id === card.cardTypeId,
            );
            const blocked = isCardBlocked(card);
            const urgent = !!card.urgent;
            const cl = card.checklist || [];
            const done = cl.filter((i) => i.completed).length;
            const assignees = card.assignees || [];
            const participants = card.participants || [];
            const stageDue = getKanbanStageDue(card);
            const homeColIdx = homeColumnIndexForCard(rowBoard, card.id);
            const canAdvance =
              homeColIdx >= 0 &&
              homeColIdx < rowBoard.columns.length - 1;
            const initials = (ct?.name || "?").trim().slice(0, 1).toUpperCase();

            return (
                <article
                  key={card.id}
                  className="relative w-full min-w-0 cursor-pointer overflow-x-hidden overflow-y-visible rounded-md border-y border-r border-black/[0.1] border-l-[3px] bg-[var(--kanban-card-bg)] shadow-[var(--kanban-shadow)] transition-[box-shadow,border-color] hover:border-y-[color-mix(in_srgb,var(--kanban-accent)_22%,transparent)] hover:border-r-[color-mix(in_srgb,var(--kanban-accent)_22%,transparent)] hover:shadow-[var(--kanban-shadow-elevated)] dark:border-y-white/[0.1] dark:border-r-white/[0.1] sm:col-span-full sm:grid sm:grid-cols-subgrid sm:items-start sm:overflow-x-visible"
                  style={{ borderLeftColor: accent }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedCardId === card.id}
                  onMouseMove={(event) => {
                    if (expandedCardId === card.id) return;
                    onPreviewMove(card, event);
                  }}
                  onMouseLeave={onPreviewLeave}
                  onClick={(e) => {
                    if (eventTargetsListRowControl(e.target)) return;
                    toggleExpandedCard(card.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      if (eventTargetsListRowControl(e.target)) return;
                      e.preventDefault();
                      toggleExpandedCard(card.id);
                    }
                  }}
                >
                  <div className={LIST_ROW_INNER}>
                    {/* Mobile: тип | контент; отв./участн. справа сверху */}
                    <div className="flex min-w-0 sm:contents">
                      <div
                        className="flex w-[1.45rem] shrink-0 flex-col items-center gap-1 border-r border-black/[0.08] bg-black/[0.04] py-1 dark:border-white/[0.08] dark:bg-white/[0.04] sm:hidden"
                        title={ct?.name ?? "Тип"}
                        aria-label={ct?.name ?? "Тип"}
                      >
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.52rem] font-bold text-white"
                          style={{ background: accent }}
                        >
                          {initials}
                        </span>
                        <span
                          className="max-h-[6.5rem] overflow-hidden text-[0.58rem] font-extrabold uppercase leading-none tracking-wide text-[var(--kanban-text)]"
                          style={{
                            writingMode: "vertical-rl",
                            textOrientation: "sideways",
                            WebkitTextOrientation: "sideways",
                            transform: "rotate(180deg)",
                          }}
                        >
                          {(ct?.name ?? "—").toLocaleUpperCase("ru-RU")}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 py-1 pl-1 pr-1.5 sm:contents sm:p-0">
                        <div className="flex min-w-0 items-start gap-1 sm:min-w-0 sm:items-start sm:gap-1.5 sm:px-2 sm:py-1.5">
                          <span
                            className="mt-0.5 hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.58rem] font-bold text-white sm:mt-0.5 sm:flex"
                            style={{ background: accent }}
                            title={ct?.name ?? "Тип"}
                          >
                            {initials}
                          </span>
                          <div className="min-w-0 flex-1 sm:max-w-[60ch] sm:flex-none sm:overflow-hidden">
                            <div className="hidden text-[0.55rem] font-bold uppercase leading-none tracking-wide text-[var(--kanban-text-muted)] sm:block">
                              {ct?.name ?? "—"}
                            </div>
                            <div className="flex min-w-0 max-w-[60ch] items-start gap-1 overflow-hidden text-[0.78rem] font-semibold leading-snug text-[var(--kanban-text)] sm:mt-0.5 sm:gap-1.5 sm:text-[0.8rem]">
                              <span
                                className="min-w-0 max-w-[60ch] whitespace-normal break-words [overflow-wrap:anywhere]"
                                title={card.title}
                              >
                                {card.title}
                              </span>
                              {blocked ? (
                                <span
                                  className="mt-0.5 shrink-0"
                                  aria-label={(card.blockReason || "").trim() || "Остановлена"}
                                >
                                  <IconBrick className="h-5 w-5 text-red-600 dark:text-red-500" />
                                </span>
                              ) : null}
                              <KanbanTimerIcon
                                card={card}
                                className="mt-0.5 shrink-0"
                                sizeClassName="h-3.5 w-3.5 sm:h-4 sm:w-4"
                              />
                            </div>
                            {(appState.search.trim() ||
                              isKanbanAggregateBoardId(appState.activeBoardId)) &&
                            homeBoardId !== appState.activeBoardId ? (
                              <div
                                className="mt-0.5 text-[0.55rem] font-medium leading-tight text-[var(--kanban-text-muted)] sm:text-[0.58rem]"
                                title={`Карточка с доски «${rowBoard.title}»`}
                              >
                                <span className="opacity-80">Доска:</span>{" "}
                                <span className="text-[var(--kanban-text)]">
                                  {rowBoard.title}
                                </span>
                              </div>
                            ) : null}
                            {cl.length > 0 ? (
                              <div className="mt-0.5 hidden items-center gap-1 text-[0.7rem] text-[var(--kanban-text-muted)] sm:flex">
                                <IconListCheck />
                                {done}/{cl.length}
                              </div>
                            ) : null}
                            {/* Mobile: дата + таймер + срочно + полное имя колонки */}
                            <div
                              className="mt-1 flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto pb-0.5 sm:hidden"
                              data-list-row-control
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ListStageDueCell
                                compact
                                hideUrgent
                                stageDue={stageDue}
                                urgent={urgent}
                                canEditDueDate={canEditDueDate}
                                onDueChange={
                                  onUpdateStageDue
                                    ? (ymd) =>
                                        onUpdateStageDue(card.id, homeBoardId, ymd)
                                    : undefined
                                }
                                onUrgentChange={
                                  onToggleUrgent
                                    ? (next) =>
                                        onToggleUrgent(card.id, homeBoardId, next)
                                    : undefined
                                }
                              />
                              <KanbanTimerIcon
                                card={card}
                                className="shrink-0"
                                sizeClassName="h-3.5 w-3.5"
                              />
                              <ListUrgentPillButton
                                urgent={urgent}
                                onUrgentChange={
                                  onToggleUrgent
                                    ? (next) =>
                                        onToggleUrgent(card.id, homeBoardId, next)
                                    : undefined
                                }
                              />
                              {cl.length > 0 ? (
                                <span className="inline-flex shrink-0 items-center gap-0.5 text-[0.55rem] text-[var(--kanban-text-muted)]">
                                  <IconListCheck className="h-3 w-3" />
                                  {done}/{cl.length}
                                </span>
                              ) : null}
                              <span
                                className="mx-0.5 h-3.5 w-px shrink-0 bg-[var(--kanban-border)]"
                                aria-hidden
                              />
                              <span className="inline-flex min-w-0 items-center gap-0.5">
                                <span className="whitespace-normal break-words text-[0.72rem] font-semibold leading-tight text-[var(--kanban-text)]">
                                  {columnTitle}
                                </span>
                                {onAdvanceCardColumn ? (
                                  <button
                                    type="button"
                                    data-list-row-control
                                    className="shrink-0 rounded p-1.5 text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-accent)] dark:hover:bg-white/[0.08] disabled:opacity-30"
                                    title="Следующая колонка"
                                    aria-label="Переместить в следующую колонку"
                                    disabled={!canAdvance}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAdvanceCardColumn(card.id);
                                    }}
                                  >
                                    <IconChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                              </span>
                            </div>
                          </div>
                          <div
                            className="flex shrink-0 flex-col items-end gap-1 self-start sm:hidden"
                            data-list-row-control
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[0.38rem] font-bold uppercase leading-none tracking-wide text-[var(--kanban-text-muted)]">
                                  отв.
                                </span>
                                <ListMembersCell
                                  userIds={assignees}
                                  variant="assignee"
                                  homeBoard={rowBoard}
                                  canManage={Boolean(
                                    onUpdateCardMembers && canManageAssignees,
                                  )}
                                  onAdd={() =>
                                    openMemberPicker(
                                      card.id,
                                      homeBoardId,
                                      "assign",
                                      assignees,
                                    )
                                  }
                                  size="xs"
                                />
                              </div>
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[0.38rem] font-bold uppercase leading-none tracking-wide text-[var(--kanban-text-muted)]">
                                  участн.
                                </span>
                                <ListMembersCell
                                  userIds={participants}
                                  variant="participant"
                                  homeBoard={rowBoard}
                                  canManage={Boolean(
                                    onUpdateCardMembers && canManageParticipants,
                                  )}
                                  onAdd={() =>
                                    openMemberPicker(
                                      card.id,
                                      homeBoardId,
                                      "part",
                                      participants,
                                    )
                                  }
                                  size="xs"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <ListMobileIconButton
                                title="Поделиться — копировать ссылку"
                                disabled={!onCopyCardLink}
                                onClick={() => onCopyCardLink?.(card.id)}
                              >
                                <IconLink className="h-3.5 w-3.5" />
                              </ListMobileIconButton>
                              <ListMobileIconButton
                                title={
                                  card.linkedOrderId
                                    ? (card.sourceEmailCount ?? 0) > 0
                                      ? `Письма наряда (${card.sourceEmailCount})`
                                      : "Письма наряда"
                                    : "Нет связанного наряда"
                                }
                                disabled={!card.linkedOrderId}
                                onClick={() => {
                                  const orderId = card.linkedOrderId?.trim();
                                  if (!orderId) return;
                                  setMailOrder({
                                    orderId,
                                    orderNumber:
                                      extractOrderNumberLabelFromKanbanCardTitle(
                                        card.title,
                                      ),
                                  });
                                }}
                              >
                                <IconMail className="h-3.5 w-3.5" />
                              </ListMobileIconButton>
                              <ListMobileIconButton
                                title={
                                  canManageKanbanBlock
                                    ? blocked
                                      ? "Снять блокировку"
                                      : "Заблокировать карточку"
                                    : "Блокировку могут менять ответственные и участники карточки или администратор"
                                }
                                disabled={!onRequestKanbanBlock}
                                onClick={() => onRequestKanbanBlock?.(card.id)}
                              >
                                {blocked ? (
                                  <IconUnlock className="h-3.5 w-3.5" />
                                ) : (
                                  <IconBrick className="h-3.5 w-3.5" />
                                )}
                              </ListMobileIconButton>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="hidden min-h-[2rem] sm:flex sm:min-w-0 sm:items-start sm:gap-1 sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5 sm:py-1.5">
                      <span className="min-w-0 flex-1 truncate text-[0.75rem] leading-tight text-[var(--kanban-text)]">
                        {columnTitle}
                      </span>
                      {onAdvanceCardColumn ? (
                        <button
                          type="button"
                          data-list-row-control
                          className="shrink-0 rounded p-1.5 text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-accent)] dark:hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
                          title="Следующая колонка"
                          aria-label="Переместить в следующую колонку"
                          disabled={!canAdvance}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAdvanceCardColumn(card.id);
                          }}
                        >
                          <IconChevronRight className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <div
                      className="hidden sm:block sm:border-l sm:border-[var(--kanban-border)] sm:px-1 sm:py-1"
                      data-list-row-control
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ListStageDueCell
                        hideUrgent
                        stageDue={stageDue}
                        urgent={urgent}
                        canEditDueDate={canEditDueDate}
                        onDueChange={
                          onUpdateStageDue
                            ? (ymd) => onUpdateStageDue(card.id, homeBoardId, ymd)
                            : undefined
                        }
                      />
                    </div>
                    <div
                      className="hidden sm:flex sm:items-start sm:justify-start sm:border-l sm:border-[var(--kanban-border)] sm:px-1 sm:py-1"
                      data-list-row-control
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ListUrgentPillButton
                        urgent={urgent}
                        onUrgentChange={
                          onToggleUrgent
                            ? (next) => onToggleUrgent(card.id, homeBoardId, next)
                            : undefined
                        }
                      />
                    </div>
                    <div
                      className="relative hidden sm:flex sm:items-start sm:border-l sm:border-[var(--kanban-border)] sm:px-1 sm:py-1"
                      data-list-row-control
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ListMembersCell
                        userIds={assignees}
                        variant="assignee"
                        homeBoard={rowBoard}
                        canManage={Boolean(onUpdateCardMembers && canManageAssignees)}
                        onAdd={() =>
                          openMemberPicker(card.id, homeBoardId, "assign", assignees)
                        }
                      />
                    </div>
                    <div
                      className="relative hidden sm:flex sm:items-start sm:border-l sm:border-[var(--kanban-border)] sm:px-1 sm:py-1"
                      data-list-row-control
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ListMembersCell
                        userIds={participants}
                        variant="participant"
                        homeBoard={rowBoard}
                        canManage={Boolean(onUpdateCardMembers && canManageParticipants)}
                        onAdd={() =>
                          openMemberPicker(card.id, homeBoardId, "part", participants)
                        }
                      />
                    </div>
                  </div>
                  {expandedCardId === card.id ? (
                    <div
                      className="w-[70%] max-w-[70%] border-t border-[var(--kanban-border)] sm:col-span-full"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderExpandedCard ? (
                        renderExpandedCard(card.id)
                      ) : (
                        <ListInlineExpandedBody card={card} />
                      )}
                    </div>
                  ) : null}
                </article>
            );
          })}
          {listPadBottom > 0 ? (
            <div className="sm:col-span-full" style={{ height: listPadBottom }} aria-hidden />
          ) : null}
          </>
        )}
        </div>
        </div>
      </div>
      {picker && onUpdateCardMembers ? (
        <KanbanMemberPickerDialog
          open
          mode={picker.mode}
          board={pickerBoard}
          initialUserIds={picker.initialUserIds}
          onClose={() => setPicker(null)}
          onSave={(userIds) => {
            onUpdateCardMembers(
              picker.cardId,
              picker.homeBoardId,
              picker.mode,
              userIds,
            );
            setPicker(null);
          }}
        />
      ) : null}
      {previewNode}
      {mailOrder ? (
        <OrderSourceEmailsModal
          orderId={mailOrder.orderId}
          orderNumber={mailOrder.orderNumber}
          hideReplyStatus
          onClose={() => setMailOrder(null)}
        />
      ) : null}
    </div>
  );
}
