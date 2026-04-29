"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  OrderEditBlockId,
  OrderEditLayoutV1,
  OrderEditRowKey,
} from "@/lib/order-edit-layout-prefs";
import {
  findBlockRow,
  moveBlockToRow,
  resizeBetweenBlocks,
  setBlockColor,
} from "@/lib/order-edit-layout-prefs";

const ROW_KEYS: OrderEditRowKey[] = ["row1", "row2", "row3", "row4"];

function rowGapClass(rowKey: OrderEditRowKey): string {
  return rowKey === "row1" || rowKey === "row2"
    ? "gap-3 xl:gap-3"
    : "gap-3 xl:gap-x-5";
}

export function OrderEditCustomizeToggle({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="кастомизировать"
      aria-pressed={active}
      className={
        active
          ? "inline-flex items-center justify-center rounded-md border border-sky-400 bg-sky-500/15 p-2 text-sky-700 shadow-sm dark:text-sky-200"
          : "inline-flex items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] p-2 text-[var(--text-body)] shadow-sm hover:bg-[var(--card-bg)]"
      }
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" />
        <path d="M9 8c-2.8 2.8-5 6-5 9a3 3 0 0 0 3 3c3 0 6.2-2.2 9-5" />
      </svg>
      <span className="sr-only">кастомизировать</span>
    </button>
  );
}

type Props = {
  layout: OrderEditLayoutV1;
  onLayoutChange: (next: OrderEditLayoutV1) => void;
  customizeMode: boolean;
  blocks: Record<OrderEditBlockId, ReactNode>;
};

export function OrderEditPageLayoutGrid({
  layout,
  onLayoutChange,
  customizeMode,
  blocks,
}: Props) {
  const [xlUp, setXlUp] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setXlUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const dragRef = useRef<{
    id: OrderEditBlockId;
    fromRow: OrderEditRowKey;
  } | null>(null);

  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const resizeSessionRef = useRef<{
    rowKey: OrderEditRowKey;
    leftId: OrderEditBlockId;
    startX: number;
    acc: number;
  } | null>(null);
  const resizeCleanRef = useRef<(() => void) | null>(null);

  const onDragStart = useCallback(
    (e: React.DragEvent, id: OrderEditBlockId) => {
      if (!customizeMode) {
        e.preventDefault();
        return;
      }
      const row = findBlockRow(layout, id);
      if (!row) return;
      dragRef.current = { id, fromRow: row };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    },
    [customizeMode, layout],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDropOnCell = useCallback(
    (
      e: React.DragEvent,
      targetRow: OrderEditRowKey,
      beforeId: OrderEditBlockId | null,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      const from = dragRef.current;
      dragRef.current = null;
      if (!from) return;
      if (beforeId === from.id) return;
      const next = moveBlockToRow(
        layout,
        from.fromRow,
        targetRow,
        from.id,
        beforeId,
      );
      onLayoutChange(next);
    },
    [layout, onLayoutChange],
  );

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent, rowKey: OrderEditRowKey, leftId: OrderEditBlockId) => {
      if (!customizeMode) return;
      e.preventDefault();
      e.stopPropagation();
      resizeCleanRef.current?.();
      resizeSessionRef.current = {
        rowKey,
        leftId,
        startX: e.clientX,
        acc: 0,
      };
      const onMove = (ev: PointerEvent) => {
        const s = resizeSessionRef.current;
        if (!s) return;
        const rowEl = document.querySelector(
          `[data-order-layout-row="${s.rowKey}"]`,
        ) as HTMLElement | null;
        const w = rowEl?.getBoundingClientRect().width ?? 0;
        const colW = w > 0 ? w / 12 : 80;
        const dx = ev.clientX - s.startX;
        const deltaCols = Math.round((dx - s.acc) / colW);
        if (deltaCols === 0) return;
        const cur = layoutRef.current;
        const next = resizeBetweenBlocks(cur, s.rowKey, s.leftId, deltaCols);
        if (next === cur) return;
        onLayoutChange(next);
        s.startX += deltaCols * colW;
        s.acc += deltaCols * colW;
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        resizeSessionRef.current = null;
        resizeCleanRef.current = null;
      };
      resizeCleanRef.current = onUp;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [customizeMode, onLayoutChange],
  );

  useEffect(
    () => () => {
      resizeCleanRef.current?.();
    },
    [],
  );

  return (
    <div className="max-w-full min-w-0 space-y-3 xl:space-y-5">
      {customizeMode ? (
        <div className="rounded-md border border-dashed border-sky-400/60 bg-sky-500/5 px-3 py-2 text-xs text-[var(--text-body)]">
          Режим кастомизации: перетащите блок за ручку «⋮⋮»; границу между блоками
          тяните на десктопе (ширина экрана xl+); цвет фона — в палитре у блока.
        </div>
      ) : null}
      {ROW_KEYS.map((rowKey) => {
        const row = layout[rowKey];
        return (
          <div
            key={rowKey}
            data-order-layout-row={rowKey}
            className={`grid grid-cols-1 ${rowGapClass(rowKey)} xl:grid-cols-12 xl:items-stretch`}
            onDragOver={customizeMode ? onDragOver : undefined}
            onDrop={
              customizeMode
                ? (ev) => onDropOnCell(ev, rowKey, null)
                : undefined
            }
          >
            {row.map((cell, idx) => {
              const bg = layout.blockColors[cell.id];
              const ring = customizeMode
                ? "ring-1 ring-sky-400/40 ring-offset-1 ring-offset-[var(--card-bg)]"
                : "";
              return (
                <div
                  key={cell.id}
                  className={`relative min-w-0 min-h-0 flex flex-col ${ring}`}
                  style={
                    xlUp
                      ? {
                          gridColumn: `span ${cell.span} / span ${cell.span}`,
                        }
                      : undefined
                  }
                  onDragOver={customizeMode ? onDragOver : undefined}
                  onDrop={
                    customizeMode
                      ? (ev) => onDropOnCell(ev, rowKey, cell.id)
                      : undefined
                  }
                >
                  {customizeMode ? (
                    <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-[var(--card-border)] pb-2">
                      <span
                        draggable
                        onDragStart={(ev) => onDragStart(ev, cell.id)}
                        className="cursor-grab select-none rounded border border-[var(--card-border)] bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] active:cursor-grabbing"
                        title="Перетащить блок"
                      >
                        ⋮⋮
                      </span>
                      <label className="flex flex-wrap items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                        <span>Фон</span>
                        <input
                          type="color"
                          value={layout.blockColors[cell.id] ?? "#f8fafc"}
                          onChange={(ev) =>
                            onLayoutChange(
                              setBlockColor(layout, cell.id, ev.target.value),
                            )
                          }
                          className="h-6 w-8 cursor-pointer rounded border border-[var(--input-border)] bg-transparent p-0"
                        />
                        <button
                          type="button"
                          className="rounded border border-[var(--card-border)] px-1.5 py-0.5 hover:bg-[var(--surface-muted)]"
                          onClick={() =>
                            onLayoutChange(setBlockColor(layout, cell.id, null))
                          }
                        >
                          Сброс
                        </button>
                      </label>
                    </div>
                  ) : null}
                  <div
                    className={`min-h-0 min-w-0 flex-1 ${bg ? "rounded-md p-1" : ""}`}
                    style={bg ? { backgroundColor: bg } : undefined}
                  >
                    {blocks[cell.id]}
                  </div>
                  {customizeMode && xlUp && idx < row.length - 1 ? (
                    <div
                      role="separator"
                      aria-label="Изменить ширину границы между блоками"
                      className="absolute right-0 top-8 bottom-2 z-20 w-3 translate-x-1/2 cursor-col-resize"
                      onPointerDown={(ev) =>
                        onResizePointerDown(ev, rowKey, cell.id)
                      }
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
