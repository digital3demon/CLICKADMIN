"use client";

import type { KanbanAppState, KanbanBoard } from "@/lib/kanban/types";
import {
  formatDate,
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
  loadListSort,
  type ListSort,
  type ListSortKey,
  saveListSort,
} from "@/lib/kanban/list-view-sort";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconBrick, IconListCheck } from "./kanban-icons";
import { KanbanPersonAvatar } from "./KanbanPersonAvatar";

const LIST_GRID =
  "grid grid-cols-1 gap-y-1 gap-x-2 sm:grid-cols-[minmax(0,1.9fr)_minmax(6.5rem,1.05fr)_minmax(5.25rem,0.72fr)_minmax(5.25rem,0.72fr)_minmax(5.25rem,0.72fr)] sm:items-center sm:gap-y-0";

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
          ? "По колонке доски"
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

type KanbanListViewProps = {
  appState: KanbanAppState;
  board: KanbanBoard;
  /** Карта «карточка → доска-владелец» при глобальном поиске; иначе не передавать. */
  cardHomeBoardId?: Map<string, string>;
  onOpenCard: (cardId: string) => void;
  /** Следующая колонка на доске-владельце (как «вперёд» на доске). */
  onAdvanceCardColumn?: (cardId: string) => void;
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
}: KanbanListViewProps) {
  const [sort, setSort] = useState<ListSort>(DEFAULT_LIST_SORT);

  useEffect(() => {
    setSort(loadListSort(board.id));
  }, [board.id]);

  const onSortChange = useCallback(
    (next: ListSort) => {
      setSort(next);
      saveListSort(board.id, next);
    },
    [board.id],
  );

  const rows = useMemo(
    () =>
      buildKanbanListViewRows(board, appState, sort, {
        cardHomeBoardId,
        allBoards: appState.boards,
      }),
    [board, appState, sort, cardHomeBoardId],
  );

  const mobileSelectValue = sortToSelectValue(sort);

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
          <select
            id="kanban-list-sort-mobile"
            className="w-full max-w-full rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-card-bg)] px-2 py-1.5 text-[0.75rem] text-[var(--kanban-text)]"
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
        </div>
        <div
          className={`mb-2 shrink-0 border-b border-[var(--kanban-border)] pb-1.5 ${LIST_GRID} text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--kanban-text-muted)]`}
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
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
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
            const homeColIdx = homeColumnIndexForCard(rowBoard, card.id);
            const canAdvance =
              !blocked &&
              homeColIdx >= 0 &&
              homeColIdx < rowBoard.columns.length - 1;
            const initials = (ct?.name || "?").trim().slice(0, 1).toUpperCase();

            return (
              <div key={card.id} className="relative">
                <article
                  className={`relative overflow-hidden rounded-md border-y border-r border-black/[0.1] border-l-[3px] bg-[var(--kanban-card-bg)] shadow-[var(--kanban-shadow)] transition-[box-shadow,border-color] hover:border-y-[color-mix(in_srgb,var(--kanban-accent)_22%,transparent)] hover:border-r-[color-mix(in_srgb,var(--kanban-accent)_22%,transparent)] hover:shadow-[var(--kanban-shadow-elevated)] dark:border-y-white/[0.1] dark:border-r-white/[0.1] ${
                    blocked ? "opacity-95" : ""
                  }`}
                  style={{ borderLeftColor: accent }}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenCard(card.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenCard(card.id);
                    }
                  }}
                >
                  {blocked && (
                    <div className="flex items-center gap-1.5 border-b border-red-900/40 bg-gradient-to-r from-red-700 to-red-900 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-white">
                      <IconBrick className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {(card.blockReason || "").trim() || "Остановлена"}
                      </span>
                    </div>
                  )}
                  <div className={`${LIST_GRID} cursor-pointer px-2 py-1.5 sm:px-0 sm:py-0`}>
                    <div className="flex min-w-0 items-start gap-1.5 sm:items-center sm:gap-2 sm:px-2 sm:py-1.5">
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white sm:mt-0"
                        style={{ background: accent }}
                        title={ct?.name ?? "Тип"}
                      >
                        {initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[0.6rem] font-bold uppercase leading-none tracking-wide text-[var(--kanban-text-muted)]">
                          {ct?.name ?? "—"}
                        </div>
                        <div className="mt-0.5 text-[0.9rem] font-semibold leading-snug text-[var(--kanban-text)]">
                          {card.title}
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
                          {urgent && (
                            <span className="inline-flex shrink-0 items-center rounded-full border border-orange-400/40 bg-gradient-to-b from-orange-500 to-red-600 px-2 py-0.5 text-[0.6rem] font-bold uppercase leading-none tracking-wide text-white shadow-sm">
                              Срочно
                            </span>
                          )}
                          {cl.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <IconListCheck />
                              {done}/{cl.length}
                            </span>
                          )}
                        </div>
                        <dl className="mt-1.5 space-y-1 text-[0.7rem] text-[var(--kanban-text-muted)] sm:hidden">
                          <div className="flex items-start justify-between gap-2">
                            <dt className="shrink-0 pt-0.5">Колонка</dt>
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
                          <div className="flex justify-between gap-2">
                            <dt>Срок</dt>
                            <dd
                              className={
                                card.dueDate && isDueUrgentRedInList(card.dueDate)
                                  ? "font-semibold text-red-500 dark:text-red-400"
                                  : "text-[var(--kanban-text)]"
                              }
                            >
                              {card.dueDate ? formatDate(card.dueDate) : "—"}
                            </dd>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <dt className="shrink-0 pt-0.5">Ответственный</dt>
                            <dd className="flex min-w-0 flex-1 justify-end">
                              {assignees.length > 0 ? (
                                <div className="flex flex-wrap justify-end gap-0.5">
                                  {assignees.slice(0, 5).map((uid) => (
                                    <span key={uid}>
                                      <KanbanPersonAvatar
                                        userId={uid}
                                        homeBoard={rowBoard}
                                        variant="assignee"
                                        size="xs"
                                        titleSuffix=""
                                      />
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[var(--kanban-text-muted)]">—</span>
                              )}
                            </dd>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <dt className="shrink-0 pt-0.5">Участники</dt>
                            <dd className="flex min-w-0 flex-1 justify-end">
                              {participants.length > 0 ? (
                                <div className="flex flex-wrap justify-end gap-0.5">
                                  {participants.slice(0, 5).map((uid) => (
                                    <span key={uid}>
                                      <KanbanPersonAvatar
                                        userId={uid}
                                        homeBoard={rowBoard}
                                        variant="participant"
                                        size="xs"
                                        titleSuffix=""
                                      />
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[var(--kanban-text-muted)]">—</span>
                              )}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    <div className="hidden min-h-[2.25rem] sm:flex sm:items-center sm:justify-between sm:gap-1 sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5 sm:py-1.5">
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
                    <div
                      className={`hidden text-[0.75rem] leading-tight sm:block sm:border-l sm:border-[var(--kanban-border)] sm:px-2 sm:py-1.5 ${
                        card.dueDate && isDueUrgentRedInList(card.dueDate)
                          ? "font-semibold text-red-500 dark:text-red-400"
                          : "text-[var(--kanban-text-muted)]"
                      }`}
                    >
                      {card.dueDate ? formatDate(card.dueDate) : "—"}
                    </div>
                    <div className="relative hidden min-h-[2.25rem] sm:flex sm:items-center sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5 sm:py-1.5">
                      {assignees.length > 0 ? (
                        <div className="-space-x-1.5 flex pl-0.5">
                          {assignees.slice(0, 5).map((uid) => (
                            <span key={uid} className="first:ml-0">
                              <KanbanPersonAvatar
                                userId={uid}
                                homeBoard={rowBoard}
                                variant="assignee"
                                size="sm"
                                titleSuffix=""
                              />
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[0.75rem] text-[var(--kanban-text-muted)]">—</span>
                      )}
                    </div>
                    <div className="relative hidden min-h-[2.25rem] sm:flex sm:items-center sm:border-l sm:border-[var(--kanban-border)] sm:px-1.5 sm:py-1.5">
                      {participants.length > 0 ? (
                        <div className="-space-x-1.5 flex pl-0.5">
                          {participants.slice(0, 5).map((uid) => (
                            <span key={uid} className="first:ml-0">
                              <KanbanPersonAvatar
                                userId={uid}
                                homeBoard={rowBoard}
                                variant="participant"
                                size="sm"
                                titleSuffix=""
                              />
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[0.75rem] text-[var(--kanban-text-muted)]">—</span>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
}
