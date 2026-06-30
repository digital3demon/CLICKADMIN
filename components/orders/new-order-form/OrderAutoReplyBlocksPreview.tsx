"use client";

import { useEffect, useRef } from "react";

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
};

export function OrderAutoReplyBlocksPreview({
  html,
  editableBlockIds,
  disabled,
  onTextOverride,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const focusedBlockRef = useRef<string | null>(null);
  const onTextOverrideRef = useRef(onTextOverride);
  onTextOverrideRef.current = onTextOverride;

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

    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    return () => {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
    };
  }, [editableBlockIds]);

  return (
    <div
      ref={rootRef}
      className="min-h-[12rem] w-full overflow-y-auto rounded-md border border-[var(--input-border)] bg-[#f3f4f6] px-1 py-2 text-sm leading-relaxed text-gray-900 [&_a]:pointer-events-none [&_a]:cursor-default"
      aria-label="Предпросмотр ответного письма"
    />
  );
}
