"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatRuDateTime } from "@/lib/corrections-history";
import {
  formatOrderListAdminMemoHistoryLine,
  ORDER_LIST_ADMIN_MEMO_MAX_LEN,
  type OrderListAdminMemoHistoryRow,
} from "@/lib/order-list-admin-memo";

const PREVIEW_OFFSET = 14;
const PREVIEW_WIDTH = 256;
const POPOVER_WIDTH = 300;
const POPOVER_EST_HEIGHT = 220;

function clampHoverPreviewPosition(x: number, y: number) {
  if (typeof window === "undefined") {
    return { left: x + PREVIEW_OFFSET, top: y + PREVIEW_OFFSET };
  }
  const margin = 8;
  const estHeight = 120;
  return {
    left: Math.max(
      margin,
      Math.min(x + PREVIEW_OFFSET, window.innerWidth - PREVIEW_WIDTH - margin),
    ),
    top: Math.max(
      margin,
      Math.min(y + PREVIEW_OFFSET, window.innerHeight - estHeight - margin),
    ),
  };
}

function clampPopoverPosition(rect: DOMRect) {
  if (typeof window === "undefined") {
    return { left: rect.left, top: rect.bottom + 6 };
  }
  const margin = 8;
  let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  left = Math.max(
    margin,
    Math.min(left, window.innerWidth - POPOVER_WIDTH - margin),
  );
  let top = rect.bottom + 6;
  if (top + POPOVER_EST_HEIGHT > window.innerHeight - margin) {
    top = Math.max(margin, rect.top - POPOVER_EST_HEIGHT - 6);
  }
  return { left, top };
}

type ShiftMemoTone = "amber" | "teal";

const TONE: Record<
  ShiftMemoTone,
  {
    triggerFilled: string;
    triggerEmpty: string;
    preview: string;
    textarea: string;
  }
> = {
  amber: {
    triggerFilled:
      "text-amber-700 dark:text-amber-300/90 border-amber-300/70 bg-amber-50/40 dark:border-amber-700/50 dark:bg-amber-950/25",
    triggerEmpty:
      "text-amber-700 dark:text-amber-300/90 border-transparent hover:border-amber-300/40 hover:bg-amber-50/20 dark:hover:border-amber-800/40 dark:hover:bg-amber-950/15",
    preview: "font-medium text-amber-800 dark:text-amber-200",
    textarea:
      "border-amber-300/70 bg-amber-50/30 text-amber-900 focus:border-amber-400 focus:ring-amber-400/50 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-100",
  },
  teal: {
    triggerFilled:
      "text-teal-700 dark:text-teal-300 border-teal-400/80 bg-teal-50/50 dark:border-teal-700/70 dark:bg-teal-950/40",
    triggerEmpty:
      "text-teal-700 dark:text-teal-400 border-transparent hover:border-teal-400/50 hover:bg-teal-50/25 dark:hover:border-teal-700/50 dark:hover:bg-teal-950/25",
    preview: "font-medium text-teal-800 dark:text-teal-200",
    textarea:
      "border-teal-400/80 bg-teal-50/40 text-teal-950 focus:border-teal-500 focus:ring-teal-400/50 dark:border-teal-700/60 dark:bg-teal-950/30 dark:text-teal-100",
  },
};

/**
 * Пометка смен в строке списка: hover — превью, клик — закреплённая всплывашка с редактированием и историей.
 */
function OrderListShiftMemoCell({
  orderId,
  initialMemo,
  apiSegment,
  title,
  ariaLabel,
  emptyTitle,
  tone,
  canEdit = true,
}: {
  orderId: string;
  initialMemo: string | null;
  apiSegment: "list-admin-memo" | "list-tech-memo";
  title: string;
  ariaLabel: string;
  emptyTitle: string;
  tone: ShiftMemoTone;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [savedMemo, setSavedMemo] = useState(
    () => (initialMemo ?? "").slice(0, ORDER_LIST_ADMIN_MEMO_MAX_LEN),
  );
  const [draft, setDraft] = useState(savedMemo);
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<OrderListAdminMemoHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState<string | null>(null);

  useEffect(() => {
    const next = (initialMemo ?? "").slice(0, ORDER_LIST_ADMIN_MEMO_MAX_LEN);
    setSavedMemo(next);
    if (!open) setDraft(next);
  }, [initialMemo, orderId, open]);

  const hasText = savedMemo.trim().length > 0;
  const memoText = savedMemo.trim();
  const showHoverPreview =
    hasText && !open && hoverPreview != null;
  const previewPos = hoverPreview
    ? clampHoverPreviewPosition(hoverPreview.x, hoverPreview.y)
    : null;

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryErr(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/${apiSegment}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        history?: OrderListAdminMemoHistoryRow[];
        error?: string;
      };
      if (!res.ok) {
        setHistoryErr(data.error ?? "Не удалось загрузить историю");
        return;
      }
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch {
      setHistoryErr("Сеть недоступна");
    } finally {
      setHistoryLoading(false);
    }
  }, [apiSegment, orderId]);

  const openEditor = useCallback(() => {
    if (!canEdit) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraft(savedMemo);
    setErr(null);
    setHistoryOpen(false);
    setPopoverPos(clampPopoverPosition(rect));
    setOpen(true);
    setHoverPreview(null);
  }, [canEdit, savedMemo]);

  const closeEditor = useCallback(() => {
    setOpen(false);
    setHistoryOpen(false);
    setDraft(savedMemo);
    setErr(null);
  }, [savedMemo]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEditor();
    };
    const onPointer = (e: MouseEvent | PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      closeEditor();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer as EventListener);
    };
  }, [open, closeEditor]);

  const persist = useCallback(
    async (nextRaw: string | null) => {
      setSaving(true);
      setErr(null);
      try {
        const res = await fetch(`/api/orders/${orderId}/${apiSegment}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: nextRaw }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          memo?: string | null;
          error?: string;
        };
        if (!res.ok) {
          setErr(data.error ?? "Не сохранено");
          return false;
        }
        const next = (data.memo ?? "").slice(0, ORDER_LIST_ADMIN_MEMO_MAX_LEN);
        setSavedMemo(next);
        setDraft(next);
        closeEditor();
        router.refresh();
        return true;
      } catch {
        setErr("Сеть недоступна");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [apiSegment, closeEditor, orderId, router],
  );

  const onSave = useCallback(() => {
    void persist(draft);
  }, [draft, persist]);

  const onClear = useCallback(() => {
    void persist(null);
  }, [persist]);

  const onMemoHoverMove = useCallback(
    (event: MouseEvent) => {
      if (open || !memoText) {
        setHoverPreview(null);
        return;
      }
      setHoverPreview({ x: event.clientX, y: event.clientY });
    },
    [memoText, open],
  );

  const toggleHistory = useCallback(() => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && history.length === 0 && !historyLoading) {
      void loadHistory();
    }
  }, [history.length, historyLoading, historyOpen, loadHistory]);

  const portalTarget =
    typeof document !== "undefined" ? document.body : null;

  return (
    <>
      <div
        className="group/memo relative mx-auto w-full max-w-[5.25rem]"
        onMouseMove={onMemoHoverMove}
        onMouseLeave={() => setHoverPreview(null)}
      >
        <button
          ref={triggerRef}
          type="button"
          className={[
            "block w-full rounded-md border px-1 py-0.5 text-center text-[10px] font-semibold leading-snug outline-none transition-[border-color,background-color,box-shadow] sm:text-[11px]",
            hasText || open ? TONE[tone].triggerFilled : TONE[tone].triggerEmpty,
            saving ? "opacity-60" : "",
            canEdit ? "" : "cursor-default",
          ].join(" ")}
          title={
            !hasText && !open
              ? emptyTitle
              : !canEdit
                ? title
                : undefined
          }
          aria-label={ariaLabel}
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            if (open) return;
            openEditor();
          }}
        >
          {hasText ? (
            <span className="line-clamp-2 whitespace-pre-wrap break-words">
              {memoText}
            </span>
          ) : canEdit ? (
            <span className="text-[var(--text-muted)] opacity-0 group-hover/memo:opacity-60">
              +
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">—</span>
          )}
        </button>
        {err && !open ? (
          <p className="mt-0.5 truncate text-center text-[9px] text-red-600">
            {err}
          </p>
        ) : null}
      </div>

      {showHoverPreview && previewPos && portalTarget
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[200] w-64 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 text-xs leading-5 text-[var(--text-body)] shadow-xl"
              style={{ left: previewPos.left, top: previewPos.top }}
              role="tooltip"
            >
              <p className={`whitespace-pre-wrap break-words ${TONE[tone].preview}`}>
                {memoText}
              </p>
            </div>,
            portalTarget,
          )
        : null}

      {open && popoverPos && portalTarget
        ? createPortal(
            <div
              ref={popoverRef}
              className="fixed z-[210] w-[min(300px,calc(100vw-1rem))] rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-xl"
              style={{ left: popoverPos.left, top: popoverPos.top }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => e.stopPropagation()}
            >
              <p
                id={titleId}
                className="text-xs font-semibold text-[var(--text-secondary)]"
              >
                {title}
              </p>
              <textarea
                rows={4}
                maxLength={ORDER_LIST_ADMIN_MEMO_MAX_LEN}
                value={draft}
                disabled={saving}
                autoFocus
                className={`mt-2 block w-full resize-none rounded-md border px-2 py-1.5 text-xs font-medium leading-snug outline-none focus:ring-1 ${TONE[tone].textarea}`}
                onChange={(e) => {
                  setErr(null);
                  setDraft(e.target.value.slice(0, ORDER_LIST_ADMIN_MEMO_MAX_LEN));
                }}
              />
              <p className="mt-1 text-right text-[10px] tabular-nums text-[var(--text-muted)]">
                {draft.length}/{ORDER_LIST_ADMIN_MEMO_MAX_LEN}
              </p>
              {err ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {err}
                </p>
              ) : null}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
                    disabled={saving || (!memoText && !draft.trim())}
                    onClick={() => void onClear()}
                  >
                    Очистить
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-[var(--sidebar-blue)] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    disabled={saving}
                    onClick={() => void onSave()}
                  >
                    {saving ? "…" : "Сохранить"}
                  </button>
                </div>
                <div className="relative shrink-0">
                  <button
                    type="button"
                    className="rounded-md border border-[var(--card-border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                    aria-expanded={historyOpen}
                    onClick={() => toggleHistory()}
                  >
                    История
                  </button>
                  {historyOpen ? (
                    <div className="absolute right-0 top-full z-10 mt-1 max-h-48 w-64 overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-lg">
                      {historyLoading ? (
                        <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                          Загрузка…
                        </p>
                      ) : historyErr ? (
                        <p className="px-3 py-2 text-xs text-red-600">{historyErr}</p>
                      ) : history.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                          История пуста
                        </p>
                      ) : (
                        <ul className="divide-y divide-[var(--border-subtle)]">
                          {history.map((row) => (
                            <li
                              key={row.id}
                              className="px-3 py-2 text-[11px] leading-snug text-[var(--text-body)]"
                            >
                              {formatOrderListAdminMemoHistoryLine(row, (iso) =>
                                formatRuDateTime(new Date(iso)),
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </>
  );
}

export function OrderListAdminMemoCell({
  orderId,
  initialMemo,
}: {
  orderId: string;
  initialMemo: string | null;
}) {
  return (
    <OrderListShiftMemoCell
      orderId={orderId}
      initialMemo={initialMemo}
      apiSegment="list-admin-memo"
      title="ПА · пометки админов"
      ariaLabel="Пометки админов"
      emptyTitle="ПА — пометки админов (до 100 символов). Не уходит в наряд и Kaiten."
      tone="amber"
    />
  );
}

export function OrderListTechMemoCell({
  orderId,
  initialMemo,
  canEdit = true,
}: {
  orderId: string;
  initialMemo: string | null;
  canEdit?: boolean;
}) {
  return (
    <OrderListShiftMemoCell
      orderId={orderId}
      initialMemo={initialMemo}
      apiSegment="list-tech-memo"
      title="ПТ · пометки техники"
      ariaLabel="Пометки техники"
      emptyTitle="ПТ — пометки техники (до 100 символов). Не уходит в наряд и Kaiten."
      tone="teal"
      canEdit={canEdit}
    />
  );
}
