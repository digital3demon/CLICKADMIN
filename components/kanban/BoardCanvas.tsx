"use client";

import type { KanbanAppState, KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import { runKanbanAutomations } from "@/lib/kanban/automations";
import {
  visibleCardsInColumn,
  visibleIndexToFullInsertIndex,
} from "@/lib/kanban/board-visible-cards";
import { readClientState, writeClientState } from "@/lib/client-state-client";
import { previewLinkedCardKaitenSortOrderAfterDrag } from "@/lib/kanban/kanban-card-move-preview";
import { getKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import {
  annulKanbanStageTimerOnMemberAdvance,
  cardMatchesFilters,
  dueCategory,
  formatDate,
  getCardTypeAccent,
  isCardBlocked,
  kanbanTypeRingStyle,
  pushActivity,
} from "@/lib/kanban/model";
import {
  closestCenter,
  rectIntersection,
  DndContext,
  DragOverlay,
  type DragCancelEvent,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type DraggableSyntheticListeners,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
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
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  IconBrick,
  IconDots,
  IconGrip,
  IconPen,
  IconPlus,
  IconTrash,
} from "./kanban-icons";
import { KanbanPersonAvatar } from "./KanbanPersonAvatar";
import { useKanbanCardHoverPreview } from "./KanbanCardHoverPreview";
import { KanbanTimerIcon } from "./KanbanTimerIcon";
import type { AggregateCardDragArgs } from "@/lib/kanban/aggregate-card-drag";

type BoardCanvasProps = {
  appState: KanbanAppState;
  board: KanbanBoard;
  /** Доска-владелец карточки (тип, цвет, пользователи) при поиске по всем доскам. */
  resolveCardHomeBoard: (card: KanbanCard) => KanbanBoard;
  /** Подпись текущего пользователя для журнала активности карточки. */
  activityActorLabel?: string;
  /** CRM user id — для аннулирования этапного таймера при переносе. */
  sessionUserId?: string | null;
  dndLocked: boolean;
  /** Виртуальные «Мои» / «Ответственный»: без перестановки колонок, без добавления колонок/карточек. */
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
  onRequestArchiveCard: (cardId: string) => void;
  onRequestStopCard?: (cardId: string) => void;
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
  onCardColumnChanged?: (args: { cardId: string; fromColumnId: string; toColumnId: string }) => void;
};

const CARD_MENU_WIDTH = 220;
const CARD_MENU_GAP = 4;
const CARD_MENU_EST_HEIGHT = 150;
const BOARD_COLUMN_WIDTH_CLASS =
  "w-[140px] min-[420px]:w-[156px] sm:w-[176px] lg:w-[192px] xl:w-[208px]";

/** На touch-экранах: удержание перед перетаскиванием карточки, чтобы работал горизонтальный скролл. */
const KANBAN_TOUCH_DRAG_DELAY_MS = 420;
const KANBAN_TOUCH_DRAG_TOLERANCE_PX = 12;

function useKanbanCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return coarse;
}

function rectsIntersect(a: DOMRect | { left: number; right: number; top: number; bottom: number }, b: DOMRect): boolean {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function isPointerOverStopDropTarget(
  point: { x: number; y: number } | null,
  dragRect: DOMRect | { left: number; right: number; top: number; bottom: number } | null,
): boolean {
  const stopButton = document.getElementById("kanban-stop-drop-target");
  const stopRect = stopButton?.getBoundingClientRect();
  if (!stopRect) return false;
  const pointInside =
    point != null &&
    point.x >= stopRect.left &&
    point.x <= stopRect.right &&
    point.y >= stopRect.top &&
    point.y <= stopRect.bottom;
  if (pointInside) return true;
  if (dragRect && rectsIntersect(dragRect, stopRect)) return true;
  return false;
}

function setStopDropTargetHot(hot: boolean): void {
  const el = document.getElementById("kanban-stop-drop-target");
  if (!el) return;
  el.classList.toggle("kanban-stop-drop-hot", hot);
  el.setAttribute("aria-dropeffect", hot ? "move" : "none");
}

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
  onArchiveCard,
  onStopCard,
  onDeleteCard,
  dragListeners,
  dragVibrate = false,
  dragOverStop = false,
  allowMoveToOtherBoard = true,
  hoverPreviewEnabled = true,
  onPreviewMove,
  onPreviewLeave,
}: {
  card: KanbanCard;
  homeBoard: KanbanBoard;
  /** При поиске по всем доскам — название доски-владельца, если это не активная доска. */
  foreignBoardLabel?: string;
  onOpen: () => void;
  onCopyLink: () => void;
  onMoveCard: () => void;
  onArchiveCard: () => void;
  onStopCard?: () => void;
  onDeleteCard: () => void;
  /** Слушатели @dnd-kit (только для незаблокированной карточки). */
  dragListeners?: DraggableSyntheticListeners;
  /** Touch: анимация «вибрации» на время перетаскивания (DragOverlay). */
  dragVibrate?: boolean;
  /** Наведение на кнопку СТОП: вибрация + красный tint. */
  dragOverStop?: boolean;
  allowMoveToOtherBoard?: boolean;
  hoverPreviewEnabled?: boolean;
  onPreviewMove?: (card: KanbanCard, event: React.MouseEvent) => void;
  onPreviewLeave?: () => void;
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
  const assignees = card.assignees || [];
  /** Участники — отдельная роль от ответственных; один пользователь может быть в обоих списках. */
  const participants = card.participants || [];
  const stageDue = getKanbanStageDue(card);
  const urgent = !!card.urgent;

  const primaryMemberId = assignees[0] || participants[0] || null;
  const stackMemberIds: string[] = [];
  for (const id of [...assignees, ...participants]) {
    if (!id || id === primaryMemberId) continue;
    if (stackMemberIds.includes(id)) continue;
    stackMemberIds.push(id);
  }
  const stackVisible = stackMemberIds.slice(0, 3);
  const stackOverflow = stackMemberIds.length - stackVisible.length;

  /** Один канон на mobile и desktop — без sm:/max-md: развилок лица карточки. */
  let duePillClass =
    "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[0.62rem] font-medium tabular-nums leading-none";
  if (stageDue) {
    const cat = dueCategory(stageDue);
    if (cat === "overdue")
      duePillClass +=
        " border-[color-mix(in_srgb,var(--kanban-overdue)_35%,transparent)] bg-[color-mix(in_srgb,var(--kanban-overdue)_12%,transparent)] text-[var(--kanban-overdue)]";
    else if (cat === "today")
      duePillClass +=
        " border-[color-mix(in_srgb,var(--kanban-today)_35%,transparent)] bg-[color-mix(in_srgb,var(--kanban-today)_12%,transparent)] text-[var(--kanban-today)]";
    else
      duePillClass +=
        " border-[var(--kanban-border)] bg-[var(--kanban-card-bg)] text-[var(--kanban-text)]";
  } else {
    duePillClass +=
      " border-[var(--kanban-border)] bg-black/[0.04] text-[var(--kanban-text-muted)] dark:bg-white/[0.04]";
  }

  const typeRing = dragOverStop
    ? {
        background:
          "linear-gradient(135deg, #ef4444 0%, #b91c1c 50%, #7f1d1d 100%)",
      }
    : kanbanTypeRingStyle(accent);
  const dragArticleClass = dragOverStop
    ? "kanban-card-drag-over-stop transition-none"
    : dragVibrate
      ? "kanban-card-drag-vibrate transition-none"
      : "transition-[box-shadow,transform,border-color]";

  const blockReasonText = (card.blockReason || "").trim() || "Карточка остановлена";
  /** При STOP — выше, чтобы причина влезала в 2–3 строки мелким шрифтом. */
  const cardHeightClass = blocked ? "h-[10rem]" : "h-[8.5rem]";

  return (
    <div
      data-card-id={card.id}
      className={`block w-full min-w-0 shrink-0 touch-pan-x touch-pan-y ${cardHeightClass}`}
    >
      <div
        className="relative h-full rounded-[9px] p-[2px]"
        style={typeRing}
      >
        <article
          className={`relative flex h-full flex-col overflow-hidden rounded-[7px] border border-black/[0.1] bg-[var(--kanban-card-bg)] shadow-[var(--kanban-shadow)] dark:border-white/[0.1] cursor-grab active:cursor-grabbing hover:border-[color-mix(in_srgb,var(--kanban-accent)_35%,transparent)] hover:shadow-[var(--kanban-shadow-elevated)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)] dark:hover:border-white/[0.12] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.5)] ${dragArticleClass}`}
          {...(dragListeners ?? {})}
          onMouseMove={(event) => {
            if (hoverPreviewEnabled && onPreviewMove) onPreviewMove(card, event);
          }}
          onMouseLeave={() => onPreviewLeave?.()}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest(".card-more-menu")) return;
            onOpen();
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[7px]">
            {blocked ? (
              <div
                className="flex shrink-0 items-start gap-1 border-b border-[#7f1d1d] bg-gradient-to-b from-[#dc2626] to-[#b91c1c] px-2 py-1 pr-8 text-white dark:from-[#c02626] dark:to-[#991b1b]"
                aria-label={blockReasonText}
                title={blockReasonText}
              >
                <IconBrick className="mt-0.5 h-3 w-3 shrink-0 text-white" />
                <span className="min-w-0 flex-1 break-words text-[0.48rem] font-bold uppercase leading-snug tracking-wide line-clamp-3">
                  {blockReasonText}
                </span>
              </div>
            ) : null}
            <div
              className="flex shrink-0 items-center gap-1 border-b border-black/[0.08] py-0.5 pl-2 pr-8 dark:border-white/[0.1]"
              style={{
                color: `color-mix(in srgb, ${accent} 78%, var(--kanban-text))`,
                background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 28%, var(--kanban-card-bg)) 0%, color-mix(in srgb, ${accent} 14%, var(--kanban-card-bg)) 100%)`,
              }}
            >
              <span className="min-w-0 truncate text-[0.62rem] font-bold uppercase tracking-wide">
                {ct?.name ?? "—"}
              </span>
              {urgent ? (
                <span
                  className="inline-flex shrink-0 items-center rounded-full border border-orange-300/50 bg-gradient-to-b from-orange-500 to-red-600 px-1.5 py-0.5 text-[0.5rem] font-extrabold uppercase leading-none tracking-wide text-white shadow-sm"
                  title="Срочно"
                >
                  Срочно
                </span>
              ) : null}
            </div>
            {foreignBoardLabel ? (
              <div
                className="shrink-0 truncate border-b border-black/[0.08] px-2 py-0.5 text-[0.5rem] font-medium leading-none text-[var(--kanban-text-muted)] dark:border-white/[0.08]"
                title={`Карточка с доски «${foreignBoardLabel}»`}
              >
                <span className="opacity-80">Доска:</span>{" "}
                <span className="text-[var(--kanban-text)]">{foreignBoardLabel}</span>
              </div>
            ) : null}
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-1.5 px-2 pb-0.5 pt-1.5">
              <div className="min-w-0 text-[0.8rem] font-semibold leading-snug text-[var(--kanban-text)]">
                <span className="line-clamp-3 break-words">{card.title}</span>
              </div>
              <div className="flex shrink-0 items-start gap-1 self-start">
                {primaryMemberId ? (
                  <KanbanPersonAvatar
                    userId={primaryMemberId}
                    homeBoard={homeBoard}
                    variant={
                      assignees.includes(primaryMemberId) ? "assignee" : "participant"
                    }
                    size="sm"
                    nameArc
                    titleSuffix=""
                  />
                ) : null}
                {stackVisible.length > 0 || stackOverflow > 0 ? (
                  <div
                    className="flex flex-col items-center gap-0.5"
                    title="Участники и ответственные"
                  >
                    {stackVisible.map((uid) => (
                      <KanbanPersonAvatar
                        key={uid}
                        userId={uid}
                        homeBoard={homeBoard}
                        variant={
                          assignees.includes(uid) ? "assignee" : "participant"
                        }
                        size="sm"
                        nameArc
                        titleSuffix=""
                      />
                    ))}
                    {stackOverflow > 0 ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/40 text-[0.5rem] font-bold text-white">
                        +{stackOverflow}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-auto flex shrink-0 items-center gap-1 px-2 pb-2 pt-0.5">
              <span className={duePillClass} title={stageDue ? "Срок этапа" : "Срок не задан"}>
                {stageDue ? formatDate(stageDue) : "дд.мм.гггг"}
              </span>
              <KanbanTimerIcon
                card={card}
                className="ml-auto shrink-0"
                sizeClassName="h-[1.125rem] w-[1.125rem]"
              />
            </div>
          </div>
          <div
            className="card-more-menu absolute right-0.5 top-0.5 z-10"
            ref={menuRef}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="rounded-md p-0.5 text-current opacity-80 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/15"
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
                    <li>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveCard();
                          setMenuOpen(false);
                        }}
                      >
                        В архив
                      </button>
                    </li>
                    {onStopCard ? (
                      <li>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStopCard();
                            setMenuOpen(false);
                          }}
                        >
                          В стоп
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
  onRequestArchiveCard,
  onRequestStopCard,
  onRequestDeleteCard,
  allowMoveToOtherBoard,
  hoverPreviewEnabled = true,
  onPreviewMove,
  onPreviewLeave,
}: {
  card: KanbanCard;
  homeBoard: KanbanBoard;
  foreignBoardLabel?: string;
  dndLocked: boolean;
  onOpenCard: (id: string) => void;
  onCopyCardLink: (id: string) => void;
  onRequestMoveCard: (id: string) => void;
  onRequestArchiveCard: (id: string) => void;
  onRequestStopCard?: (id: string) => void;
  onRequestDeleteCard: (id: string) => void;
  allowMoveToOtherBoard: boolean;
  hoverPreviewEnabled?: boolean;
  onPreviewMove?: (card: KanbanCard, event: React.MouseEvent) => void;
  onPreviewLeave?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      disabled: dndLocked,
    });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.08 : undefined,
    ...(dndLocked || !isDragging ? {} : { touchAction: "none" as const }),
  };

  const blocked = isCardBlocked(card);
  const wrapperHeightClass = blocked ? "h-[10rem]" : "h-[8.5rem]";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`${wrapperHeightClass} w-full min-w-0 shrink-0`}
    >
      <KanbanCardView
        card={card}
        homeBoard={homeBoard}
        foreignBoardLabel={foreignBoardLabel}
        onOpen={() => onOpenCard(card.id)}
        onCopyLink={() => onCopyCardLink(card.id)}
        onMoveCard={() => onRequestMoveCard(card.id)}
        onArchiveCard={() => onRequestArchiveCard(card.id)}
        onStopCard={onRequestStopCard ? () => onRequestStopCard(card.id) : undefined}
        onDeleteCard={() => onRequestDeleteCard(card.id)}
        dragListeners={dndLocked ? undefined : listeners}
        allowMoveToOtherBoard={allowMoveToOtherBoard}
        hoverPreviewEnabled={hoverPreviewEnabled && !isDragging}
        onPreviewMove={onPreviewMove}
        onPreviewLeave={onPreviewLeave}
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
  columnDragDisabled,
}: {
  col: KanbanBoard["columns"][0];
  children: ReactNode;
  onRenameColumn: (id: string) => void;
  onDeleteColumn: (id: string) => void;
  visCount: number;
  totalCount: number;
  layoutLocked?: boolean;
  columnDragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: col.id, disabled: Boolean(layoutLocked || columnDragDisabled) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    ...(layoutLocked || columnDragDisabled || !isDragging
      ? {}
      : { touchAction: "none" as const }),
  };

  const dragProps = layoutLocked || columnDragDisabled ? {} : { ...listeners, ...attributes };

  return (
    <section
      ref={setNodeRef}
      style={style}
      data-column-id={col.id}
      className={`kanban-column flex max-h-[calc(100dvh-184px)] ${BOARD_COLUMN_WIDTH_CLASS} shrink-0 flex-col rounded-[9px] border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] shadow-[var(--kanban-shadow)] dark:border-white/[0.06] dark:bg-gradient-to-b dark:from-[#2d2d32] dark:to-[#27272a] max-md:max-h-[calc(100dvh-132px)]`}
    >
      <header
        className={`column-header-handle relative border-b border-[var(--kanban-border)] px-2 pb-1.5 pt-2 max-md:px-1.5 max-md:pb-1 max-md:pt-1.5 sm:px-2 sm:pb-1.5 sm:pt-2 ${
          layoutLocked || columnDragDisabled ? "" : "cursor-grab active:cursor-grabbing"
        }`}
        {...dragProps}
      >
        {!layoutLocked ? (
          <div className="absolute right-1 top-1 z-10 flex shrink-0 items-center gap-0.5 sm:right-1.5 sm:top-1.5">
            <button
              type="button"
              className="rounded p-0.5 text-[var(--kanban-text-muted)] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
              title="Переименовать"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onRenameColumn(col.id)}
            >
              <IconPen className="max-md:scale-90" />
            </button>
            <button
              type="button"
              className="rounded p-0.5 text-[var(--kanban-text-muted)] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
              title="Удалить колонку"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onDeleteColumn(col.id)}
            >
              <IconTrash className="max-md:scale-90" />
            </button>
          </div>
        ) : null}
        <div
          className="min-w-0 cursor-default break-words pr-9 text-[11px] font-semibold leading-tight text-[var(--kanban-text)] sm:pr-10 sm:text-[0.72rem] sm:leading-tight"
          onDoubleClick={() => {
            if (!layoutLocked) onRenameColumn(col.id);
          }}
        >
          {col.title}
        </div>
        <div className="mt-0.5 text-[0.58rem] text-[var(--kanban-text-muted)] max-md:leading-tight sm:text-[0.65rem]">
          {visCount}
          {visCount !== totalCount ? ` из ${totalCount}` : ""} карточек
        </div>
      </header>
      {children}
    </section>
  );
}

type LaneGroup = {
  id: string;
  title: string;
  columnIds: string[];
};

type LaneOffset = {
  x: number;
  y: number;
};

const LANE_LAYOUT_STORAGE_PREFIX = "kanban-lane-layout-v2:";
const PRODUCTION_BOARD_ID = "kanban-board-production";

type LaneLayoutStorage = {
  scope: "user" | "tenant";
  key: string;
};

function isProductionBoard(board: KanbanBoard): boolean {
  const title = String(board.title || "").trim().toLowerCase();
  return board.id === PRODUCTION_BOARD_ID || title === "производство";
}

function laneTitleFromColumnTitle(columnTitle: string): string | null {
  const parts = String(columnTitle || "").split("·");
  if (parts.length < 2) return null;
  const left = (parts[0] || "").trim();
  return left || null;
}

function buildLaneGroups(columns: KanbanBoard["columns"]): LaneGroup[] {
  const out: LaneGroup[] = [];
  for (const col of columns) {
    const laneTitle = laneTitleFromColumnTitle(col.title);
    if (!laneTitle) continue;
    const last = out[out.length - 1];
    if (last && last.title === laneTitle) {
      last.columnIds.push(col.id);
      continue;
    }
    out.push({
      id: `lane::${out.length}::${laneTitle.toLowerCase().replace(/\s+/g, "_")}`,
      title: laneTitle,
      columnIds: [col.id],
    });
  }
  return out;
}

function normalizeLaneOffsets(
  raw: unknown,
): Record<string, LaneOffset> {
  const parsed =
    typeof raw === "string"
      ? (JSON.parse(raw) as Record<string, { x?: unknown; y?: unknown }>)
      : (raw as Record<string, { x?: unknown; y?: unknown }>);
  const next: Record<string, LaneOffset> = {};
  for (const [key, value] of Object.entries(parsed || {})) {
    const x = Number(value?.x);
    const y = Number(value?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    next[key] = { x, y };
  }
  return next;
}

function laneOffsetsEqual(
  left: Record<string, LaneOffset>,
  right: Record<string, LaneOffset>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    const a = left[key];
    const b = right[key];
    if (!a || !b) return false;
    if (a.x !== b.x || a.y !== b.y) return false;
  }
  return true;
}

function DraggableLaneSection({
  lane,
  offset,
  dragging,
  disabled,
  onHandlePointerDown,
  children,
}: {
  lane: LaneGroup;
  offset: LaneOffset;
  dragging: boolean;
  disabled?: boolean;
  onHandlePointerDown: (laneId: string, e: ReactPointerEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        zIndex: dragging ? 40 : undefined,
      }}
      className="flex shrink-0 flex-col rounded-[9px] border border-[var(--kanban-border)] bg-black/[0.03] p-1 dark:bg-white/[0.03]"
    >
      <header className="mb-1 flex items-center justify-between gap-1.5 px-1">
        <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--kanban-text)]">
          {lane.title}
        </div>
        <button
          type="button"
          className={`inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--kanban-border)] text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-text)] dark:hover:bg-white/[0.08] ${
            disabled ? "cursor-default opacity-50" : "cursor-grab active:cursor-grabbing"
          }`}
          title={`Переместить дорожку «${lane.title}»`}
          onPointerDown={(e) => onHandlePointerDown(lane.id, e)}
        >
          <IconGrip className="h-3 w-3" />
        </button>
      </header>
      <div className="flex items-start gap-1.5 sm:gap-2">{children}</div>
    </section>
  );
}

export function BoardCanvas({
  appState,
  board,
  resolveCardHomeBoard,
  activityActorLabel,
  sessionUserId,
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
  onRequestArchiveCard,
  onRequestStopCard,
  onRequestDeleteCard,
  allowMoveToOtherBoard = true,
  onLinkedOrderMovedToKaitenMirror,
  onCardColumnChanged,
}: BoardCanvasProps) {
  const columnIds = board.columns.map((c) => c.id);
  const laneGroups = useMemo(() => buildLaneGroups(board.columns), [board.columns]);
  const laneLayoutEnabled = laneGroups.length > 0 && laneGroups.some((lane) => lane.columnIds.length > 1);
  const [laneOffsets, setLaneOffsets] = useState<Record<string, LaneOffset>>({});
  const [laneLayoutLoaded, setLaneLayoutLoaded] = useState(false);
  const [dragLaneId, setDragLaneId] = useState<string | null>(null);
  const laneOffsetsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const laneDragRafRef = useRef<number | null>(null);
  const dragPointRef = useRef<{ x: number; y: number } | null>(null);
  const laneDragPendingPointRef = useRef<{
    laneId: string;
    clientX: number;
    clientY: number;
  } | null>(null);
  const laneDragRef = useRef<{
    laneId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [activeDragCardId, setActiveDragCardId] = useState<string | null>(null);
  const [dragOverStop, setDragOverStop] = useState(false);
  const dragOverStopRef = useRef(false);
  const { onPreviewMove, onPreviewLeave, previewNode } = useKanbanCardHoverPreview(true);
  /** Горизонтальная полоса колонок: wheel без passive — только горизонтальный жест / Shift+колесо. */
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const coarsePointer = useKanbanCoarsePointer();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: coarsePointer ? KANBAN_TOUCH_DRAG_DELAY_MS : 200,
        tolerance: KANBAN_TOUCH_DRAG_TOLERANCE_PX,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const laneLayoutStorage = useMemo<LaneLayoutStorage>(() => {
    if (isProductionBoard(board)) {
      return {
        scope: "tenant",
        key: `${LANE_LAYOUT_STORAGE_PREFIX}${PRODUCTION_BOARD_ID}`,
      };
    }
    return {
      scope: "user",
      key: `${LANE_LAYOUT_STORAGE_PREFIX}${board.id}`,
    };
  }, [board]);

  useEffect(() => {
    if (!laneLayoutEnabled) {
      setLaneOffsets({});
      setLaneLayoutLoaded(false);
      return;
    }
    setLaneLayoutLoaded(false);
    let cancelled = false;
    void (async () => {
      try {
        const raw = await readClientState<unknown>(laneLayoutStorage.scope, laneLayoutStorage.key);
        if (cancelled || raw == null) {
          if (!cancelled) {
            setLaneOffsets({});
            setLaneLayoutLoaded(true);
          }
          return;
        }
        const next = normalizeLaneOffsets(raw);
        if (!cancelled) {
          setLaneOffsets(next);
          setLaneLayoutLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setLaneOffsets({});
          setLaneLayoutLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [laneLayoutEnabled, laneLayoutStorage.key, laneLayoutStorage.scope]);

  useEffect(() => {
    if (!laneLayoutEnabled) return;
    setLaneOffsets((prev) => {
      const next: Record<string, LaneOffset> = {};
      let changed = false;
      for (let i = 0; i < laneGroups.length; i++) {
        const lane = laneGroups[i]!;
        const existing = prev[lane.id];
        if (existing) {
          next[lane.id] = existing;
          continue;
        }
        next[lane.id] = { x: 0, y: 0 };
        changed = true;
      }
      if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
      return changed ? next : prev;
    });
  }, [laneGroups, laneLayoutEnabled]);

  useEffect(() => {
    if (!laneLayoutEnabled || !laneLayoutLoaded) return;
    if (laneOffsetsSaveTimerRef.current) {
      clearTimeout(laneOffsetsSaveTimerRef.current);
    }
    laneOffsetsSaveTimerRef.current = setTimeout(() => {
      void writeClientState(laneLayoutStorage.scope, laneLayoutStorage.key, laneOffsets);
    }, 250);
    return () => {
      if (laneOffsetsSaveTimerRef.current) {
        clearTimeout(laneOffsetsSaveTimerRef.current);
        laneOffsetsSaveTimerRef.current = null;
      }
    };
  }, [
    laneOffsets,
    laneLayoutEnabled,
    laneLayoutLoaded,
    laneLayoutStorage.key,
    laneLayoutStorage.scope,
  ]);

  useEffect(() => {
    if (
      !laneLayoutEnabled ||
      !laneLayoutLoaded ||
      laneLayoutStorage.scope !== "tenant"
    ) {
      return;
    }
    let cancelled = false;
    const pull = async () => {
      if (cancelled || laneDragRef.current) return;
      const raw = await readClientState<unknown>(laneLayoutStorage.scope, laneLayoutStorage.key);
      if (cancelled || raw == null) return;
      const next = normalizeLaneOffsets(raw);
      setLaneOffsets((prev) => (laneOffsetsEqual(prev, next) ? prev : next));
    };
    const onVisibleOrFocus = () => {
      if (document.visibilityState !== "visible") return;
      void pull();
    };
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void pull();
    }, 4000);
    document.addEventListener("visibilitychange", onVisibleOrFocus);
    window.addEventListener("focus", onVisibleOrFocus);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibleOrFocus);
      window.removeEventListener("focus", onVisibleOrFocus);
    };
  }, [laneLayoutEnabled, laneLayoutLoaded, laneLayoutStorage.key, laneLayoutStorage.scope]);

  const handleLanePointerDown = useCallback(
    (laneId: string, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (aggregateLayoutLocked) return;
      e.preventDefault();
      e.stopPropagation();
      const start = laneOffsets[laneId] ?? { x: 0, y: 0 };
      laneDragRef.current = {
        laneId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: start.x,
        startY: start.y,
      };
      setDragLaneId(laneId);
      const onMove = (ev: PointerEvent) => {
        laneDragPendingPointRef.current = {
          laneId,
          clientX: ev.clientX,
          clientY: ev.clientY,
        };
        if (laneDragRafRef.current != null) return;
        laneDragRafRef.current = window.requestAnimationFrame(() => {
          laneDragRafRef.current = null;
          const drag = laneDragRef.current;
          const pending = laneDragPendingPointRef.current;
          if (!drag || !pending || drag.laneId !== laneId || pending.laneId !== laneId) return;
          const dx = pending.clientX - drag.startClientX;
          const dy = pending.clientY - drag.startClientY;
          setLaneOffsets((prev) => ({
            ...prev,
            [laneId]: { x: drag.startX + dx, y: drag.startY + dy },
          }));
        });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (laneDragRafRef.current != null) {
          window.cancelAnimationFrame(laneDragRafRef.current);
          laneDragRafRef.current = null;
        }
        laneDragPendingPointRef.current = null;
        laneDragRef.current = null;
        setDragLaneId((current) => (current === laneId ? null : current));
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [aggregateLayoutLocked, laneOffsets],
  );

  useEffect(() => {
    return () => {
      if (laneDragRafRef.current != null) {
        window.cancelAnimationFrame(laneDragRafRef.current);
        laneDragRafRef.current = null;
      }
    };
  }, []);

  /**
   * На границах колонок closestCorners часто "дёргает" цель.
   * Сначала берём реальный hit-test указателя, затем пересечение,
   * и только потом ближайший центр как мягкий fallback.
   */
  const collisionDetection = useCallback(
    (...args: Parameters<typeof pointerWithin>) => {
      const pointerHits = pointerWithin(...args);
      if (pointerHits.length > 0) return pointerHits;
      const intersections = rectIntersection(...args);
      if (intersections.length > 0) return intersections;
      return closestCenter(...args);
    },
    [],
  );

  useEffect(() => {
    const el = horizontalScrollRef.current;
    if (!el) return;

    const canScrollVerticallyFromTarget = (
      target: EventTarget | null,
      deltaY: number,
    ): boolean => {
      if (!(target instanceof Node)) return false;
      let node: Node | null = target;
      while (node && node !== el) {
        if (node instanceof HTMLElement) {
          const cs = window.getComputedStyle(node);
          const overflowY = cs.overflowY;
          const scrollableY =
            (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
            node.scrollHeight > node.clientHeight;
          if (scrollableY) {
            if (deltaY < 0 && node.scrollTop > 0) return true;
            if (deltaY > 0 && node.scrollTop + node.clientHeight < node.scrollHeight) {
              return true;
            }
          }
        }
        node = node.parentNode;
      }
      return false;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;

      const canScrollY = canScrollVerticallyFromTarget(e.target, e.deltaY);
      const ax = Math.abs(e.deltaX);
      const ay = Math.abs(e.deltaY);

      if (e.shiftKey) {
        if (canScrollY) return;
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        return;
      }

      // Явный горизонтальный жест (тачпад / горизонтальное колесо)
      if (ax > 0.5 && ax >= ay * 1.05) {
        const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
        const canScrollLeft = e.deltaX < 0 && el.scrollLeft > 0.5;
        const canScrollRight = e.deltaX > 0 && el.scrollLeft < maxLeft - 0.5;
        if (!canScrollLeft && !canScrollRight) return;
        e.preventDefault();
        el.scrollLeft += e.deltaX;
        return;
      }

      if (canScrollY && ay >= ax * 0.85) return;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const activeDragCard = activeDragCardId
    ? board.columns.flatMap((col) => col.cards).find((card) => card.id === activeDragCardId) ?? null
    : null;
  const activeDragCardHomeBoard = activeDragCard ? resolveCardHomeBoard(activeDragCard) : null;
  const activeDragForeignBoardLabel =
    activeDragCard && activeDragCardHomeBoard && activeDragCardHomeBoard.id !== appState.activeBoardId
      ? activeDragCardHomeBoard.title
      : undefined;

  const clearStopDropHot = useCallback(() => {
    dragOverStopRef.current = false;
    setDragOverStop(false);
    setStopDropTargetHot(false);
  }, []);

  const setKanbanCardDraggingFlag = useCallback((on: boolean) => {
    if (on) {
      document.documentElement.dataset.kanbanCardDragging = "1";
      window.dispatchEvent(new Event("kanban-card-drag-start"));
    } else {
      delete document.documentElement.dataset.kanbanCardDragging;
      window.dispatchEvent(new Event("kanban-card-drag-end"));
    }
  }, []);

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.kanbanCardDragging;
      setStopDropTargetHot(false);
    };
  }, []);

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const aid = String(event.active.id);
      if (columnIds.includes(aid)) {
        setActiveDragCardId(null);
        setKanbanCardDraggingFlag(false);
        clearStopDropHot();
        return;
      }
      onPreviewLeave();
      setActiveDragCardId(aid);
      setKanbanCardDraggingFlag(true);
      clearStopDropHot();
    },
    [columnIds, onPreviewLeave, clearStopDropHot, setKanbanCardDraggingFlag],
  );

  const onDragMove = useCallback(
    (event: DragMoveEvent) => {
      const rect = event.active.rect.current.translated;
      if (!rect) return;
      const point = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      dragPointRef.current = point;
      if (!onRequestStopCard || dndLocked) {
        clearStopDropHot();
        return;
      }
      const over = isPointerOverStopDropTarget(point, rect);
      dragOverStopRef.current = over;
      setDragOverStop(over);
      setStopDropTargetHot(over);
    },
    [onRequestStopCard, dndLocked, clearStopDropHot],
  );

  const onDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      setActiveDragCardId(null);
      dragPointRef.current = null;
      setKanbanCardDraggingFlag(false);
      clearStopDropHot();
    },
    [clearStopDropHot, setKanbanCardDraggingFlag],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragCardId(null);
      setKanbanCardDraggingFlag(false);
      const { active, over } = event;
      const aid = String(active.id);
      const point = dragPointRef.current;
      dragPointRef.current = null;
      const wasOverStop = dragOverStopRef.current;
      clearStopDropHot();
      if (
        onRequestStopCard &&
        !columnIds.includes(aid) &&
        !dndLocked
      ) {
        const dragRect = active.rect.current.translated;
        if (
          wasOverStop ||
          isPointerOverStopDropTarget(point, dragRect ?? null)
        ) {
          onRequestStopCard(aid);
          return;
        }
      }
      if (!over || active.id === over.id) return;

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
          const fromIdx = b.columns.findIndex((col) => col.id === fromContainer);
          const toIdx = b.columns.findIndex((col) => col.id === toColId);
          annulKanbanStageTimerOnMemberAdvance(
            card,
            fromIdx,
            toIdx,
            sessionUserId,
            b,
            activityActorLabel,
          );
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

      if (fromContainer !== toColId) {
        onCardColumnChanged?.({ cardId, fromColumnId: fromContainer, toColumnId: toColId });
      }

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
      sessionUserId,
      onLinkedOrderMovedToKaitenMirror,
      aggregateLayoutLocked,
      onAggregateCardDrag,
      onRequestStopCard,
      clearStopDropHot,
      setKanbanCardDraggingFlag,
      onCardColumnChanged,
    ],
  );

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragCancel={onDragCancel}
      onDragEnd={onDragEnd}
    >
      <div
        ref={horizontalScrollRef}
        className="relative z-0 flex min-h-0 min-w-0 flex-1 touch-pan-x overflow-x-auto overflow-y-auto overscroll-x-contain p-1.5 [-webkit-overflow-scrolling:touch] sm:p-2"
      >
        <div className="flex w-max min-w-0 shrink-0 items-start gap-1.5 sm:gap-2">
          <SortableContext
            items={columnIds}
            strategy={horizontalListSortingStrategy}
          >
            {laneLayoutEnabled ? (
              <div className="flex flex-col items-start gap-1.5 sm:gap-2">
                {laneGroups.map((lane) => (
                  <DraggableLaneSection
                    key={lane.id}
                    lane={lane}
                    offset={laneOffsets[lane.id] ?? { x: 0, y: 0 }}
                    dragging={dragLaneId === lane.id}
                    disabled={aggregateLayoutLocked}
                    onHandlePointerDown={handleLanePointerDown}
                  >
                    {lane.columnIds.map((columnId) => {
                      const col = board.columns.find((c) => c.id === columnId);
                      if (!col) return null;
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
                          columnDragDisabled
                        >
                          <SortableContext
                            id={col.id}
                            items={cardIds}
                            strategy={verticalListSortingStrategy}
                            disabled={dndLocked}
                          >
                            <div
                              className="cards-container flex min-h-[36px] flex-1 flex-col gap-1.5 overflow-y-auto p-1.5 sm:min-h-[42px] sm:gap-1.5 sm:p-1.5"
                              data-column-id={col.id}
                              data-lane-id={lane.id}
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
                                    onRequestArchiveCard={onRequestArchiveCard}
                                    onRequestStopCard={onRequestStopCard}
                                    onRequestDeleteCard={onRequestDeleteCard}
                                    allowMoveToOtherBoard={allowMoveToOtherBoard}
                                    onPreviewMove={onPreviewMove}
                                    onPreviewLeave={onPreviewLeave}
                                  />
                                );
                              })}
                            </div>
                          </SortableContext>
                          {!aggregateLayoutLocked ? (
                            <button
                              type="button"
                              className="mx-1.5 mb-1.5 rounded-md px-1.5 py-1 text-left text-[0.68rem] text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-text)] dark:hover:bg-white/[0.06] sm:px-1.5 sm:py-1.5 sm:text-[0.75rem]"
                              onClick={() => onAddCard(col.id)}
                            >
                              <span className="inline-flex items-center gap-1">
                                <IconPlus />{" "}
                                <span className="max-md:leading-tight">Добавить карточку</span>
                              </span>
                            </button>
                          ) : null}
                        </SortableColumnSection>
                      );
                    })}
                  </DraggableLaneSection>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-1.5 sm:gap-2">
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
                      columnDragDisabled={coarsePointer}
                    >
                      <SortableContext
                        id={col.id}
                        items={cardIds}
                        strategy={verticalListSortingStrategy}
                        disabled={dndLocked}
                      >
                        <div
                          className="cards-container flex min-h-[36px] flex-1 flex-col gap-1.5 overflow-y-auto p-1.5 sm:min-h-[42px] sm:gap-1.5 sm:p-1.5"
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
                                onRequestArchiveCard={onRequestArchiveCard}
                                onRequestStopCard={onRequestStopCard}
                                onRequestDeleteCard={onRequestDeleteCard}
                                allowMoveToOtherBoard={allowMoveToOtherBoard}
                                onPreviewMove={onPreviewMove}
                                onPreviewLeave={onPreviewLeave}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                      {!aggregateLayoutLocked ? (
                        <button
                          type="button"
                          className="mx-1.5 mb-1.5 rounded-md px-1.5 py-1 text-left text-[0.68rem] text-[var(--kanban-text-muted)] hover:bg-black/[0.06] hover:text-[var(--kanban-text)] dark:hover:bg-white/[0.06] sm:px-1.5 sm:py-1.5 sm:text-[0.75rem]"
                          onClick={() => onAddCard(col.id)}
                        >
                          <span className="inline-flex items-center gap-1">
                            <IconPlus />{" "}
                            <span className="max-md:leading-tight">Добавить карточку</span>
                          </span>
                        </button>
                      ) : null}
                    </SortableColumnSection>
                  );
                })}
              </div>
            )}
          </SortableContext>
          {!aggregateLayoutLocked ? (
            <div className={`flex ${BOARD_COLUMN_WIDTH_CLASS} shrink-0 self-start`}>
              <button
                type="button"
                className="w-full rounded-md border-2 border-dashed border-[var(--kanban-border)] bg-black/[0.05] px-1.5 py-2 text-left text-[0.72rem] leading-snug text-[var(--kanban-text-muted)] hover:text-[var(--kanban-text)] dark:bg-white/[0.04] sm:px-2 sm:py-2 sm:text-[0.75rem]"
                onClick={onAddColumn}
              >
                <span className="inline-flex items-center gap-1">
                  <IconPlus /> Добавить колонку
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDragCard && activeDragCardHomeBoard ? (
          <div className={BOARD_COLUMN_WIDTH_CLASS}>
            <KanbanCardView
              card={activeDragCard}
              homeBoard={activeDragCardHomeBoard}
              foreignBoardLabel={activeDragForeignBoardLabel}
              dragVibrate
              dragOverStop={dragOverStop}
              onOpen={() => {}}
              onCopyLink={() => {}}
              onMoveCard={() => {}}
              onArchiveCard={() => {}}
              onDeleteCard={() => {}}
              allowMoveToOtherBoard={allowMoveToOtherBoard}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
    {previewNode}
    </>
  );
}
