"use client";

import { useEffect, useMemo, useState } from "react";
import type { KanbanCard } from "@/lib/kanban/types";
import {
  formatKanbanTimerCountdown,
  kanbanCardTimerDisplayNowMs,
  kanbanCardTimerElapsedRatio,
  kanbanCardTimerRemainingMs,
  kanbanCardTimerTrackFillColor,
} from "@/lib/kanban/kanban-card-timer";

function timerPiePath(ratio: number): string | null {
  const r = Math.min(1, Math.max(0, ratio));
  if (r <= 0) return null;
  if (r >= 0.999) {
    return "M12 12 m0 -6.5 a6.5 6.5 0 1 1 0 13 a6.5 6.5 0 1 1 0 -13";
  }
  const cx = 12;
  const cy = 12;
  const radius = 6.5;
  const angle = r * Math.PI * 2 - Math.PI / 2;
  const x = cx + radius * Math.cos(angle);
  const y = cy + radius * Math.sin(angle);
  const largeArc = r > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${cx} ${cy - radius} A ${radius} ${radius} 0 ${largeArc} 1 ${x} ${y} Z`;
}

export function KanbanTimerIcon({
  card,
  className,
  sizeClassName = "h-5 w-5",
}: {
  card: Pick<
    KanbanCard,
    "timerStartedAt" | "timerDurationMs" | "timerFrozenAt"
  >;
  className?: string;
  sizeClassName?: string;
}) {
  const started = Boolean(
    card.timerStartedAt &&
      card.timerDurationMs != null &&
      Number.isFinite(card.timerDurationMs) &&
      card.timerDurationMs > 0,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!started || card.timerFrozenAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [started, card.timerFrozenAt]);

  const displayNow = useMemo(
    () => kanbanCardTimerDisplayNowMs(card.timerFrozenAt, now),
    [card.timerFrozenAt, now],
  );
  const ratio = useMemo(
    () =>
      kanbanCardTimerElapsedRatio(
        card.timerStartedAt,
        card.timerDurationMs,
        displayNow,
      ),
    [card.timerStartedAt, card.timerDurationMs, displayNow],
  );
  const remaining = useMemo(
    () =>
      kanbanCardTimerRemainingMs(
        card.timerStartedAt,
        card.timerDurationMs,
        displayNow,
      ),
    [card.timerStartedAt, card.timerDurationMs, displayNow],
  );

  if (!started) return null;

  const color = kanbanCardTimerTrackFillColor(ratio);
  const label = formatKanbanTimerCountdown(remaining);
  const piePath = timerPiePath(ratio);

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ color }}
      title={`Таймер: ${label}`}
      aria-label={`Таймер: ${label}`}
    >
      <svg
        className={sizeClassName}
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path
          d="M8.5 2.8h7"
          stroke="currentColor"
          strokeWidth="2.8"
        />
        <path
          d="M12 2.8v2"
          stroke="currentColor"
          strokeWidth="2.8"
        />
        <path
          d="M5.3 5.2 3.8 3.7"
          stroke="currentColor"
          strokeWidth="2.3"
        />
        <path
          d="m18.7 5.2 1.5-1.5"
          stroke="currentColor"
          strokeWidth="2.3"
        />
        <circle
          cx="12"
          cy="12"
          r="8.4"
          stroke="currentColor"
          strokeWidth="2.8"
        />
        {piePath ? (
          <path
            d={piePath}
            fill="currentColor"
            className="transition-[d,fill] duration-700 ease-linear"
            opacity="0.82"
          />
        ) : null}
      </svg>
    </span>
  );
}
