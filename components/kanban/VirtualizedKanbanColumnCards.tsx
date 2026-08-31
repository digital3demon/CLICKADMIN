"use client";

import type { ReactNode } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { KanbanCard } from "@/lib/kanban/types";

/**
 * Все карточки колонки в DOM. Окно по 96px ломало прокрутку
 * (реальная высота + CSS zoom) — список прыгал и не доезжал до конца.
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
  return (
    <SortableContext
      id={columnId}
      items={cards.map((c) => c.id)}
      strategy={verticalListSortingStrategy}
      disabled={dndLocked}
    >
      <div
        className={className}
        data-column-id={columnId}
        data-lane-id={laneId}
      >
        {cards.map((card) => renderCard(card))}
      </div>
    </SortableContext>
  );
}
