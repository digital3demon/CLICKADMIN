"use client";

import type {
  KanbanAppState,
  KanbanBoard,
  KanbanFilterTemplate,
  KanbanFilters,
} from "@/lib/kanban/types";
import {
  countActiveKanbanFilters,
  generateId,
  kaitenCardTypes,
} from "@/lib/kanban/model";
import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useKanbanCrmUsers } from "./kanban-crm-users-context";
import { IconFilter } from "./kanban-icons";
import { mergeKanbanPickerUsers, pickerRowLabel } from "./KanbanPersonAvatar";

import { KANBAN_FILTER_QUICK_ACCESS_MAX } from "@/lib/kanban/filter-templates";

const MAX_TEMPLATES = KANBAN_FILTER_QUICK_ACCESS_MAX;

const selectClass =
  "mt-1 w-full rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-2 py-1.5 text-[0.85rem] text-[var(--kanban-text)]";

function emptyFilters(): KanbanFilters {
  return {
    cardTypeId: "",
    due: "",
    assigneeUserId: "",
    participantUserId: "",
    peopleJoin: "and",
  };
}

function peopleJoinBtnClass(active: boolean): string {
  const base =
    "rounded-md border px-3 py-1 text-[0.75rem] font-bold uppercase tracking-wide transition-colors";
  return active
    ? `${base} border-[var(--kanban-text)] bg-black/[0.08] text-[var(--kanban-text)] dark:bg-white/[0.12]`
    : `${base} border-[var(--kanban-border)] text-[var(--kanban-text-muted)] hover:border-[var(--kanban-text)]/35 hover:text-[var(--kanban-text)]`;
}

type KanbanFiltersButtonProps = {
  board: KanbanBoard;
  filters: KanbanFilters;
  filterTemplates: KanbanFilterTemplate[];
  viewMode: KanbanAppState["viewMode"];
  onViewModeChange: (mode: KanbanAppState["viewMode"]) => void;
  /** Лёгкий патч UI (фильтры/шаблоны) — без clone всей доски. */
  patchApp: (fn: (s: KanbanAppState) => void) => void;
  showToast: (text: string, err?: boolean) => void;
};

const VIEW_MODE_OPTIONS: {
  id: KanbanAppState["viewMode"];
  label: string;
}[] = [
  { id: "board", label: "Доска" },
  { id: "calendar", label: "Календарь" },
  { id: "list", label: "Список" },
];

export function KanbanFiltersButton({
  board,
  filters,
  filterTemplates,
  viewMode,
  onViewModeChange,
  patchApp,
  showToast,
}: KanbanFiltersButtonProps) {
  const { list: crmList } = useKanbanCrmUsers();
  const filterUserOptions = useMemo(
    () =>
      mergeKanbanPickerUsers(crmList, board.users, board.excludedCrmUserIds),
    [crmList, board.users, board.excludedCrmUserIds],
  );
  const [open, setOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }
    const place = () => {
      const root = rootRef.current;
      if (!root) return;
      const btn = root.querySelector("button");
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const margin = 10;
      const maxPanelW = 352;
      const w = Math.min(maxPanelW, window.innerWidth - margin * 2);
      let left = rect.right - w;
      const minLeft = margin;
      const maxLeft = window.innerWidth - margin - w;
      if (left < minLeft) left = minLeft;
      if (left > maxLeft) left = maxLeft;
      const top = rect.bottom + 6;
      const maxH = Math.max(160, window.innerHeight - top - margin);
      setPanelStyle({
        position: "fixed",
        top,
        left,
        width: w,
        zIndex: 50,
        maxHeight: maxH,
      });
    };
    place();
    const raf = requestAnimationFrame(place);
    const onResize = () => place();
    const onScrollAway = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (rootRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("scroll", onScrollAway, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("scroll", onScrollAway, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const active = countActiveKanbanFilters(filters);

  const setFilters = (next: KanbanFilters) => {
    patchApp((s) => {
      s.filters = { ...next };
    });
  };

  const saveTemplate = () => {
    const name = templateName.trim();
    if (!name) {
      showToast("Введите название шаблона", true);
      return;
    }
    if (filterTemplates.length >= MAX_TEMPLATES) {
      showToast(
        `Можно сохранить не больше ${MAX_TEMPLATES} фильтров. Удалите лишний в списке шаблонов.`,
        true,
      );
      return;
    }
    patchApp((s) => {
      s.filterTemplates.push({
        id: generateId("ftpl"),
        name: name.slice(0, 80),
        filters: { ...s.filters },
      });
    });
    setTemplateName("");
    showToast("Шаблон сохранён");
  };

  const applyTemplate = (t: KanbanFilterTemplate) => {
    setFilters({ ...t.filters });
    showToast(`Применён шаблон «${t.name}»`);
  };

  const deleteTemplate = (id: string) => {
    patchApp((s) => {
      s.filterTemplates = s.filterTemplates.filter((x) => x.id !== id);
    });
    showToast("Шаблон удалён");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] text-[0.75rem] font-medium text-[var(--kanban-text)] hover:brightness-[0.98] dark:hover:brightness-110 sm:h-9 sm:w-auto sm:rounded-md sm:px-3 sm:text-[0.8125rem] ${
          open ? "ring-1 ring-[var(--kanban-accent)]/40" : ""
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={active > 0 ? `Фильтры (${active})` : "Фильтры"}
        title="Фильтры"
        onClick={() => setOpen((v) => !v)}
      >
        <IconFilter className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Фильтры</span>
        {active > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--kanban-accent)] px-1 text-center text-[0.55rem] font-bold leading-none text-white sm:static sm:min-w-[1.25rem] sm:px-1.5 sm:py-0.5 sm:text-[0.65rem]">
            {active}
          </span>
        ) : null}
      </button>

      {open && panelStyle ? (
        <div
          style={panelStyle}
          className="overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-[var(--kanban-border)] bg-[var(--kanban-rail-bg)] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          role="dialog"
          aria-label="Фильтры доски"
        >
          <div className="space-y-3 text-[0.8rem]">
            <div>
              <label className="block font-medium text-[var(--kanban-text-muted)]">Тип</label>
              <select
                className={selectClass}
                value={filters.cardTypeId}
                onChange={(e) =>
                  patchApp((s) => {
                    s.filters.cardTypeId = e.target.value;
                  })
                }
              >
                <option value="">Все типы</option>
                {(board.cardTypes || kaitenCardTypes()).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-[var(--kanban-text-muted)]">Срок</label>
              <select
                className={selectClass}
                value={filters.due}
                onChange={(e) =>
                  patchApp((s) => {
                    s.filters.due = e.target.value;
                  })
                }
              >
                <option value="">Все</option>
                <option value="urgent">Срочные</option>
                <option value="none">Без срока</option>
                <option value="overdue">Просрочено</option>
                <option value="today">Сегодня</option>
                <option value="week">На неделе</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-[var(--kanban-text-muted)]">
                Ответственный
              </label>
              <select
                className={selectClass}
                value={filters.assigneeUserId}
                onChange={(e) =>
                  patchApp((s) => {
                    s.filters.assigneeUserId = e.target.value;
                  })
                }
              >
                <option value="">Все</option>
                {filterUserOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {pickerRowLabel(u)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1 font-medium text-[var(--kanban-text-muted)]">
                Связка людей
              </div>
              <div
                className="flex gap-1.5"
                role="group"
                aria-label="Связка ответственного и участника"
              >
                <button
                  type="button"
                  className={peopleJoinBtnClass((filters.peopleJoin ?? "and") === "and")}
                  title="Карточка должна подходить под обоих"
                  onClick={() =>
                    patchApp((s) => {
                      s.filters.peopleJoin = "and";
                    })
                  }
                >
                  и
                </button>
                <button
                  type="button"
                  className={peopleJoinBtnClass(filters.peopleJoin === "or")}
                  title="Достаточно одного из двух"
                  onClick={() =>
                    patchApp((s) => {
                      s.filters.peopleJoin = "or";
                    })
                  }
                >
                  или
                </button>
              </div>
            </div>

            <div>
              <label className="block font-medium text-[var(--kanban-text-muted)]">Участник</label>
              <select
                className={selectClass}
                value={filters.participantUserId}
                onChange={(e) =>
                  patchApp((s) => {
                    s.filters.participantUserId = e.target.value;
                  })
                }
              >
                <option value="">Все</option>
                {filterUserOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {pickerRowLabel(u)}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[0.72rem] leading-snug text-[var(--kanban-text-muted)]">
              Тип и срок всегда суммируются. Ответственный и участник — кнопками
              «и» / «или».
            </p>

            <div className="border-t border-[var(--kanban-border)] pt-3">
              <div className="mb-1.5 font-medium text-[var(--kanban-text-muted)]">
                Вид по умолчанию
              </div>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Вид по умолчанию"
              >
                {VIEW_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={peopleJoinBtnClass(viewMode === opt.id)}
                    aria-pressed={viewMode === opt.id}
                    onClick={() => {
                      if (viewMode === opt.id) {
                        setOpen(false);
                        return;
                      }
                      setOpen(false);
                      onViewModeChange(opt.id);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[var(--kanban-border)] pt-3">
              <button
                type="button"
                className="rounded-md border border-[var(--kanban-border)] px-2.5 py-1.5 text-[0.8rem] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                onClick={() => {
                  setFilters(emptyFilters());
                  showToast("Фильтры сброшены");
                }}
              >
                Сбросить
              </button>
            </div>

            <div className="border-t border-[var(--kanban-border)] pt-3">
              <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--kanban-text-muted)]">
                Шаблоны
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Название шаблона"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-workspace-bg)] px-2 py-1.5 text-[0.8rem] text-[var(--kanban-text)] placeholder:text-[var(--kanban-text-muted)] dark:bg-[#262626]"
                  maxLength={80}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-md bg-[var(--kanban-accent)] px-2.5 py-1.5 text-[0.75rem] font-semibold text-white hover:opacity-95"
                  onClick={saveTemplate}
                >
                  Сохранить
                </button>
              </div>
              {filterTemplates.length === 0 ? (
                <p className="mt-2 text-[0.72rem] text-[var(--kanban-text-muted)]">
                  Нет сохранённых шаблонов — настройте фильтры и нажмите «Сохранить».
                  Можно сохранить до {MAX_TEMPLATES} фильтров.
                </p>
              ) : (
                <ul className="mt-2 max-h-[11rem] space-y-1 overflow-y-auto pr-0.5">
                  {filterTemplates.length >= MAX_TEMPLATES ? (
                    <li className="px-0.5 text-[0.68rem] text-[var(--kanban-text-muted)]">
                      Лимит {MAX_TEMPLATES} — удалите шаблон, чтобы сохранить новый.
                    </li>
                  ) : null}
                  {filterTemplates.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-1 rounded-md border border-[var(--kanban-border)]/80 bg-[var(--kanban-column-bg)] px-2 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-[0.8rem]" title={t.name}>
                        {t.name}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 rounded px-1.5 py-0.5 text-[0.72rem] font-medium text-[var(--kanban-accent)] hover:underline"
                        onClick={() => applyTemplate(t)}
                      >
                        Применить
                      </button>
                      <button
                        type="button"
                        className="shrink-0 rounded px-1.5 py-0.5 text-[0.72rem] text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={() => deleteTemplate(t.id)}
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
