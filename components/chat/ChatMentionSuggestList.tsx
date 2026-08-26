"use client";

import { useEffect, useRef } from "react";

export type ChatMentionSuggestItem = {
  id: string;
  label: string;
  insertText: string;
};

/** Высота как раньше (~8 строк), без роста панели — остальное колесом. */
export const CHAT_MENTION_SUGGEST_LIST_CLASS =
  "max-h-56 overflow-y-auto overflow-x-hidden overscroll-contain";

export function ChatMentionSuggestList<T extends ChatMentionSuggestItem>({
  items,
  activeIndex,
  onPick,
  tone,
  className,
}: {
  items: readonly T[];
  activeIndex: number;
  onPick: (item: T) => void;
  tone: "crm" | "kanban";
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const el = root.querySelector(`[data-mention-idx="${activeIndex}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (items.length === 0) return null;

  const shell =
    tone === "kanban"
      ? "border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)]"
      : "border-[var(--input-border)] bg-[var(--card-bg)]";

  return (
    <div
      ref={listRef}
      role="listbox"
      className={`absolute bottom-[calc(100%+4px)] z-20 rounded-md border p-1 shadow-xl ${CHAT_MENTION_SUGGEST_LIST_CLASS} ${shell} ${className ?? "left-0 right-0"}`}
    >
      {items.map((item, idx) => {
        const active = idx === activeIndex;
        const rowTone =
          tone === "kanban"
            ? active
              ? "bg-[var(--kaiten-modal-control)] text-[var(--kaiten-accent)]"
              : "text-[var(--kaiten-modal-text)] hover:bg-[var(--kaiten-modal-control)]"
            : active
              ? "bg-[var(--surface-subtle)] text-[var(--sidebar-blue)]"
              : "text-[var(--app-text)] hover:bg-[var(--surface-subtle)]";
        const handleTone =
          tone === "kanban"
            ? "text-[var(--kaiten-modal-muted)]"
            : "text-[var(--text-muted)]";
        return (
          <button
            key={`${item.id}-${item.insertText}`}
            type="button"
            role="option"
            aria-selected={active}
            data-mention-idx={idx}
            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[0.78rem] ${rowTone}`}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(item);
            }}
          >
            <span className="truncate">{item.label}</span>
            <span className={`ml-3 shrink-0 text-[0.72rem] ${handleTone}`}>
              {item.insertText}
            </span>
          </button>
        );
      })}
    </div>
  );
}
