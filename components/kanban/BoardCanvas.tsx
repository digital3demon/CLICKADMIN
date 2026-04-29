"use client";

import type { KanbanAppState, KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import { runKanbanAutomations } from "@/lib/kanban/automations";
import {
  visibleCardsInColumn,
  visibleIndexToFullInsertIndex,
} from "@/lib/kanban/board-visible-cards";
import { previewLinkedCardKaitenSortOrderAfterDrag } from "@/lib/kanban/kanban-card-move-preview";
import {
  cardMatchesFilters,
  dueCategory,
  formatDate,
  getCardTypeAccent,
  isCardBlocked,
  kanbanTypeRingStyle,
  pushActivity,
} from "@/lib/kanban/model";
import {
  DndContext,
  type DragEndEvent,
  type DraggableSyntheticListeners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  IconBrick,
  IconClock,
  IconDots,
  IconListCheck,
  IconPen,
  IconPlus,
  IconTrash,
} from "./kanban-icons";
import { KanbanPersonAvatar } from "./KanbanPersonAvatar";
import type { AggregateCardDragArgs } from "@/lib/kanban/aggregate-card-drag";

type BoardCanvasProps = {
  appState: KanbanAppState;
  board: KanbanBoard;
  /** Доска-владелец карточки (тип, цвет, пользователи) при поиске по всем доскам. */
  resolveCardHomeBoard: (card: KanbanCard) => KanbanBoard;
  /** Подпись текущего пользователя для журнала активности карточки. */
  activityActorLabel?: string;
  dndLocked: boolean;
  /** Виртуальные «Мои» / «Распределить»: без перестановки колонок, без добавления колонок/карточек. */
  aggregateLayoutLocked?: boolean;
  /** Перенос карточки по виртуальной доске — правит реальные колонки на дорожках. */
  onAggregateCardDrag?: (drag: AggregateCardDragArgs) => void;
  onPatchBoard: (fn: (b: KanbanBoard) => void) => void;
  onOpenCard: (cardId: string) => void;
  onAddColumn: () => void;
  onRenameColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddCard: (columnId: string) => void;
  onCopyCardLink: (cardId: string) => void;
  onRequestMoveCard: (cardId: string) => void;
  onRequestDeleteCard: (cardId: string) => void;
  /** false — одна доска, пункт «на другую доску» скрыт */
  allowMoveToOtherBoard?: boolean;
  /**
   * Боевой режим: после переноса карточки наряда в другую колонку — синхронизация колонки в Kaiten
   * (по названию колонки зеркала в CRM).
   */
  onLinkedOrderMovedToKaitenMirror?: (args: {
    orderId: string;
    kaitenCardId: number;
    /** Если колонка на доске сменилась — название колонки зеркала в CRM. */
    columnTitle?: string;
    sortOrder: number;
  }) => void;
};

const CARD_MENU_WIDTH = 220;
const CARD_MENU_GAP = 4;
const CARD_MENU_EST_HEIGHT = 150;

/** Элементы со скроллом выше по дереву — absolute-меню внутри колонки обрезается без портала. */
function scrollContainerAncestors(start: HTMLElement | null): HTMLElement[] {
  const acc: HTMLElement[] = [];
  for (let el = start?.parentElement ?? null; el; el = el.parentElement) {
    const { overflow, overflowY, overflowX } = getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(`${overflow} ${overflowY} ${overflowX}`)) {
      acc.push(el);
    }
  }
  if (!acc.includes(document.documentElement)) acc.push(document.documentElement);
  return acc;
}

function KanbanCardView({
  card,
  homeBoard,
  foreignBoardLabel,
  onOpen,
  onCopyLink,
  onMoveCard,
  onDeleteCard,
  dragListeners,
  allowMoveToOtherBoard = true,
}: {
  card: KanbanCard;
  homeBoard: KanbanBoard;
  /** При поиске по всем доскам — название доски-владельца, если это не активная доска. */
  foreignBoardLabel?: string;
  onOpen: () => void;
  onCopyLink: () => void;
  onMoveCard: () => void;
  onDeleteCard: () => void;
  /** Слушатели @dnd-kit (только для незаблокированной карточки). */
  dragListeners?: DraggableSyntheticListeners;
  allowMoveToOtherBoard?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFixed, setMenuFixed] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLUListElement>(null);

  const updateMenuPosition = useCallback(() => {
    const wrap = menuRef.current;
    if (!wrap) return;
    const btn = wrap.querySelector("button");
    if (!btn) return;
    const br = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = br.bottom + CARD_MENU_GAP;
    let left = br.right - CARD_MENU_WIDTH;
    left = Math.max(8, Math.min(left, vw - CARD_MENU_WIDTH - 8));
    if (top + CARD_MENU_EST_HEIGHT > vh - 8) {
      top = br.top - CARD_MENU_EST_HEIGHT - CARD_MENU_GAP;
    }
    top = Math.max(8, top);
    setMenuFixed({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuFixed(null);
      return;
    }
    updateMenuPosition();
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("resize", onScrollOrResize);
    const roots = scrollContainerAncestors(menuRef.current);
    roots.forEach((el) => el.addEventListener("scroll", onScrollOrResize, { passive: true }));
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      roots.forEach((el) => el.removeEventListener("scroll", onScrollOrResize));
    };
  }, [menuOpen, updateMenuPosition]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        menuRef.current?.contains(t) ||
        menuPanelRef.current?.contains(t)
      ) {
        return;
      }
      setMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);
  const blocked = isCardBlocked(card);
  const accent = getCardTypeAccent(homeBoard, card.cardTypeId);
  const ct = (homeBoard.cardTypes || []).find((t) => t.id === card.cardTypeId);
  const cl = card.checklist || [];
  const done = cl.filter((i) => i.completed).length;
  const pct = cl.length ? Math.round((done / cl.length) * 100) : 0;
  const assignees = card.assignees || [];
  /** Участники — отдельная роль от ответственных; один пользователь может быть в обоих списках. */
  const participants = card.participants || [];

  let dueClass =
    "rounded border px-1.5 py-0.5 text-[0.7rem] font-semibold leading-none max-md:px-1 max-md:py-[1px] max-md:text-[0.55rem]";
  if (card.dueDate) {
    const cat = dueCategory(card.dueDate);
    if (cat === "overdue")
      dueClass +=
        " border-[color-mix(in_srgb,var(--kanban-overdue)_25%,transparent)] bg-[color-mix(in_srgb,var(--kanban-overdue)_8%,transparent)] text-[var(--kanban-overdue)]";
    else if (cat === "today")
      dueClass +=
        " border-[color-mix(in_srgb,var(--kanban-today)_25%,transparent)] bg-[color-mix(in_srgb,var(--kanban-today)_10%,transparent)] text-[var(--kanban-today)]";
    else
      dueClass +=
        " border-[color-mix(in_srgb,var(--kanban-future)_20%,transparent)] bg-[color-mix(in_srgb,var(--kanban-future)_8%,transparent)] text-[var(--kanban-future)]";
  }

  const urgent = !!card.urgent;
  const typeRing = kanbanTypeRingStyle(accent);

  return (
    <div data-card-id={card.id} className="block w-full min-w-0 shrink-0 touch-pan-y">
      <div
        className="relative rounded-[11px] p-[3px] max-md:rounded-[7px] max-md:p-[1.5px]"
        style={typeRing}
      >
        <article
          className={`relative overflow-visible border border-black/[0.1] bg-[var(--kanban-card-bg)] shadow-[var(--kanban-shadow)] transition-[box-shadow,transform,border-color] dark:border-white/[0.1] rounded-[8px] max-md:rounded-[6px] ${
            blocked
              ? "cursor-default dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
              : "cursor-grab active:cursor-grabbing hover:border-[color-mix(in_srgb,var(--kanban-accent)_35%,transparent)] hover:shadow-[var(--kanban-shadow-elevated)] dark:hover:border-white/[0.12] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.5)]"
          } ${blocked ? "" : "hover:shadow-[var(--kanban-shadow-elevated)]"}`}
          {...(dragListeners ?? {})}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest(".card-more-menu")) return;
            onOpen();
          }}
        >
          <div className="overflow-hidden rounded-[8px] max-md:rounded-[6px]">
            {blocked && (
              <div
                className="flex items-start gap-1.5 border-b-2 border-[#7f1d1d] bg-gradient-to-b from-[#dc2626] to-[#b91c1c] py-2 pl-2.5 pr-8 text-[0.7rem] font-bold uppercase leading-snug tracking-wide text-white max-md:gap-1 max-md:py-1 max-md:pl-1.5 max-md:pr-6 max-md:text-[0.58rem] dark:from-[#c02626] dark:to-[#991b1b]"
                title={(card.blockReason || "").trim() || "Карточка остановлена"}
              >
                <IconBrick className="h-4 w-4 shrink-0 text-white max-md:h-3 max-md:w-3" />
                <span className="line-clamp-4 min-w-0 break-words">
                  {(card.blockReason || "").trim() || "Карточка остановлена"}
                </span>
              </div>
            )}
            {ct && (
              <div
                className="border-b border-black/[0.08] pb-1 pl-2.5 pr-10 pt-1 text-[0.68rem] font-bold uppercase tracking-wide dark:border-white/[0.1] max-md:px-1.5 max-md:pb-0.5 max-md:pr-7 max-md:pt-0.5 max-md:text-[0.58rem]"
                style={{
                  color: `color-mix(in srgb, ${accent} 72%, var(--kanban-text))`,
                  background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 14%, var(--kanban-card-bg)) 0%, color-mix(in srgb, ${accent} 6%, var(--kanban-card-bg)) 100%)`,
                }}
              >
                {ct.name}
              </div>
            )}
            {foreignBoardLabel ? (
              <div
                className="border-b border-black/[0.08] px-2.5 py-0.5 text-[0.55rem] font-medium leading-tight text-[var(--kanban-text-muted)] dark:border-white/[0.08] max-md:px-1.5 max-md:py-0.5 max-md:text-[0.5rem]"
                title={`Карточка с доски «${foreignBoardLabel}»`}
              >
                <span className="opacity-80">Доска:</span>{" "}
                <span className="text-[var(--kanban-text)]">{foreignBoardLabel}</span>
              </div>
            ) : null}
            <div className="pl-2.5 pr-10 pb-2.5 pt-0.5 max-md:pl-1.5 max-md:pr-6 max-md:pb-1.5 max-md:pt-0">
              <div className="text-[0.9375rem] font-semibold leading-snug text-[var(--kanban-text)] max-md:text-[11px] max-md:leading-tight">
                {card.title}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 max-md:mt-1 max-md:gap-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-[var(--kanban-text-muted)] max-md:gap-1 max-md:text-[0.62rem]">
                  {card.dueDate && (
                    <span className={dueClass}>
                      <span className="inline-flex items-center gap-1 max-md:gap-0.5">
                        <IconClock className="max-md:h-3 max-md:w-3" />
                        {formatDate(card.dueDate)}
                      </span>
                    </span>
                  )}
                  {urgent && (
                    <span
                      className="inline-flex shrink-0 items-center rounded-full border border-orange-400/40 bg-gradient-to-b from-orange-500 to-red-600 px-2 py-0.5 text-[0.6rem] font-bold uppercase leading-none tracking-wide text-white shadow-sm max-md:px-1 max-md:py-[1px] max-md:text-[0.5rem]"
                      title="Срочно"
                    >
                      Срочно
                    </span>
                  )}
                  {cl.length > 0 && (
                    <div className="flex items-center gap-1 max-md:gap-0.5">
                      <IconListCheck className="max-md:h-3 max-md:w-3" />
                      <span>
                        {done}/{cl.length}
                      </span>
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--kanban-border)] max-md:h-1 max-md:w-9">
                        <div
                          className="h-full rounded-full bg-[var(--kanban-accent)] opacity-85"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {(assignees.length > 0 || participants.length > 0) && (
                <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1 max-md:mt-1">
                  {assignees.length > 0 && (
                    <div className="-space-x-1.5 flex" title="Ответственные">
                      {assignees.slice(0, 5).map((uid) => (
                        <span key={uid} className="first:ml-0">
                          <KanbanPersonAvatar
                            userId={uid}
                            homeBoard={homeBoard}
                            variant="assignee"
                            size="card"
                            titleSuffix=""
                          />
                        </span>
                      ))}
                      {assignees.length > 5 && (
                        <span className="ml-1 text-[0.65rem] text-[var(--kanban-text-muted)]">
                          +{assignees.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                  {participants.length > 0 && (
                    <div className="flex border-l border-[var(--kanban-border)] pl-1.5" title="Участники">
                      <div className="-space-x-1.5 flex">
                        {participants.slice(0, 4).map((uid) => (
                          <span key={uid} className="first:ml-0 opacity-90">
                            <KanbanPersonAvatar
                              userId={uid}
                              homeBoard={homeBoard}
                              variant="participant"
                              size="card"
                              titleSuffix=""
                            />
                          </span>
                        ))}
                        {participants.length > 4 && (
                          <span className="ml-1 text-[0.65rem] text-[var(--kanban-text-muted)]">
                            +{participants.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div
            className="card-more-menu absolute right-0.5 top-0.5 z-10 max-md:right-0 max-md:top-0"
            ref={menuRef}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="rounded-md p-1 text-[var(--kanban-text-muted)] hover:bg-black/10 dark:hover:bg-white/10 max-md:p-0.5"
              title="Действия"
              aria-label="Меню карточки"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
            >
              <IconDots />
            </button>
            {menuOpen && menuFixed && typeof document !== "undefined"
              ? createPortal(
                  <ul
                    ref={menuPanelRef}
                    className="fixed z-[20000] min-w-[220px] rounded-lg border border-[var(--kanban-border,var(--card-border))] bg-[var(--kanban-card-bg,var(--card-bg))] py-1 text-[0.8125rem] text-[var(--kanban-text,var(--app-text))] shadow-lg dark:border-white/10"
                    style={{ top: menuFixed.top, left: menuFixed.left, width: CARD_MENU_WIDTH }}
                    role="menu"
                  >
                    <li>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyLink();
                          setMenuOpen(false);
                        }}
                      >
                        Копировать ссылку
                      </button>
                    </li>
                    {allowMoveToOtherBoard ? (
                      <li>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveCard();
                            setMenuOpen(false);
                          }}
                        >
                          Перенести на другую доску…
                        </button>
                      </li>
                    ) : null}
                    <li className="border-t border-[var(--kanban-border,var(--card-border))] dark:border-white/10">
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCard();
                          setMenuOpen(false);
                        }}
                      >
                        Удалить карточку…
                      </button>
                    </li>
                  </ul>,
                  document.body,
                )
              : null}
          </div>
        </article>
      </div>
    </div>
  );
}

function SortableKanbanCard({
  card,
  homeBoard,
  foreignBoardLabel,
  dndLocked,
  onOpenCard,
  onCopyCardLink,
  onRequestMoveCard,
  onRequestDeleteCard,
  allowMoveToOtherBoard,
}: {
  card: KanbanCard;
  homeBoard: KanbanBoard;
  foreignBoardLabel?: string;
  dndLocked: boolean;
  onOpenCard: (id: string) => void;
  onCopyCardLink: (id: string) => void;
  onRequestMoveCard: (id: string) => void;
  onRequestDeleteCard: (id: string) => void;
  allowMoveToOtherBoard: boolean;
}) {
  const blocked = isCardBlocked(card);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      disabled: dndLocked || blocked,
    });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : undefined,
    ...(dndLocked || blocked ? {} : { touchAction: "none" as const }),
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="w-full min-w-0">
      <KanbanCardView
        card={card}
        homeBoard={homeBoard}
        foreignBoardLabel={foreignBoardLabel}
        onOpen={() => onOpenCard(card.id)}
        onCopyLink={() => onCopyCardLink(card.id)}
        onMoveCard={() => onRequestMoveCard(card.id)}
        onDeleteCard={() => onRequestDeleteCard(card.id)}
        dragListeners={blocked || dndLocked ? undefined : listeners}
        allowMoveToOtherBoard={allowMoveToOtherBoard}
      />
    </div>
  );
}

function SortableColumnSection({
  col,
  children,
  onRenameColumn,
  onDeleteColumn,
  visCount,
  totalCount,
  layoutLocked,
}: {
  col: KanbanBoard["columns"][0];
  children: ReactNode;
  onRenameColumn: (id: string) => void;
  onDeleteColumn: (id: string) => void;
  visCount: number;
  totalCount: number;
  layoutLocked?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: col.id, disabled: Boolean(layoutLocked) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    ...(!layoutLocked ? { touchAction: "none" as const } : {}),
  };

  const dragProps = layoutLocked ? {} : { ...listeners, ...attributes };

  return (
    <section
      ref={setNodeRef}
      style={style}
      data-column-id={col.id}
      className="kanban-column flex max-h-[calc(100dvh-200px)] w-[148px] shrink-0 flex-col rounded-[10px] border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] shadow-[var(--kanban-shadow)] dark:border-white/[0.06] dark:bg-gradient-to-b dark:from-[#2d2d32] dark:to-[#27272a] max-md:max-h-[calc(100dvh-132px)] min-[420px]:w-[168px] sm:w-[200px] lg:w-[252px] xl:w-[280px]"
    >
      <header
        className={`column-header-handle flex flex-col gap-1 border-b border-[var(--kanban-border)] px-2 pb-1.5 pt-2 max-md:gap-0.5 max-md:px-1.5 max-md:pb-1 max-md:pt-1.5 sm:gap-1.5 sm:px-3 sm:pb-2 sm:pt-3 ${
          layoutLocked ? "" : "cursor-grab active:cursor-grabbing"
        }`}
        {...dragProps}
      >
        <div className="flex items-center justify-between gap-1 sm:gap-1.5">
          <div
            className="min-w-0 flex-1 cursor-default break-words text-[11px] font-semibold leading-tight text-[var(--kanban-text)] sm:text-[0.8125rem] sm:leading-snug"
            onDoubleClick={() => {
              if (!layoutLocked) onRenameColumn(col.id);
            }}
          >
            {col.title}
          </div>
          {!layoutLocked ? (
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded p-0.5 text-[var(--kanban-text-muted)] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] sm:p-1"
                title="Переименовать"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onRenameColumn(col.id)}
              >
                <IconPen className="max-md:scale-90" />
              </button>
              <button
                type="button"
                className="rounded p-0.5 text-[var(--kanban-text-muted)] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] sm:p-1"
                title="Удалить колонку"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onDeleteColumn(col.id)}
              >
                <IconTrash className="max-md:scale-90" />
              </button>
            </div>
          ) : null}
        </div>
        <div className="text-[0.62rem] text-[var(--kanban-text-muted)] max-md:leading-tight sm:text-[0.75rem]">
          {visCount}
          {visCount !== totalCount ? ` из ${totalCount}` : ""} карточек
        </div>
      </header>
      {children}
    </section>
  );
}

export function BoardCanvas({
  appState,
  board,
  resolveCardHomeBoard,
  activityActorLabel,
  dndLocked,
  aggregateLayoutLocked = false,
  onAggregateCardDrag,
  onPatchBoard,
  onOpenCard,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onAddCard,
  onCopyCardLink,
  onRequestMoveCard,
  onRequestDeleteCard,
  allowMoveToOtherBoard = true,
  onLinkedOrderMovedToKaitenMirror,
}: BoardCanvasProps) {
  const columnIds = board.columns.map((c) => c.id);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const aid = String(active.id);
      const oid = String(over.id);

      const activeIsColumn = columnIds.includes(aid);
      const overIsColumn = columnIds.includes(oid);

      if (activeIsColumn && overIsColumn) {
        if (aggregateLayoutLocked) return;
        const oldIndex = board.columns.findIndex((c) => c.id === aid);
        const newIndex = board.columns.findIndex((c) => c.id === oid);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
        onPatchBoard((b) => {
          b.columns = arrayMove(b.columns, oldIndex, newIndex);
        });
        return;
      }

      if (activeIsColumn || dndLocked) return;

      const cardId = aid;
      const fromContainer = active.data.current?.sortable?.containerId as
        | string
        | undefined;
      if (!fromContainer) return;

      const fromCol = board.columns.find((c) => c.id === fromContainer);
      if (!fromCol) return;

      const cardSnapshot = fromCol.cards.find((c) => c.id === cardId);
      if (!cardSnapshot) return;

      let toColId = fromContainer;
      let newIndex = 0;

      if (overIsColumn) {
        toColId = oid;
        const toCol = board.columns.find((c) => c.id === toColId);
        if (!toCol) return;
        newIndex = visibleCardsInColumn(toCol, appState, resolveCardHomeBoard).length;
      } else {
        const overSortable = over.data.current?.sortable;
        const oc = overSortable?.containerId as string | undefined;
        if (oc) toColId = oc;
        if (typeof overSortable?.index === "number") {
          newIndex = overSortable.index;
        }
      }

      const sortOrderPreview =
        !dndLocked &&
        !aggregateLayoutLocked &&
        cardSnapshot.linkedOrderId &&
        typeof cardSnapshot.kaitenCardId === "number" &&
        Number.isFinite(cardSnapshot.kaitenCardId)
          ? previewLinkedCardKaitenSortOrderAfterDrag(
              board,
              appState,
              resolveCardHomeBoard,
              fromContainer,
              toColId,
              cardId,
              newIndex,
              overIsColumn,
            )
          : null;

      if (aggregateLayoutLocked && onAggregateCardDrag) {
        onAggregateCardDrag({
          cardId,
          fromDisplayColId: fromContainer,
          toDisplayColId: toColId,
          newIndex,
          overIsColumn,
          overCardId: overIsColumn ? null : oid,
        });
        return;
      }

      onPatchBoard((b) => {
        const fromColB = b.columns.find((c) => c.id === fromContainer);
        if (!fromColB) return;
        const idx = fromColB.cards.findIndex((c) => c.id === cardId);
        if (idx < 0) return;
        const [card] = fromColB.cards.splice(idx, 1);
        if (!card) return;
        const toColB = b.columns.find((c) => c.id === toColId);
        if (!toColB) {
          fromColB.cards.splice(idx, 0, card);
          return;
        }

        let fullInsert = visibleIndexToFullInsertIndex(
          toColB,
          newIndex,
          appState,
          resolveCardHomeBoard,
        );
        if (fromContainer === toColId && idx < fullInsert) {
          fullInsert -= 1;
        }
        fullInsert = Math.max(0, Math.min(fullInsert, toColB.cards.length));
        toColB.cards.splice(fullInsert, 0, card);

        if (fromContainer !== toColId) {
          card.lastMovedAt = new Date().toISOString();
        }
        pushActivity(
          card,
          fromContainer === toColId
            ? "Изменён порядок"
            : `Перемещена в «${toColB.title}»`,
          b.users[0]?.id,
          b,
          activityActorLabel,
        );
        if (fromContainer !== toColId) {
          runKanbanAutomations(
            b,
            {
              type: "card_moved_to_column",
              cardId,
              fromColumnId: fromContainer,
              toColumnId: toColId,
            },
            0,
            activityActorLabel,
          );
        }
      });

      if (
        onLinkedOrderMovedToKaitenMirror &&
        cardSnapshot.linkedOrderId &&
        typeof cardSnapshot.kaitenCardId === "number" &&
        Number.isFinite(cardSnapshot.kaitenCardId) &&
        sortOrderPreview != null &&
        Number.isFinite(sortOrderPreview)
      ) {
        const cross = fromContainer !== toColId;
        const toTitle = board.columns.find((c) => c.id === toColId)?.title ?? "";
        onLinkedOrderMovedToKaitenMirror({
          orderId: cardSnapshot.linkedOrderId,
          kaitenCardId: cardSnapshot.kaitenCardId,
          ...(cross && toTitle.trim() ? { columnTitle: toTitle.trim() } : {}),
          sortOrder: sortOrderPreview,
        });
      }
    },
    [
      board.columns,
      columnIds,
      appState,
      dndLocked,
      onPatchBoard,
      resolveCardHomeBoard,
      activityActorLabel,
      onLinkedOrderMovedToKaitenMirror,
      aggregateLayoutLocked,
      onAggregateCardDrag,
    ],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={onDragEnd}
    >
      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth p-2 [-webkit-overflow-scrolling:touch] sm:p-4">
        <div className="flex w-max min-w-0 shrink-0 items-start gap-2 sm:gap-3">
          <SortableContext
            items={columnIds}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex items-start gap-2 sm:gap-3">
              {board.columns.map((col) => {
                const vis = visibleCardsInColumn(col, appState, resolveCardHomeBoard);
                const cardIds = vis.map((c) => c.id);
                return (
                  <SortableColumnSection
                    key={col.id}
                    col={col}
                    onRenameColumn={onRenameColumn}
                    onDeleteColumn={onDeleteColumn}
                    visCount={vis.length}
                    totalCount={col.cards.length}
                    layoutLocked={aggregateLayoutLocked}
                  >
                    <SortableContext
                      id={col.id}
                      items={cardIds}
                      strategy={verticalListSortingStrategy}
                      disabled={dndLocked}
                    >
                      <div
                        className="cards-container flex min-h-[40px] flex-1 flex-col gap-1.5 overflow-y-auto p-1.5 sm:min-h-[48px] sm:gap-2 sm:p-2"
                        data-column-id={col.id}
                      >
                        {vis.map((card) => {
                          const home = resolveCardHomeBoard(card);
                          const foreignBoardLabel =
                            (appState.search.trim() || aggregateLayoutLocked) &&
                            home.id !== appState.activeBoardId
                              ? home.title
                              : undefined;
                          return (
                            <SortableKanbanCard
                              key={card.id}
                              card={card}
                              homeBoard={home}
                              foreignBoardLabel={foreignBoardLabel}
                              dndLocked={dndLocked}
                              onOpenCard={onOpenCard}
                              onCopyCardLink={onCopyCardLink}
                              onRequestMoveCard={onRequestMoveCard}
                              onRequestDeleteCard={onRequestDeleteCard}
                              allowMoveToOtherBoard={allowMoveToOtherBoard}
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                    {!aggregateLayoutLocked ? (
                      <button
                        type="button"
                        className="mx-1.5 mb-1.5 rounded-md px-1.5 py-1.5 text-left text-[0.72rem] text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-text)] dark:hover:bg-white/[0.06] sm:mx-2 sm:mb-2 sm:px-2 sm:py-2 sm:text-[0.875rem]"
                        onClick={() => onAddCard(col.id)}
                      >
                        <span className="inline-flex items-center gap-1 sm:gap-2">
                          <IconPlus />{" "}
                          <span className="max-md:leading-tight">Добавить карточку</span>
                        </span>
                      </button>
                    ) : null}
                  </SortableColumnSection>
                );
              })}
            </div>
          </SortableContext>
          {!aggregateLayoutLocked ? (
            <div className="flex w-[148px] shrink-0 self-start min-[420px]:w-[168px] sm:w-[200px] lg:w-[252px] xl:w-[280px]">
              <button
                type="button"
                className="w-full rounded-md border-2 border-dashed border-[var(--kanban-border)] bg-black/[0.05] px-1.5 py-2 text-left text-[0.72rem] leading-snug text-[var(--kanban-text-muted)] hover:text-[var(--kanban-text)] dark:bg-white/[0.04] sm:px-2 sm:py-2.5 sm:text-[0.875rem]"
                onClick={onAddColumn}
              >
                <span className="inline-flex items-center gap-1 sm:gap-2">
                  <IconPlus /> Добавить колонку
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </DndContext>
  );
}
