"use client";

import { useEffect, useRef } from "react";
import type { ReplyDatePlaceholderKey } from "@/lib/mail/reply-preflight-date-placeholders";

function extractCellPlainText(cell: HTMLElement): string {
  const ps = cell.querySelectorAll("p");
  if (ps.length > 0) {
    return Array.from(ps)
      .map((p) => p.textContent?.trim() ?? "")
      .filter(Boolean)
      .join("\n\n");
  }
  return (cell.textContent ?? "").trim();
}

type Props = {
  html: string;
  editableBlockIds: string[];
  disabled: boolean;
  onTextOverride: (blockId: string, text: string) => void;
  onInlineDateClick?: (
    key: ReplyDatePlaceholderKey,
    anchorRect: DOMRect,
  ) => void;
};

export function OrderAutoReplyBlocksPreview({
  html,
  editableBlockIds,
  disabled,
  onTextOverride,
  onInlineDateClick,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const focusedBlockRef = useRef<string | null>(null);
  const onTextOverrideRef = useRef(onTextOverride);
  const onInlineDateClickRef = useRef(onInlineDateClick);
  onTextOverrideRef.current = onTextOverride;
  onInlineDateClickRef.current = onInlineDateClick;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const focusedId = focusedBlockRef.current;
    let focusedHtml = "";
    if (focusedId) {
      focusedHtml =
        root.querySelector(`[data-reply-block-id="${focusedId}"] td`)?.innerHTML ?? "";
    }

    root.innerHTML = html;

    root.querySelectorAll("tr[data-reply-block-id]").forEach((row) => {
      const blockId = row.getAttribute("data-reply-block-id");
      if (!blockId) return;
      const td = row.querySelector("td");
      if (!td) return;
      const rowEl = row as HTMLElement;
      const tdEl = td as HTMLElement;
      const editable = editableBlockIds.includes(blockId);

      if (editable) {
        tdEl.contentEditable = disabled ? "false" : "true";
        tdEl.tabIndex = disabled ? -1 : 0;
        tdEl.className = [
          tdEl.className,
          "outline-none focus:ring-2 focus:ring-[var(--sidebar-blue)] focus:ring-inset",
        ]
          .filter(Boolean)
          .join(" ");
        if (focusedId === blockId && focusedHtml) {
          tdEl.innerHTML = focusedHtml;
        }
      } else {
        rowEl.style.pointerEvents = "none";
        rowEl.style.userSelect = "none";
      }
    });

    root.querySelectorAll(".reply-inline-date-pick").forEach((el) => {
      const span = el as HTMLElement;
      span.style.pointerEvents = disabled ? "none" : "auto";
      span.style.userSelect = "none";
    });
  }, [html, editableBlockIds, disabled]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onFocusIn = (e: FocusEvent) => {
      const td = (e.target as HTMLElement | null)?.closest?.("td");
      const row = td?.closest?.("[data-reply-block-id]");
      const blockId = row?.getAttribute("data-reply-block-id");
      if (blockId && editableBlockIds.includes(blockId)) {
        focusedBlockRef.current = blockId;
      }
    };

    const onFocusOut = (e: FocusEvent) => {
      const td = (e.target as HTMLElement | null)?.closest?.("td");
      const row = td?.closest?.("[data-reply-block-id]");
      const blockId = row?.getAttribute("data-reply-block-id");
      if (!blockId || !editableBlockIds.includes(blockId) || !td) return;
      const next = e.relatedTarget as Node | null;
      if (next && root.contains(next)) return;
      focusedBlockRef.current = null;
      onTextOverrideRef.current(blockId, extractCellPlainText(td as HTMLElement));
    };

    const openInlineDatePicker = (e: MouseEvent) => {
      if (disabled) return;
      const span = (e.target as HTMLElement | null)?.closest?.(
        "[data-reply-date-key]",
      ) as HTMLElement | null;
      if (!span) return;
      const key = span.getAttribute("data-reply-date-key") as ReplyDatePlaceholderKey | null;
      if (!key) return;
      e.preventDefault();
      e.stopPropagation();
      onInlineDateClickRef.current?.(key, span.getBoundingClientRect());
    };

    const onMouseDown = (e: MouseEvent) => {
      openInlineDatePicker(e);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      const span = (e.target as HTMLElement | null)?.closest?.(
        "[data-reply-date-key]",
      ) as HTMLElement | null;
      if (!span) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      const key = span.getAttribute("data-reply-date-key") as ReplyDatePlaceholderKey | null;
      if (!key) return;
      e.preventDefault();
      onInlineDateClickRef.current?.(key, span.getBoundingClientRect());
    };

    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    root.addEventListener("mousedown", onMouseDown);
    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("mousedown", onMouseDown);
      root.removeEventListener("keydown", onKeyDown);
    };
  }, [editableBlockIds, disabled]);

  return (
    <div
      ref={rootRef}
      className="min-h-[12rem] w-full overflow-y-auto rounded-md border border-[var(--input-border)] bg-[#f3f4f6] px-1 py-2 text-sm leading-relaxed text-gray-900 [&_.reply-inline-date-pick]:pointer-events-auto [&_a]:pointer-events-none [&_a]:cursor-default"
      aria-label="Предпросмотр ответного письма"
    />
  );
}
