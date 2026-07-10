"use client";

import { useState } from "react";
import {
  buildCorrectionHistoryStatusTimeline,
  formatCorrectionHistoryDecision,
  formatCorrectionHistoryStatusEventDetail,
  type CorrectionHistoryRow,
} from "@/lib/corrections-history";

function decisionClass(
  status: "pending" | "accepted" | "rejected" | "arrived",
): string {
  if (status === "arrived") {
    return "text-emerald-800 dark:text-emerald-200";
  }
  if (status === "accepted") {
    return "text-emerald-800 dark:text-emerald-200";
  }
  if (status === "rejected") {
    return "text-rose-800 dark:text-rose-200";
  }
  return "text-amber-800 dark:text-amber-200";
}

export function CorrectionHistoryStatusCell({
  row,
}: {
  row: CorrectionHistoryRow;
}) {
  const [open, setOpen] = useState(false);
  const decision = formatCorrectionHistoryDecision(row);
  const timeline = buildCorrectionHistoryStatusTimeline(row);
  const currentKey = `${decision.status}:${timeline.at(-1)?.at.toISOString() ?? ""}`;

  return (
    <div className="min-w-0">
      <button
        type="button"
        className={`inline-flex max-w-full items-center gap-1 rounded-md px-1 py-0.5 text-left font-medium hover:bg-[var(--surface-muted)] ${decisionClass(decision.status)}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{decision.label}</span>
        <span
          className="shrink-0 text-[0.65rem] text-[var(--text-muted)]"
          aria-hidden
        >
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <ul className="mt-2 space-y-1.5 border-l-2 border-[var(--card-border)] pl-2.5">
          {timeline.map((event) => {
            const key = `${event.status}:${event.at.toISOString()}`;
            const isCurrent = key === currentKey;
            return (
              <li
                key={key}
                className={`text-xs leading-snug ${isCurrent ? "font-semibold" : "text-[var(--text-secondary)]"}`}
              >
                <span className={decisionClass(event.status)}>{event.label}</span>
                <span className="mt-0.5 block whitespace-normal break-words text-[var(--text-muted)]">
                  {formatCorrectionHistoryStatusEventDetail(event)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
