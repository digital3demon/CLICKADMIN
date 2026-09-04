"use client";

import type { KanbanAppState, KanbanFilterTemplate, KanbanFilters } from "@/lib/kanban/types";
import {
  kanbanFiltersEqual,
  quickAccessKanbanFilterTemplates,
} from "@/lib/kanban/filter-templates";
import { emptyKanbanFilters } from "@/lib/kanban/user-board-ui-state";

type KanbanFilterQuickAccessProps = {
  templates: KanbanFilterTemplate[];
  filters: KanbanFilters;
  patchApp: (fn: (s: KanbanAppState) => void) => void;
  /**
   * `row` — чипы в одну линию (desktop).
   * `square` — блок справа на мобилке (высота двух нижних рядов шапки; 1 / столбик 2–3 / сетка 2×2).
   */
  layout?: "row" | "square";
};

function chipClass(on: boolean, compact: boolean): string {
  const size = compact
    ? "min-h-0 min-w-0 px-0.5 text-[0.55rem] leading-tight"
    : "h-9 max-w-[5.5rem] px-2 text-[0.68rem] sm:max-w-[8rem] sm:px-2.5 sm:text-[0.75rem]";
  const tone = on
    ? "border-white/70 bg-white text-black ring-1 ring-white/70"
    : "border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] text-[var(--kanban-text)]";
  return `inline-flex w-full items-center justify-center rounded-md border font-semibold shadow-sm transition-[transform,box-shadow,background-color,border-color,color] duration-100 hover:brightness-[0.98] dark:hover:brightness-110 ${size} ${tone}`;
}

export function KanbanFilterQuickAccess({
  templates,
  filters,
  patchApp,
  layout = "row",
}: KanbanFilterQuickAccessProps) {
  const chips = quickAccessKanbanFilterTemplates(templates);
  if (chips.length === 0) {
    if (layout !== "square") return null;
    return (
      <div
        className="flex w-[4.75rem] shrink-0 self-stretch items-center justify-center rounded-lg border border-dashed border-[var(--kanban-border)] text-center text-[0.55rem] leading-tight text-[var(--kanban-text-muted)]"
        aria-hidden
      >
        фильтры
      </div>
    );
  }

  const apply = (t: KanbanFilterTemplate, on: boolean) => {
    patchApp((s) => {
      s.filters = on
        ? emptyKanbanFilters()
        : {
            ...t.filters,
            peopleJoin: t.filters.peopleJoin === "or" ? "or" : "and",
          };
    });
  };

  if (layout === "square") {
    const n = chips.length;
    const gridClass =
      n === 1
        ? "grid grid-cols-1 grid-rows-1"
        : n === 4
          ? "grid grid-cols-2 grid-rows-2"
          : "grid grid-cols-1";
    return (
      <div
        className={`w-[4.75rem] shrink-0 self-stretch gap-0.5 rounded-lg border border-[var(--kanban-border)] bg-[var(--kanban-workspace-bg)] p-0.5 dark:bg-[#262626] ${gridClass}`}
        role="group"
        aria-label="Сохранённые фильтры"
      >
        {chips.map((t) => {
          const on = kanbanFiltersEqual(filters, t.filters);
          return (
            <button
              key={t.id}
              type="button"
              title={on ? `Сбросить «${t.name}»` : `Фильтр «${t.name}»`}
              aria-pressed={on}
              className={chipClass(on, true)}
              onClick={() => apply(t, on)}
            >
              <span className="line-clamp-2 break-words text-center">{t.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 max-w-full shrink items-center gap-1 sm:gap-1.5"
      role="group"
      aria-label="Сохранённые фильтры"
    >
      {chips.map((t) => {
        const on = kanbanFiltersEqual(filters, t.filters);
        return (
          <button
            key={t.id}
            type="button"
            title={on ? `Сбросить «${t.name}»` : `Фильтр «${t.name}»`}
            aria-pressed={on}
            className={`shrink-0 ${chipClass(on, false)} !w-auto`}
            onClick={() => apply(t, on)}
          >
            <span className="truncate">{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}
