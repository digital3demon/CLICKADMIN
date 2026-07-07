"use client";

import type { KanbanCard } from "@/lib/kanban/types";
import {
  clampKanbanHoverPreviewPosition,
  kanbanCardHoverPreviewBody,
  kanbanCardHoverPreviewFooterLines,
} from "@/lib/kanban/kanban-card-hover-preview";
import { useCallback, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";

const PREVIEW_WIDTH = 288;
const PREVIEW_EST_HEIGHT = 220;

export function KanbanCardHoverPreviewPopover({
  card,
  left,
  top,
}: {
  card: KanbanCard;
  left: number;
  top: number;
}) {
  const body = kanbanCardHoverPreviewBody(card);
  const footerLines = kanbanCardHoverPreviewFooterLines(card);
  const title = (card.title || "").trim() || "Без названия";

  return (
    <div
      className="pointer-events-none fixed z-[260] w-72 rounded-xl border border-[var(--kanban-border)] bg-[var(--kanban-card-bg)] p-3 text-xs text-[var(--kanban-text)] shadow-[var(--kanban-shadow-elevated)]"
      style={{ left, top }}
      role="tooltip"
    >
      <p className="line-clamp-2 text-[0.8125rem] font-semibold leading-snug text-[var(--kanban-text)]">
        {title}
      </p>
      <p className="mt-2 line-clamp-[10] whitespace-pre-wrap text-[0.75rem] leading-5 text-[var(--kanban-text-muted)]">
        {body || "Нет описания заказа"}
      </p>
      {footerLines.length > 0 ? (
        <div className="mt-2 space-y-0.5 border-t border-[var(--kanban-border)] pt-2 text-[0.6875rem] font-medium text-[var(--kanban-text-muted)]">
          {footerLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function useKanbanCardHoverPreview(enabled = true) {
  const [hover, setHover] = useState<{
    card: KanbanCard;
    x: number;
    y: number;
  } | null>(null);

  const onPreviewMove = useCallback(
    (card: KanbanCard, event: ReactMouseEvent) => {
      if (!enabled) return;
      setHover({ card, x: event.clientX, y: event.clientY });
    },
    [enabled],
  );

  const onPreviewLeave = useCallback(() => {
    setHover(null);
  }, []);

  const position = useMemo(() => {
    if (!hover) return null;
    return clampKanbanHoverPreviewPosition(hover.x, hover.y, {
      width: PREVIEW_WIDTH,
      height: PREVIEW_EST_HEIGHT,
    });
  }, [hover]);

  const previewNode =
    enabled && hover && position ? (
      <KanbanCardHoverPreviewPopover
        card={hover.card}
        left={position.left}
        top={position.top}
      />
    ) : null;

  return { onPreviewMove, onPreviewLeave, previewNode };
}
