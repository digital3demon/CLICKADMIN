"use client";

import type { KanbanAppState, KanbanBoard } from "@/lib/kanban/types";
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
  isDefaultListSort,
  loadListSort,
  type ListSort,
  type ListSortKey,
} from "@/lib/kanban/list-view-sort";
import { getKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import type { KanbanMemberPickerMode } from "@/lib/kanban/kanban-card-members-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconBrick, IconListCheck, IconPlus } from "./kanban-icons";
import { KanbanPersonAvatar } from "./KanbanPersonAvatar";
import { KanbanMemberPickerDialog } from "./KanbanMemberPickerDialog";
import { useKanbanCardHoverPreview } from "./KanbanCardHoverPreview";
import { KanbanTimerIcon } from "./KanbanTimerIcon";
import { readClientState, writeClientState } from "@/lib/client-state-client";

const LIST_GRID =
  "grid w-full grid-cols-1 gap-y-1 gap-x-2 sm:grid-cols-[minmax(0,1fr)_max-content_max-content_max-content_max-content_max-content] sm:items-start sm:justify-items-start sm:gap-x-2 sm:gap-y-0";

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
  size = "sm",
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  size?: "xs" | "sm";
}) {
  const dim = size === "xs" ? "h-5 w-5" : "h-6 w-6";
  const icon = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--kanban-text-muted)] text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-accent)] dark:hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <IconPlus className={icon} />
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
  const avatarSize = isMobileList ? "xs" : "sm";
  const maxVisible = isMobileList ? 2 : 5;
  const visible = userIds.slice(0, maxVisible);
  const overflow = userIds.length - visible.length;
  return (
    <div className="flex min-w-0 flex-nowrap items-center justify-start gap-0.5">
      {visible.length > 0 ? (
        <div className="flex min-w-0 items-center gap-0.5">
          {visible.map((uid) => (
            <span key={uid} className="first:ml-0">
              <KanbanPersonAvatar
                userId={uid}
                homeBoard={homeBoard}
                variant={variant}
                size={avatarSize}
                nameArc={!isMobileList}
                nameCaption={isMobileList}
                titleSuffix=""
              />
            </span>
          ))}
          {overflow > 0 ? (
            <span
              className={`inline-flex shrink-0 items-center justify-center rounded-full bg-black/[0.08] px-1 text-[0.5rem] font-semibold text-[var(--kanban-text-muted)] dark:bg-white/[0.1] ${
                isMobileList ? "h-5 min-w-5" : "h-6 min-w-6"
              }`}
              title={`Ещё ${overflow}`}
            >
              +{overflow}
            </span>
          ) : null}
        </div>
      ) : null}
      {canManage ? (
        <ListMemberAddButton
          title={
            variant === "assignee" ? "Добавить ответственного" : "Добавить участника"
          }
          onClick={onAdd}
          size={size}
        />
      ) : userIds.length === 0 ? (
        <span className="text-[0.75rem] text-[var(--kanban-text-muted)]">—</span>
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
      className={
        compact
          ? "flex shrink-0 flex-row items-center gap-0.5"
          : "flex min-w-0 flex-col gap-1"
      }
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="date"
        disabled={!canEditDueDate || !onDueChange}
        value={stageDue}
        onChange={(e) => onDueChange?.(e.target.value)}
        title={canEditDueDate ? "Срок этапа (канбан)" : "Нет прав менять срок"}
        className={`${
          compact
            ? "h-6 w-[6.5rem] min-w-0 px-1 py-0 text-[0.65rem] font-semibold"
            : "w-[6.85rem] px-1 py-0.5 text-[0.65rem]"
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
              ? "h-6 px-1 py-0 text-[0.5rem] leading-none"
              : "w-fit max-w-full px-1.5 py-0.5 text-[0.58rem]"
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
      disabled={!onUrgentChange}
      title={
        urgent
          ? "Снять метку «Срочно» для следующего отдела (только канбан)"
          : "Срочно для следующего отдела (только канбан, наряд не меняется)"
      }
      className={`shrink-0 rounded-full border px-1.5 py-px text-[0.42rem] font-extrabold uppercase leading-none tracking-wide disabled:cursor-not-allowed disabled:opacity-50 ${
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

type KanbanListViewProps = {
  appState: KanbanAppState;
  board: KanbanBoard;
  /** Карта «карточка → доска-владелец» при глобальном поиске; иначе не передавать. */
  cardHomeBoardId?: Map<string, string>;
  onOpenCard: (cardId: string) => void;
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
};

const MOBILE_SORT_OPTIONS: { value: string; label: string; sort: ListSort }[] = [
  { value: "created-desc", label: "Создана: новые сверху", sort: { key: "created", dir: "desc" } },
  { value: "created-asc", label: "Создана: старые сверху", sort: { key: "created", dir: "asc" } },
  { value: "title-asc", label: "Название: А → Я", sort: { key: "title", dir: "asc" } },
  { value: "title-desc", label: "Название: Я → А", sort: { key: "title", dir: "desc" } },
  { value: "column-asc", label: "Колонка: слева направо", sort: { key: "column", dir: "asc" } },
  { value: "column-desc", label: "Колонка: справа налево", sort: { key: "column", dir: "desc" } },
  { value: "due-asc", label: "Срок: раньше сверху", sort: { key: "due", dir: "asc" } },
  { value: "due-desc", label: "Срок: позже сверху", sort: { key: "due", dir: "desc" } },
  { value: "assignee-desc", label: "Ответственные: больше сверху", sort: { key: "assignee", dir: "desc" } },
  { value: "assignee-asc", label: "Ответственные: меньше сверху", sort: { key: "assignee", dir: "asc" } },
  {
    value: "participants-desc",
    label: "Участники: больше сверху",
    sort: { key: "participants", dir: "desc" },
  },
  {
    value: "participants-asc",
    label: "Участники: меньше сверху",
    sort: { key: "participants", dir: "asc" },
  },
];

function sortToSelectValue(s: ListSort): string {
  return `${s.key}-${s.dir}`;
}

export function KanbanListView({
  appState,
  board,
  cardHomeBoardId,
  onOpenCard,
  onAdvanceCardColumn,
  canManageAssignees = true,
  canManageParticipants = true,
  onUpdateCardMembers,
  canEditDueDate = true,
  onUpdateStageDue,
  onToggleUrgent,
}: KanbanListViewProps) {
  const [sort, setSort] = useState<ListSort>(DEFAULT_LIST_SORT);
  const [picker, setPicker] = useState<null | {
    cardId: string;
    homeBoardId: string;
    mode: KanbanMemberPickerMode;
    initialUserIds: string[];
  }>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const remote = await readClientState<unknown>(
        "user",
        `kanbanListSort:${board.id}`,
      );
      if (cancelled) return;
      if (
        remote &&
        typeof remote === "object" &&
        "key" in remote &&
        "dir" in remote
      ) {
        setSort(remote as ListSort);
        return;
      }
      setSort(loadListSort(board.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [board.id]);

  const onSortChange = useCallback(
    (next: ListSort) => {
      setSort(next);
      void writeClientState("user", `kanbanListSort:${board.id}`, next);
    },
    [board.id],
  );

  const resetSort = useCallback(() => {
    onSortChange(DEFAULT_LIST_SORT);
  }, [onSortChange]);

  const sortIsDefault = isDefaultListSort(sort);

  const { onPreviewMove, onPreviewLeave, previewNode } = useKanbanCardHoverPreview(true);

  const rows = useMemo(
    () =>
      buildKanbanListViewRows(board, appState, sort, {
        cardHomeBoardId,
        allBoards: appState.boards,
      }),
    [board, appState, sort, cardHomeBoardId],
  );

  const mobileSelectValue = sortToSelectValue(sort);

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
    <div className="relative z-0 flex w-full min-h-0 flex-1 flex-col overflow-hidden py-2 pl-2 pr-1 sm:pl-3 sm:pr-2">
      <div className="flex w-full min-h-0 max-w-full flex-1 flex-col">
        <div className="mb-2 shrink-0 sm:hidden">
          <label
            htmlFor="kanban-list-sort-mobile"
            className="mb-1 block text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--kanban-text-muted)]"
          >
            Порядок списка
          </label>
          <div className="flex items-center gap-2">
            <select
              id="kanban-list-sort-mobile"
              className="min-w-0 flex-1 rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-card-bg)] px-2 py-1.5 text-[0.75rem] text-[var(--kanban-text)]"
              value={mobileSelectValue}
              onChange={(e) => {
                const opt = MOBILE_SORT_OPTIONS.find((o) => o.value === e.target.value);
                if (opt) onSortChange(opt.sort);
              }}
            >
              {MOBILE_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={sortIsDefault}
              title="Вернуть сортировку по умолчанию: новые карточки сверху"
              className="shrink-0 rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-card-bg)] px-2 py-1.5 text-[0.68rem] font-medium text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-text)] disabled:cursor-default disabled:opacity-45 dark:hover:bg-white/[0.08]"
              onClick={resetSort}
            >
              Сброс
            </button>
          </div>
        </div>
        <div className="mb-1 flex shrink-0 justify-end">
          <button
            type="button"
            disabled={sortIsDefault}
            title="Вернуть сортировку по умолчанию: новые карточки сверху"
            className="hidden rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-card-bg)] px-2 py-0.5 text-[0.62rem] font-medium text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-text)] disabled:cursor-default disabled:opacity-45 dark:hover:bg-white/[0.08] sm:inline-flex"
            onClick={resetSort}
          >
            Сброс сортировки
          </button>
        </div>
        <div
          className={`mb-1.5 max-sm:hidden shrink-0 border-b border-[var(--kanban-border)] pb-1 ${LIST_GRID} text-[0.52rem] font-semibold uppercase tracking-wide text-[var(--kanban-text-muted)]`}
        >
          <div className="min-w-0">
            <SortHeaderButton
              label="Название"
              sortKey="title"
              sort={sort}
              onSortChange={onSortChange}
            />
          </div>
          <div className="hidden min-w-0 sm:block">
            <SortHeaderButton
              label="Колонка"
              sortKey="column"
              sort={sort}
              onSortChange={onSortChange}
            />
          </div>
          <div className="hidden min-w-0 sm:block">
            <SortHeaderButton
              label="Срок"
              sortKey="due"
              sort={sort}
              onSortChange={onSortChange}
            />
          </div>
          <div className="hidden min-w-0 px-0.5 sm:block" title="Срочно для следующего отдела">
            Срочно
          </div>
          <div className="hidden min-w-0 sm:block">
            <SortHeaderButton
              label="Ответственный"
              sortKey="assignee"
              sort={sort}
              onSortChange={onSortChange}
            />
          </div>
          <div className="hidden min-w-0 sm:block">
            <SortHeaderButton
              label="Участники"
              sortKey="participants"
              sort={sort}
              onSortChange={onSortChange}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto sm:space-y-1.5">
        {rows.length === 0 ? (
          <p className="text-[0.875rem] text-[var(--kanban-text-muted)]">
            Нет карточек по текущим фильтрам и поиску.
          </p>
        ) : (
          rows.map(({ card, columnTitle, homeBoardId }) => {
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
              <div key={card.id} className="relative w-full">
                <article
                  className="relative w-full overflow-hidden rounded-md border-y border-r border-black/[0.1] border-l-[3px] bg-[var(--kanban-card-bg)] shadow-[var(--kanban-shadow)] transition-[box-shadow,border-color] hover:border-y-[color-mix(in_srgb,var(--kanban-accent)_22%,transparent)] hover:border-r-[color-mix(in_srgb,var(--kanban-accent)_22%,transparent)] hover:shadow-[var(--kanban-shadow-elevated)] dark:border-y-white/[0.1] dark:border-r-white/[0.1]"
                  style={{ borderLeftColor: accent }}
                  role="button"
                  tabIndex={0}
                  onMouseMove={(event) => onPreviewMove(card, event)}
                  onMouseLeave={onPreviewLeave}
                  onClick={() => onOpenCard(card.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenCard(card.id);
                    }
                  }}
                >
                  <div className={`${LIST_GRID} cursor-pointer sm:px-0 sm:py-0.5`}>
                    {/* Mobile: тип (слово на боку) | контент; Срочно сверху, + внизу */}
                    <div className="flex min-w-0 sm:contents">
                      <div
                        className="flex w-[1.15rem] shrink-0 flex-col items-center gap-0.5 border-r border-black/[0.08] bg-black/[0.04] py-1 dark:border-white/[0.08] dark:bg-white/[0.04] sm:hidden"
                        title={ct?.name ?? "Тип"}
                        aria-label={ct?.name ?? "Тип"}
                      >
                        <span
                          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[0.45rem] font-bold text-white"
                          style={{ background: accent }}
                        >
                          {initials}
                        </span>
                        <span
                          className="max-h-[5.5rem] overflow-hidden text-[0.42rem] font-bold uppercase leading-none tracking-wide text-[var(--kanban-text-muted)]"
                          style={{
                            writingMode: "vertical-rl",
                            textOrientation: "sideways",
                            // Safari: без префикса буквы остаются «столбиком» прямо
                            WebkitTextOrientation: "sideways",
                            transform: "rotate(180deg)",
                          }}
                        >
                          {(ct?.name ?? "—").toLocaleUpperCase("ru-RU")}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 px-1 py-1 sm:contents">
                        <div className="flex min-w-0 items-stretch gap-1 sm:items-start sm:gap-1.5 sm:px-2 sm:py-1.5">
                          <span
                            className="mt-0.5 hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.58rem] font-bold text-white sm:mt-0.5 sm:flex"
                            style={{ background: accent }}
                            title={ct?.name ?? "Тип"}
                          >
                            {initials}
                          </span>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="hidden text-[0.55rem] font-bold uppercase leading-none tracking-wide text-[var(--kanban-text-muted)] sm:block">
                              {ct?.name ?? "—"}
                            </div>
                            <div className="flex min-w-0 items-start gap-1 text-[0.78rem] font-semibold leading-snug text-[var(--kanban-text)] sm:mt-0.5 sm:gap-1.5 sm:text-[0.8rem]">
                              <span className="min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-2">
                                {card.title}
                              </span>
                              {blocked ? (
                                <span
                                  className="mt-0.5 shrink-0"
                                  aria-label={(card.blockReason || "").trim() || "Остановлена"}
                                >
                                  <IconBrick className="h-3.5 w-3.5 text-red-600 sm:h-4 sm:w-4 dark:text-red-500" />
                                </span>
                              ) : null}
                              <KanbanTimerIcon
                                card={card}
                                className="mt-0.5 hidden shrink-0 sm:inline-flex"
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
                            {/* Mobile: дата (+ таймер) → колонка внизу */}
                            <div className="mt-1 flex min-w-0 flex-col gap-1 overflow-hidden sm:hidden">
                              <div className="flex min-w-0 items-center gap-1">
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
                                {cl.length > 0 ? (
                                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[0.55rem] text-[var(--kanban-text-muted)]">
                                    <IconListCheck className="h-3 w-3" />
                                    {done}/{cl.length}
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex min-w-0 items-center gap-0.5">
                                <span
                                  className="min-w-0 flex-1 truncate text-[0.72rem] font-semibold leading-tight text-[var(--kanban-text)]"
                                  title={columnTitle}
                                >
                                  {columnTitle}
                                </span>
                                {onAdvanceCardColumn ? (
                                  <button
                                    type="button"
                                    className="shrink-0 rounded p-0.5 text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-accent)] dark:hover:bg-white/[0.08] disabled:opacity-30"
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
                              </div>
                            </div>
                          </div>
                          {/* Mobile: Срочно сверху справа; отв./участн. внизу справа */}
                          <div className="flex w-[4.5rem] shrink-0 flex-col items-end justify-between gap-2 self-stretch sm:hidden">
                            <ListUrgentPillButton
                              urgent={urgent}
                              onUrgentChange={
                                onToggleUrgent
                                  ? (next) => onToggleUrgent(card.id, homeBoardId, next)
                                  : undefined
                              }
                            />
                            <div className="flex w-full items-end justify-end gap-2">
                              <div className="flex min-w-0 flex-col items-center gap-0.5">
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
                              <div className="flex min-w-0 flex-col items-center gap-0.5">
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
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="hidden min-h-[2rem] sm:flex sm:max-w-[10rem] sm:items-start sm:gap-1 sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5 sm:py-1.5">
                      <span className="min-w-0 truncate text-[0.75rem] leading-tight text-[var(--kanban-text)]">
                        {columnTitle}
                      </span>
                      {onAdvanceCardColumn ? (
                        <button
                          type="button"
                          className="shrink-0 rounded p-0.5 text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-accent)] dark:hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
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
                    <div className="hidden sm:block sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5 sm:py-1.5">
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
                      className="hidden sm:flex sm:items-start sm:justify-start sm:border-l sm:border-[var(--kanban-border)] sm:px-1 sm:py-1.5"
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
                    <div className="relative hidden sm:flex sm:items-start sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5 sm:py-1.5">
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
                    <div className="relative hidden sm:flex sm:items-start sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5 sm:py-1.5">
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
                </article>
              </div>
            );
          })
        )}
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
    </div>
  );
}
