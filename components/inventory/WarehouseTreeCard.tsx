"use client";

import type React from "react";

export type WarehouseTreeCardLevel =
  | "warehouse"
  | "manufacturer"
  | "article"
  | "group";

const LEVEL_DIMENSIONS: Record<
  WarehouseTreeCardLevel,
  { width: number; height: number; tierLabel: string }
> = {
  warehouse: { width: 221, height: 312, tierLabel: "Склад" },
  manufacturer: { width: 187, height: 264, tierLabel: "Производитель" },
  article: { width: 170, height: 240, tierLabel: "Артикул" },
  group: { width: 187, height: 264, tierLabel: "Группа" },
};

/** Портретное соотношение сторон (width / height = 1000 / 1414). */
const LEVEL_ACCENT: Record<WarehouseTreeCardLevel, string> = {
  warehouse: "#0ea5e9",
  manufacturer: "#f59e0b",
  article: "#64748b",
  group: "#8b5cf6",
};

function levelRingClass(
  level: WarehouseTreeCardLevel,
  highlighted?: boolean,
): string {
  if (!highlighted) {
    return "ring-1 ring-[var(--card-border)]";
  }
  if (level === "manufacturer") {
    return "ring-2 ring-amber-400/90 dark:ring-amber-400/80";
  }
  return "ring-2 ring-sky-400/90 dark:ring-sky-500/70";
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M5 12h14" />
    </svg>
  );
}

type CardChromeProps = {
  level: WarehouseTreeCardLevel;
  highlighted?: boolean;
  dimmed?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  role?: React.AriaRole;
  tabIndex?: number;
  "aria-expanded"?: boolean;
};

function CardChrome({
  level,
  highlighted,
  dimmed,
  children,
  onClick,
  role,
  tabIndex,
  "aria-expanded": ariaExpanded,
}: CardChromeProps) {
  const { width, height } = LEVEL_DIMENSIONS[level];

  return (
    <div
      className={`relative shrink-0 rounded-[9px] p-[2px] transition-opacity ${levelRingClass(level, highlighted)} ${
        dimmed ? "opacity-50" : "opacity-100"
      }`}
      style={{ width, height }}
    >
      <article
        role={role}
        tabIndex={tabIndex}
        aria-expanded={ariaExpanded}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[7px] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)] ${
          onClick
            ? "cursor-pointer hover:border-[color-mix(in_srgb,var(--sidebar-blue)_35%,var(--card-border))] hover:shadow-[0_4px_14px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            : ""
        }`}
      >
        {children}
      </article>
    </div>
  );
}

/** Крупно, но без скролла: чем больше строк метрик, тем плотнее кегль. */
function cardTypeScale(metricCount: number): {
  titlePx: number;
  labelPx: number;
  valuePx: number;
  rowGapPx: number;
} {
  if (metricCount <= 1) {
    return { titlePx: 18, labelPx: 13, valuePx: 22, rowGapPx: 10 };
  }
  if (metricCount === 2) {
    return { titlePx: 16, labelPx: 12, valuePx: 18, rowGapPx: 8 };
  }
  return { titlePx: 15, labelPx: 11, valuePx: 15, rowGapPx: 4 };
}

function StockActionButton({
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--app-text)] shadow-sm transition-colors hover:border-[var(--sidebar-blue)] hover:bg-[var(--card-bg)] hover:text-[var(--sidebar-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80"
    >
      {children}
    </button>
  );
}

export function WarehouseTreeCard(props: {
  level: WarehouseTreeCardLevel;
  title: string;
  highlighted?: boolean;
  metrics: { label: string; value: string }[];
  expanded?: boolean;
  dimmed?: boolean;
  onOpen?: () => void;
  onRename?: (e: React.MouseEvent) => void;
  onPlus: (e: React.MouseEvent) => void;
  onMinus: (e: React.MouseEvent) => void;
  /** Переключатель Группы / Производители (склад) или Группы / Артикулы. */
  modeToggle?: { label: string; onClick: (e: React.MouseEvent) => void };
  /** Мультивыбор групп на производителе или артикуле. */
  onGroups?: (e: React.MouseEvent) => void;
}): React.ReactElement {
  const {
    level,
    title,
    highlighted,
    metrics,
    expanded,
    dimmed,
    onOpen,
    onRename,
    onPlus,
    onMinus,
    modeToggle,
    onGroups,
  } = props;
  const { tierLabel } = LEVEL_DIMENSIONS[level];
  const accent = LEVEL_ACCENT[level];
  const type = cardTypeScale(metrics.length);

  return (
    <CardChrome
      level={level}
      highlighted={highlighted}
      dimmed={dimmed}
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-expanded={expanded}
    >
      <div
        className="flex shrink-0 items-center gap-1 px-2.5 py-2"
        style={{
          color: `color-mix(in srgb, ${accent} 92%, white)`,
          background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 42%, var(--card-bg)) 0%, color-mix(in srgb, ${accent} 18%, var(--card-bg)) 100%)`,
        }}
      >
        <span className="min-w-0 flex-1 truncate text-[12px] font-bold uppercase tracking-wide">
          {tierLabel}
        </span>
        {expanded !== undefined ? (
          <span
            className="shrink-0 text-[13px] text-[var(--text-muted)]"
            aria-hidden
          >
            {expanded ? "▾" : "▸"}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2.5 pb-2.5 pt-2">
        <div className="flex min-w-0 shrink-0 items-start gap-1">
          <h3
            className="line-clamp-3 min-w-0 flex-1 break-words font-bold leading-snug text-[var(--app-text)]"
            style={{ fontSize: type.titlePx }}
            title={title}
          >
            {title}
          </h3>
          {onRename ? (
            <button
              type="button"
              aria-label="Переименовать"
              title="Переименовать"
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--sidebar-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80"
              onClick={(e) => {
                e.stopPropagation();
                onRename(e);
              }}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <dl
          className="mt-2 flex min-h-0 flex-1 flex-col justify-evenly overflow-hidden"
          style={{ gap: type.rowGapPx }}
        >
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 shrink">
              <dt
                className="truncate font-medium leading-tight text-[var(--text-muted)]"
                style={{ fontSize: type.labelPx }}
              >
                {metric.label}
              </dt>
              <dd
                className="truncate font-semibold leading-tight text-[var(--app-text)]"
                style={{ fontSize: type.valuePx }}
              >
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto flex items-center justify-between gap-1.5 pt-2">
          <StockActionButton ariaLabel="Приход" onClick={onPlus}>
            <PlusIcon className="h-4 w-4" />
          </StockActionButton>
          {modeToggle ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                modeToggle.onClick(e);
              }}
              className="min-w-0 flex-1 truncate rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 py-1.5 text-[11px] font-semibold leading-tight text-[var(--app-text)] hover:border-[var(--sidebar-blue)] hover:text-[var(--sidebar-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80"
            >
              {modeToggle.label}
            </button>
          ) : null}
          {onGroups ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onGroups(e);
              }}
              className="shrink-0 rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 py-1.5 text-[11px] font-semibold text-[var(--app-text)] hover:border-[var(--sidebar-blue)] hover:text-[var(--sidebar-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80"
            >
              Группы
            </button>
          ) : null}
          <StockActionButton ariaLabel="Списание" onClick={onMinus}>
            <MinusIcon className="h-4 w-4" />
          </StockActionButton>
        </div>
      </div>
    </CardChrome>
  );
}

export function WarehouseTreeGhostCard(props: {
  level: WarehouseTreeCardLevel;
  label: string;
  onClick: () => void;
}): React.ReactElement {
  const { level, label, onClick } = props;
  const { width, height } = LEVEL_DIMENSIONS[level];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ width, height }}
      className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-[9px] border-2 border-dashed border-[var(--card-border)] bg-[var(--surface-subtle)]/40 p-3 text-[var(--text-muted)] transition-colors hover:border-[var(--sidebar-blue)] hover:bg-[var(--card-bg)] hover:text-[var(--sidebar-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-current bg-[var(--card-bg)] text-[var(--app-text)]">
        <PlusIcon className="h-5 w-5" />
      </span>
      {label ? (
        <span className="max-w-full px-1 text-center text-[14px] font-medium leading-snug">
          {label}
        </span>
      ) : null}
    </button>
  );
}
