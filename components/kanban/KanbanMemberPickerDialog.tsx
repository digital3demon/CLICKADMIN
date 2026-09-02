"use client";

import type { KanbanBoard } from "@/lib/kanban/types";
import type { KanbanMemberPickerMode } from "@/lib/kanban/kanban-card-members-client";
import {
  KANBAN_MEMBER_PICKER_PAGE_SIZE,
  sliceKanbanMemberPickerPage,
  splitPickerIntoColumns,
} from "@/lib/kanban/member-picker-page";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useKanbanCrmUsers } from "./kanban-crm-users-context";
import {
  KanbanPersonAvatar,
  mergeKanbanPickerUsers,
  pickerRowLabel,
} from "./KanbanPersonAvatar";

const baseInput =
  "w-full rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2.5 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]";

type KanbanMemberPickerDialogProps = {
  open: boolean;
  mode: KanbanMemberPickerMode;
  board: KanbanBoard;
  initialUserIds: string[];
  onClose: () => void;
  onSave: (userIds: string[]) => void;
  /** Поверх других модалок (напр. префлайт заказа z-600). */
  overlayClassName?: string;
};

export function KanbanMemberPickerDialog({
  open,
  mode,
  board,
  initialUserIds,
  onClose,
  onSave,
  overlayClassName = "z-[280]",
}: KanbanMemberPickerDialogProps) {
  const { list: crmList } = useKanbanCrmUsers();
  const [pickerIds, setPickerIds] = useState<string[]>(() => [...initialUserIds]);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerPage, setPickerPage] = useState(0);

  useEffect(() => {
    if (!open) return;
    setPickerIds([...initialUserIds]);
    setPickerQuery("");
    setPickerPage(0);
    // Только при открытии / смене режима — иначе новый массив initialUserIds
    // с каждого рендера родителя сбрасывает снятие галочек.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync on open/mode only
  }, [open, mode]);

  const pickerMerged = useMemo(
    () =>
      mergeKanbanPickerUsers(crmList, board.users, board.excludedCrmUserIds),
    [crmList, board.users, board.excludedCrmUserIds],
  );

  const pickerFiltered = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return pickerMerged;
    return pickerMerged.filter((row) => {
      if (pickerRowLabel(row).toLowerCase().includes(q)) return true;
      if ("email" in row && row.email?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [pickerMerged, pickerQuery]);

  const pickerSlice = useMemo(
    () => sliceKanbanMemberPickerPage(pickerFiltered, pickerPage),
    [pickerFiltered, pickerPage],
  );
  const pickerColumns = useMemo(
    () => splitPickerIntoColumns(pickerSlice.items),
    [pickerSlice.items],
  );

  useEffect(() => {
    setPickerPage(0);
  }, [pickerQuery]);

  const togglePickerId = (uid: string) => {
    setPickerIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
    );
  };

  if (!open) return null;

  const dialog = (
    <div
      className={`kanban-root fixed inset-0 flex items-center justify-center bg-black/60 p-4 ${overlayClassName}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-3xl rounded-lg border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] p-4 text-[var(--kaiten-modal-text)] shadow-xl"
        style={{ backgroundColor: "var(--kaiten-modal-bg)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="m-0 text-sm font-semibold">
          {mode === "assign" ? "Ответственные" : "Участники"}
        </h3>
        <p className="mt-1 text-[0.75rem] text-[var(--kaiten-modal-muted)]">
          Любой активный пользователь CRM. Ответственные — с золотой обводкой на
          карточке. Нажмите на строку, чтобы выбрать или снять выбор.
        </p>
        <input
          type="search"
          value={pickerQuery}
          onChange={(e) => setPickerQuery(e.target.value)}
          placeholder="Поиск по имени или email…"
          className={`${baseInput} mt-2`}
          autoFocus
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {pickerFiltered.length === 0 ? (
            <p className="col-span-3 text-[0.8125rem] text-[var(--kaiten-modal-muted)]">
              {pickerMerged.length === 0
                ? "Нет пользователей (проверьте доступ к CRM)."
                : "Никого не найдено."}
            </p>
          ) : (
            pickerColumns.map((column, columnIndex) => (
              <div key={columnIndex} className="min-w-0">
                <div className="flex flex-col gap-2">
                  {column.map((row) => {
                    const selected = pickerIds.includes(row.id);
                    return (
                      <button
                        key={row.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => togglePickerId(row.id)}
                        className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[0.8125rem] transition-colors ${
                          selected
                            ? mode === "assign"
                              ? "border-amber-400/80 bg-[color-mix(in_srgb,rgb(251_191_36)_16%,var(--kaiten-modal-bg))]"
                              : "border-[var(--sidebar-blue)] bg-[color-mix(in_srgb,var(--sidebar-blue)_16%,var(--kaiten-modal-bg))]"
                            : "border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] hover:border-[var(--kaiten-modal-muted)]"
                        }`}
                      >
                        <KanbanPersonAvatar
                          userId={row.id}
                          homeBoard={board}
                          variant={mode === "assign" ? "assignee" : "participant"}
                          size="picker"
                          titleSuffix=""
                        />
                        <span className="min-w-0 truncate">
                          {pickerRowLabel(row)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        {pickerFiltered.length > KANBAN_MEMBER_PICKER_PAGE_SIZE ? (
          <div className="mt-3 flex items-center justify-center gap-2 text-[0.75rem] text-[var(--kaiten-modal-muted)]">
            <button
              type="button"
              className="rounded-md border border-[var(--kaiten-modal-border)] px-2 py-1 disabled:opacity-40"
              disabled={pickerSlice.page <= 0}
              onClick={() => setPickerPage((p) => Math.max(0, p - 1))}
            >
              Назад
            </button>
            <span>
              {pickerSlice.page + 1} / {pickerSlice.pageCount}
            </span>
            <button
              type="button"
              className="rounded-md border border-[var(--kaiten-modal-border)] px-2 py-1 disabled:opacity-40"
              disabled={pickerSlice.page >= pickerSlice.pageCount - 1}
              onClick={() =>
                setPickerPage((p) =>
                  Math.min(pickerSlice.pageCount - 1, p + 1),
                )
              }
            >
              Далее
            </button>
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--kaiten-modal-border)] px-3 py-1.5 text-sm"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-medium text-white"
            onClick={() => onSave([...pickerIds])}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return dialog;
  return createPortal(dialog, document.body);
}
