"use client";

import type { KanbanCard } from "@/lib/kanban/types";
import {
  clampKanbanHoverPreviewPosition,
  kanbanCardHoverPreviewBlockReason,
  kanbanCardHoverPreviewBody,
  kanbanCardHoverPreviewFooterLines,
} from "@/lib/kanban/kanban-card-hover-preview";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";

const PREVIEW_WIDTH = 288;
const PREVIEW_EST_HEIGHT = 220;

/** Desktop-only: на touch/coarse pointer hover-preview ломает клик по карточке. */
function useFinePointerHover(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setOk(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return ok;
}

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
  const blockReason = kanbanCardHoverPreviewBlockReason(card);
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
      {blockReason ? (
        <div className="mt-2 rounded-md border border-red-900/45 bg-gradient-to-b from-red-950/50 to-red-950/30 px-2 py-1.5">
          <p className="text-[0.625rem] font-bold uppercase tracking-wide text-red-400">
            Причина блокировки
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-[0.75rem] font-medium leading-snug text-red-100">
            {blockReason}
          </p>
        </div>
      ) : null}
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
  const finePointer = useFinePointerHover();
  const active = enabled && finePointer;
  const [hover, setHover] = useState<{
    card: KanbanCard;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!active) setHover(null);
  }, [active]);

  const onPreviewMove = useCallback(
    (card: KanbanCard, event: ReactMouseEvent) => {
      if (!active) return;
      setHover({ card, x: event.clientX, y: event.clientY });
    },
    [active],
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
    active && hover && position && typeof document !== "undefined"
      ? createPortal(
          <KanbanCardHoverPreviewPopover
            card={hover.card}
            left={position.left}
            top={position.top}
          />,
          document.body,
        )
      : null;

  return { onPreviewMove, onPreviewLeave, previewNode };
}
