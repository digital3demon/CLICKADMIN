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
};

export function KanbanFilterQuickAccess({
  templates,
  filters,
  patchApp,
}: KanbanFilterQuickAccessProps) {
  const chips = quickAccessKanbanFilterTemplates(templates);
  if (chips.length === 0) return null;

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
            className={`inline-flex h-9 max-w-[5.5rem] shrink-0 items-center justify-center rounded-md border px-2 text-[0.68rem] font-semibold shadow-sm transition-[transform,box-shadow,background-color,border-color,color] duration-100 hover:brightness-[0.98] dark:hover:brightness-110 sm:max-w-[8rem] sm:px-2.5 sm:text-[0.75rem] ${
              on
                ? "border-white/70 bg-white text-black ring-2 ring-white/70"
                : "border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] text-[var(--kanban-text)]"
            }`}
            onClick={() => {
              patchApp((s) => {
                s.filters = on
                  ? emptyKanbanFilters()
                  : {
                      ...t.filters,
                      peopleJoin: t.filters.peopleJoin === "or" ? "or" : "and",
                    };
              });
            }}
          >
            <span className="truncate">{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}
