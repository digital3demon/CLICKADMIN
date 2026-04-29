"use client";

import { useCallback, useMemo, useState } from "react";
import {
  groupPriceListItems,
  type PriceListGroupItem,
} from "@/lib/price-list-grouping";

/** Сетка: код | название | цена | срок — одинаковая для шапки и строк */
const ROW_GRID =
  "grid w-full grid-cols-[3.75rem_minmax(0,1fr)_6.25rem_3.25rem] items-center gap-x-2 sm:grid-cols-[4.25rem_minmax(0,1fr)_7.25rem_3.75rem] sm:gap-x-3";

function PriceTableHeader() {
  return (
    <div
      className={`${ROW_GRID} border-b border-[var(--card-border)] bg-[var(--surface-muted)] py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] sm:text-xs`}
      role="row"
    >
      <span className="pl-1">Код</span>
      <span>Наименование</span>
      <span className="text-right tabular-nums">Цена</span>
      <span className="text-center">Срок</span>
    </div>
  );
}

/** Отступ всплывашки от курсора (px): правее и ниже, чтобы не перекрывать указатель */
const CURSOR_OFFSET_X = 14;
const CURSOR_OFFSET_Y = 18;

function formatPriceItemForClipboard(it: PriceListGroupItem): string {
  const d = it.description?.trim();
  const lines = [
    `Код: ${it.code}`,
    `Наименование: ${it.name}`,
    `Описание: ${d ? d : "—"}`,
    `Цена: ${it.priceRub.toLocaleString("ru-RU")} ₽`,
  ];
  lines.push(
    `Срок: ${it.leadWorkingDays != null ? `${it.leadWorkingDays} р.д.` : "—"}`,
  );
  return lines.join("\n");
}


async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("aria-hidden", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function CodeCopyTrigger({
  it,
  className,
}: {
  it: PriceListGroupItem;
  className?: string;
}) {
  return (
    <span
      className={
        className ??
        "cursor-copy rounded px-1 py-0.5 font-mono text-xs text-[var(--text-body)] underline decoration-[var(--text-muted)] decoration-dotted underline-offset-2 hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)] sm:text-sm"
      }
      title="Скопировать код, название, описание, цену и срок"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void copyTextToClipboard(formatPriceItemForClipboard(it));
      }}
    >
      {it.code}
    </span>
  );
}

function PriceTableRows({
  items,
  onPick,
  onDescribeEnter,
  onDescribeMove,
  onDescribeLeave,
  onDescribeFocusAnchor,
}: {
  items: PriceListGroupItem[];
  onPick?: (it: PriceListGroupItem) => void;
  onDescribeEnter: (id: string, text: string, clientX: number, clientY: number) => void;
  onDescribeMove: (id: string, clientX: number, clientY: number) => void;
  onDescribeLeave: () => void;
  onDescribeFocusAnchor: (id: string, text: string, anchor: HTMLElement) => void;
}) {
  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {items.map((it) => {
        const desc = it.description?.trim() ?? "";
        const hasDesc = desc.length > 0;
        const rowClass = `${ROW_GRID} py-1.5 text-sm sm:py-2`;

        const cells = (
          <>
            <span className="pl-1">
              <CodeCopyTrigger it={it} />
            </span>
            <span
              className="min-w-0 truncate text-[var(--app-text)]"
              title={hasDesc ? undefined : it.name}
            >
              {it.name}
              {it.isIndividualPrice ? (
                <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950">
                  Индивидуальная цена
                </span>
              ) : null}
            </span>
            <span className="text-right tabular-nums text-[var(--text-strong)]">
              {it.priceRub.toLocaleString("ru-RU")} ₽
            </span>
            <span className="text-center tabular-nums text-[var(--text-secondary)]">
              {it.leadWorkingDays != null ? `${it.leadWorkingDays} р.д.` : "—"}
            </span>
          </>
        );

        const handlers = hasDesc
          ? {
              onMouseEnter: (e: React.MouseEvent<HTMLElement>) =>
                onDescribeEnter(
                  it.id,
                  desc,
                  e.clientX + CURSOR_OFFSET_X,
                  e.clientY + CURSOR_OFFSET_Y,
                ),
              onMouseMove: (e: React.MouseEvent<HTMLElement>) =>
                onDescribeMove(
                  it.id,
                  e.clientX + CURSOR_OFFSET_X,
                  e.clientY + CURSOR_OFFSET_Y,
                ),
              onMouseLeave: onDescribeLeave,
              onFocus: (e: React.FocusEvent<HTMLElement>) =>
                onDescribeFocusAnchor(it.id, desc, e.currentTarget),
              onBlur: onDescribeLeave,
            }
          : {};

        if (onPick) {
          return (
            <button
              key={it.id}
              type="button"
              role="row"
              className={`${rowClass} rounded-md text-left transition-colors hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-blue)]`}
              onClick={() => onPick(it)}
              {...handlers}
            >
              {cells}
            </button>
          );
        }

        return (
          <div
            key={it.id}
            role="row"
            className={`${rowClass} rounded-md`}
            {...handlers}
          >
            {cells}
          </div>
        );
      })}
    </div>
  );
}

function SubsectionBlock({
  subsectionLabel,
  items,
  onPick,
  onDescribeEnter,
  onDescribeMove,
  onDescribeLeave,
  onDescribeFocusAnchor,
}: {
  subsectionLabel: string;
  items: PriceListGroupItem[];
  onPick?: (it: PriceListGroupItem) => void;
  onDescribeEnter: (id: string, text: string, clientX: number, clientY: number) => void;
  onDescribeMove: (id: string, clientX: number, clientY: number) => void;
  onDescribeLeave: () => void;
  onDescribeFocusAnchor: (id: string, text: string, anchor: HTMLElement) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
      <h4 className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        {subsectionLabel}
      </h4>
      <PriceTableHeader />
      <PriceTableRows
        items={items}
        onPick={onPick}
        onDescribeEnter={onDescribeEnter}
        onDescribeMove={onDescribeMove}
        onDescribeLeave={onDescribeLeave}
        onDescribeFocusAnchor={onDescribeFocusAnchor}
      />
    </div>
  );
}

type TooltipState = {
  id: string;
  text: string;
  x: number;
  y: number;
};

export function PriceListTabbedBody({
  items,
  onPick,
}: {
  items: PriceListGroupItem[];
  onPick?: (it: PriceListGroupItem) => void;
}) {
  const groups = useMemo(() => groupPriceListItems(items), [items]);
  const [tip, setTip] = useState<TooltipState | null>(null);

  const describeEnter = useCallback(
    (id: string, text: string, x: number, y: number) => {
      setTip({ id, text, x, y });
    },
    [],
  );

  const describeMove = useCallback((id: string, x: number, y: number) => {
    setTip((prev) =>
      prev && prev.id === id ? { ...prev, x, y } : prev,
    );
  }, []);

  const describeFocusAnchor = useCallback(
    (id: string, text: string, anchor: HTMLElement) => {
      const r = anchor.getBoundingClientRect();
      setTip({
        id,
        text,
        x: r.left + CURSOR_OFFSET_X,
        y: r.bottom + 6,
      });
    },
    [],
  );

  const hideDescribe = useCallback(() => setTip(null), []);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {tip ? (
        <div
          className="pointer-events-none fixed z-[200] max-h-48 max-w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs leading-snug text-[var(--text-body)] shadow-xl"
          style={{
            left: tip.x,
            top: tip.y,
          }}
          role="tooltip"
        >
          {tip.text}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-6 pr-1">
          {groups.map((g) => (
            <section key={g.sectionKey}>
              <h3 className="mb-3 border-b border-[var(--card-border)] pb-1 text-sm font-semibold text-[var(--app-text)]">
                {g.sectionLabel}
              </h3>
              <div className="space-y-4">
                {g.subsections.map((sub) => (
                  <SubsectionBlock
                    key={sub.subsectionKey}
                    subsectionLabel={sub.subsectionLabel}
                    items={sub.items}
                    onPick={onPick}
                    onDescribeEnter={describeEnter}
                    onDescribeMove={describeMove}
                    onDescribeLeave={hideDescribe}
                    onDescribeFocusAnchor={describeFocusAnchor}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
