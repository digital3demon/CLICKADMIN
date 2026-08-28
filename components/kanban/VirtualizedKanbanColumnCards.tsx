"use client";

import { useCallback, useState, type ReactNode } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { KanbanCard } from "@/lib/kanban/types";

const CARD_ROW_PX = 96;
const OVERSCAN = 8;

/**
 * В DOM только окно колонки. DnD регистрирует id окна; вставка — по полному списку снаружи.
 */
export function VirtualizedKanbanColumnCards<T extends KanbanCard>({
  cards,
  renderCard,
  className,
  columnId,
  laneId,
  dndLocked,
}: {
  cards: T[];
  renderCard: (card: T) => ReactNode;
  className: string;
  columnId: string;
  laneId?: string;
  dndLocked?: boolean;
}) {
  const [range, setRange] = useState({ start: 0, end: 24 });

  const onScrollOrResize = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const top = el.scrollTop;
      const h = el.clientHeight || 480;
      const start = Math.max(0, Math.floor(top / CARD_ROW_PX) - OVERSCAN);
      const visible = Math.ceil(h / CARD_ROW_PX) + OVERSCAN * 2;
      const end = Math.min(cards.length, start + visible);
      setRange((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      );
    },
    [cards.length],
  );

  const setScroller = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      onScrollOrResize(el);
    },
    [onScrollOrResize],
  );

  const start = Math.min(range.start, cards.length);
  const end = Math.min(range.end, cards.length);
  const slice = cards.slice(start, end);
  const padTop = start * CARD_ROW_PX;
  const padBottom = Math.max(0, (cards.length - end) * CARD_ROW_PX);

  return (
    <SortableContext
      id={columnId}
      items={slice.map((c) => c.id)}
      strategy={verticalListSortingStrategy}
      disabled={dndLocked}
    >
      <div
        ref={setScroller}
        className={className}
        data-column-id={columnId}
        data-lane-id={laneId}
        onScroll={(e) => onScrollOrResize(e.currentTarget)}
      >
        {padTop > 0 ? <div style={{ height: padTop }} aria-hidden /> : null}
        {slice.map((card) => renderCard(card))}
        {padBottom > 0 ? <div style={{ height: padBottom }} aria-hidden /> : null}
      </div>
    </SortableContext>
  );
}
