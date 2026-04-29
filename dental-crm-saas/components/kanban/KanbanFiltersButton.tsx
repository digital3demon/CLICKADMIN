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

const MAX_TEMPLATES = 20;

const selectClass =
  "mt-1 w-full rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-2 py-1.5 text-[0.85rem] text-[var(--kanban-text)]";

function emptyFilters(): KanbanFilters {
  return {
    cardTypeId: "",
    due: "",
    assigneeUserId: "",
    participantUserId: "",
  };
}

type KanbanFiltersButtonProps = {
  board: KanbanBoard;
  filters: KanbanFilters;
  filterTemplates: KanbanFilterTemplate[];
  patchApp: (fn: (s: KanbanAppState) => void) => void;
  showToast: (text: string, err?: boolean) => void;
};

export function KanbanFiltersButton({
  board,
  filters,
  filterTemplates,
  patchApp,
  showToast,
}: KanbanFiltersButtonProps) {
  const { list: crmList } = useKanbanCrmUsers();
  const filterUserOptions = useMemo(
    () => mergeKanbanPickerUsers(crmList, board.users),
    [crmList, board.users],
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
    patchApp((s) => {
      if (s.filterTemplates.length >= MAX_TEMPLATES) {
        s.filterTemplates = s.filterTemplates.slice(1);
      }
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
        className={`inline-flex items-center gap-2 rounded-lg border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-3 py-2 text-[0.875rem] text-[var(--kanban-text)] hover:brightness-[0.98] dark:hover:brightness-110 ${
          open ? "ring-1 ring-[var(--kanban-accent)]/40" : ""
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <IconFilter />
        Фильтры
        {active > 0 ? (
          <span className="min-w-[1.25rem] rounded-full bg-[var(--kanban-accent)] px-1.5 py-0.5 text-center text-[0.65rem] font-bold leading-none text-white">
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
              Условия суммируются: карточка должна подходить под каждый выбранный фильтр.
            </p>

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
                </p>
              ) : (
                <ul className="mt-2 max-h-[11rem] space-y-1 overflow-y-auto pr-0.5">
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
