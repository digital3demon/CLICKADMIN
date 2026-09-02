"use client";

import type React from "react";

export type WarehouseTreeCardLevel = "warehouse" | "manufacturer" | "article";

const LEVEL_DIMENSIONS: Record<
  WarehouseTreeCardLevel,
  { width: number; height: number; tierLabel: string }
> = {
  warehouse: { width: 221, height: 312, tierLabel: "Склад" },
  manufacturer: { width: 187, height: 264, tierLabel: "Производитель" },
  article: { width: 170, height: 240, tierLabel: "Артикул" },
};

/** Портретное соотношение сторон (width / height = 1000 / 1414). */
const LEVEL_ACCENT: Record<WarehouseTreeCardLevel, string> = {
  warehouse: "#0ea5e9",
  manufacturer: "#f59e0b",
  article: "#64748b",
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
  children: React.ReactNode;
  onClick?: () => void;
  role?: React.AriaRole;
  tabIndex?: number;
  "aria-expanded"?: boolean;
};

function CardChrome({
  level,
  highlighted,
  children,
  onClick,
  role,
  tabIndex,
  "aria-expanded": ariaExpanded,
}: CardChromeProps) {
  const { width, height } = LEVEL_DIMENSIONS[level];

  return (
    <div
      className={`relative shrink-0 rounded-[9px] p-[2px] ${levelRingClass(level, highlighted)}`}
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
      className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--app-text)] shadow-sm transition-colors hover:border-[var(--sidebar-blue)] hover:bg-[var(--card-bg)] hover:text-[var(--sidebar-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80"
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
  onOpen?: () => void;
  onPlus: (e: React.MouseEvent) => void;
  onMinus: (e: React.MouseEvent) => void;
}): JSX.Element {
  const {
    level,
    title,
    highlighted,
    metrics,
    expanded,
    onOpen,
    onPlus,
    onMinus,
  } = props;
  const { tierLabel } = LEVEL_DIMENSIONS[level];
  const accent = LEVEL_ACCENT[level];

  return (
    <CardChrome
      level={level}
      highlighted={highlighted}
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-expanded={expanded}
    >
      <div
        className="flex shrink-0 items-center gap-1 border-b border-[var(--card-border)] px-2 py-1"
        style={{
          color: `color-mix(in srgb, ${accent} 78%, var(--app-text))`,
          background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 22%, var(--card-bg)) 0%, color-mix(in srgb, ${accent} 10%, var(--card-bg)) 100%)`,
        }}
      >
        <span className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase tracking-wide">
          {tierLabel}
        </span>
        {expanded !== undefined ? (
          <span
            className="shrink-0 text-[10px] text-[var(--text-muted)]"
            aria-hidden
          >
            {expanded ? "▾" : "▸"}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pb-2 pt-1.5">
        <h3 className="min-w-0 break-words text-[13px] font-semibold leading-snug text-[var(--app-text)]">
          {title}
        </h3>

        <dl className="mt-2 min-h-0 flex-1 space-y-1">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0">
              <dt className="truncate text-[10px] leading-tight text-[var(--text-muted)]">
                {metric.label}
              </dt>
              <dd className="truncate text-[11px] font-medium leading-tight text-[var(--app-text)]">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <StockActionButton ariaLabel="Приход" onClick={onPlus}>
            <PlusIcon className="h-3.5 w-3.5" />
          </StockActionButton>
          <StockActionButton ariaLabel="Списание" onClick={onMinus}>
            <MinusIcon className="h-3.5 w-3.5" />
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
}): JSX.Element {
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
        <span className="max-w-full px-1 text-center text-[11px] leading-snug">
          {label}
        </span>
      ) : null}
    </button>
  );
}
