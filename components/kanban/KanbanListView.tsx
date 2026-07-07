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
  "grid grid-cols-1 gap-y-1 gap-x-2 sm:grid-cols-[minmax(0,1.9fr)_minmax(6.5rem,1.05fr)_minmax(6.75rem,7.25rem)_minmax(5.25rem,0.72fr)_minmax(5.25rem,0.72fr)] sm:items-center sm:gap-y-0";

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
  const dim = size === "xs" ? "h-[18px] w-[18px]" : "h-6 w-6";
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
  const avatarSize = size === "xs" ? "xs" : "sm";
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-0.5 sm:justify-start">
      {userIds.length > 0 ? (
        <div className={`-space-x-1.5 flex pl-0.5 ${size === "xs" ? "justify-end" : ""}`}>
          {userIds.slice(0, 5).map((uid) => (
            <span key={uid} className="first:ml-0">
              <KanbanPersonAvatar
                userId={uid}
                homeBoard={homeBoard}
                variant={variant}
                size={avatarSize}
                titleSuffix=""
              />
            </span>
          ))}
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
}: {
  stageDue: string;
  urgent: boolean;
  canEditDueDate: boolean;
  onDueChange?: (ymd: string) => void;
  onUrgentChange?: (next: boolean) => void;
}) {
  const dueUrgentRed = stageDue ? isDueUrgentRedInList(stageDue) : false;
  return (
    <div
      className="flex min-w-0 flex-col gap-1"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="date"
        disabled={!canEditDueDate || !onDueChange}
        value={stageDue}
        onChange={(e) => onDueChange?.(e.target.value)}
        title={canEditDueDate ? "Срок этапа (канбан)" : "Нет прав менять срок"}
        className={`w-[6.85rem] max-w-full shrink-0 rounded border border-[var(--kanban-border)] bg-[var(--kanban-card-bg)] px-1 py-0.5 text-[0.65rem] leading-tight text-[var(--kanban-text)] disabled:cursor-not-allowed disabled:opacity-50 ${
          dueUrgentRed ? "font-semibold text-red-500 dark:text-red-400" : ""
        } [color-scheme:light] dark:[color-scheme:dark]`}
      />
      <button
        type="button"
        disabled={!onUrgentChange}
        title={
          urgent
            ? "Снять метку «Срочно» для следующего отдела (только канбан)"
            : "Срочно для следующего отдела (только канбан, наряд не меняется)"
        }
        className={`w-fit max-w-full shrink-0 rounded border px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          urgent
            ? "border-orange-600/80 bg-gradient-to-b from-orange-500 to-red-600 text-white shadow-sm"
            : "border-[var(--kanban-border)] bg-[var(--kanban-card-bg)] text-[var(--kanban-text-muted)] hover:border-orange-400/50 hover:text-orange-700 dark:hover:text-orange-300"
        }`}
        onClick={() => onUrgentChange?.(!urgent)}
      >
        Срочно
      </button>
    </div>
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
    <div className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden self-start py-2 pl-2 pr-1 sm:pl-3 sm:pr-2">
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
          className={`mb-1.5 shrink-0 border-b border-[var(--kanban-border)] pb-1 ${LIST_GRID} text-[0.52rem] font-semibold uppercase tracking-wide text-[var(--kanban-text-muted)]`}
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
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
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
              <div key={card.id} className="relative">
                <article
                  className="relative overflow-hidden rounded-md border-y border-r border-black/[0.1] border-l-[3px] bg-[var(--kanban-card-bg)] shadow-[var(--kanban-shadow)] transition-[box-shadow,border-color] hover:border-y-[color-mix(in_srgb,var(--kanban-accent)_22%,transparent)] hover:border-r-[color-mix(in_srgb,var(--kanban-accent)_22%,transparent)] hover:shadow-[var(--kanban-shadow-elevated)] dark:border-y-white/[0.1] dark:border-r-white/[0.1]"
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
                  <div className={`${LIST_GRID} cursor-pointer px-2 py-1 sm:px-0 sm:py-0`}>
                    <div className="flex min-w-0 items-start gap-1.5 sm:items-center sm:gap-1.5 sm:px-2 sm:py-1">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.58rem] font-bold text-white sm:mt-0"
                        style={{ background: accent }}
                        title={ct?.name ?? "Тип"}
                      >
                        {initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[0.55rem] font-bold uppercase leading-none tracking-wide text-[var(--kanban-text-muted)]">
                          {ct?.name ?? "—"}
                        </div>
                        <div className="mt-0.5 flex min-w-0 items-start gap-1.5 text-[0.8rem] font-semibold leading-snug text-[var(--kanban-text)]">
                          <span className="min-w-0 flex-1">{card.title}</span>
                          {blocked ? (
                            <span
                              className="mt-0.5 shrink-0"
                              aria-label={(card.blockReason || "").trim() || "Остановлена"}
                            >
                              <IconBrick className="h-4 w-4 text-red-600 dark:text-red-500" />
                            </span>
                          ) : null}
                          <KanbanTimerIcon
                            card={card}
                            className="mt-0.5"
                            sizeClassName="h-4 w-4"
                          />
                        </div>
                        {(appState.search.trim() || isKanbanAggregateBoardId(appState.activeBoardId)) &&
                        homeBoardId !== appState.activeBoardId ? (
                          <div
                            className="mt-0.5 text-[0.58rem] font-medium leading-tight text-[var(--kanban-text-muted)]"
                            title={`Карточка с доски «${rowBoard.title}»`}
                          >
                            <span className="opacity-80">Доска:</span>{" "}
                            <span className="text-[var(--kanban-text)]">
                              {rowBoard.title}
                            </span>
                          </div>
                        ) : null}
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-[0.7rem] text-[var(--kanban-text-muted)]">
                          {cl.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <IconListCheck />
                              {done}/{cl.length}
                            </span>
                          )}
                        </div>
                        <dl className="mt-1.5 space-y-1 text-[0.7rem] text-[var(--kanban-text-muted)] sm:hidden">
                          <div className="flex justify-between gap-2">
                            <dt>Колонка</dt>
                            <dd className="flex min-w-0 flex-1 items-center justify-end gap-1 text-[var(--kanban-text)]">
                              <span className="min-w-0 truncate text-right">{columnTitle}</span>
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
                                  <IconChevronRight className="h-4 w-4" />
                                </button>
                              ) : null}
                            </dd>
                          </div>
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <dt className="shrink-0">Срок</dt>
                            <dd className="min-w-0 flex-1 sm:max-w-none">
                              <ListStageDueCell
                                stageDue={stageDue}
                                urgent={urgent}
                                canEditDueDate={canEditDueDate}
                                onDueChange={
                                  onUpdateStageDue
                                    ? (ymd) => onUpdateStageDue(card.id, homeBoardId, ymd)
                                    : undefined
                                }
                                onUrgentChange={
                                  onToggleUrgent
                                    ? (next) => onToggleUrgent(card.id, homeBoardId, next)
                                    : undefined
                                }
                              />
                            </dd>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <dt className="shrink-0 pt-0.5">Ответственный</dt>
                            <dd className="flex min-w-0 flex-1 justify-end">
                              <ListMembersCell
                                userIds={assignees}
                                variant="assignee"
                                homeBoard={rowBoard}
                                canManage={Boolean(onUpdateCardMembers && canManageAssignees)}
                                onAdd={() =>
                                  openMemberPicker(card.id, homeBoardId, "assign", assignees)
                                }
                                size="xs"
                              />
                            </dd>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <dt className="shrink-0 pt-0.5">Участники</dt>
                            <dd className="flex min-w-0 flex-1 justify-end">
                              <ListMembersCell
                                userIds={participants}
                                variant="participant"
                                homeBoard={rowBoard}
                                canManage={Boolean(onUpdateCardMembers && canManageParticipants)}
                                onAdd={() =>
                                  openMemberPicker(card.id, homeBoardId, "part", participants)
                                }
                                size="xs"
                              />
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    <div className="hidden min-h-[1.75rem] sm:flex sm:items-center sm:justify-between sm:gap-1 sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5 sm:py-1">
                      <span className="min-w-0 flex-1 truncate text-[0.75rem] leading-tight text-[var(--kanban-text)]">
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
                    <div className="hidden sm:block sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5 sm:py-1">
                      <ListStageDueCell
                        stageDue={stageDue}
                        urgent={urgent}
                        canEditDueDate={canEditDueDate}
                        onDueChange={
                          onUpdateStageDue
                            ? (ymd) => onUpdateStageDue(card.id, homeBoardId, ymd)
                            : undefined
                        }
                        onUrgentChange={
                          onToggleUrgent
                            ? (next) => onToggleUrgent(card.id, homeBoardId, next)
                            : undefined
                        }
                      />
                    </div>
                    <div className="relative hidden min-h-[1.75rem] sm:flex sm:items-center sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5 sm:py-1">
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
                    <div className="relative hidden min-h-[1.75rem] sm:flex sm:items-center sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5 sm:py-1">
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
