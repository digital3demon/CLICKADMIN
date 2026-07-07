"use client";

import type { KanbanBoard } from "@/lib/kanban/types";
import type { KanbanMemberPickerMode } from "@/lib/kanban/kanban-card-members-client";
import { useEffect, useMemo, useState } from "react";
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
};

export function KanbanMemberPickerDialog({
  open,
  mode,
  board,
  initialUserIds,
  onClose,
  onSave,
}: KanbanMemberPickerDialogProps) {
  const { list: crmList } = useKanbanCrmUsers();
  const [pickerIds, setPickerIds] = useState<string[]>([]);
  const [pickerQuery, setPickerQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setPickerIds([...initialUserIds]);
    setPickerQuery("");
  }, [open, mode, initialUserIds]);

  const pickerMerged = useMemo(
    () => mergeKanbanPickerUsers(crmList, board.users),
    [crmList, board.users],
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

  const togglePickerId = (uid: string) => {
    setPickerIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
    );
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] p-4 text-[var(--kaiten-modal-text)] shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="m-0 text-sm font-semibold">
          {mode === "assign" ? "Ответственные" : "Участники"}
        </h3>
        <p className="mt-1 text-[0.75rem] text-[var(--kaiten-modal-muted)]">
          Любой активный пользователь CRM. Ответственные — с золотой обводкой на карточке.
        </p>
        <input
          type="search"
          value={pickerQuery}
          onChange={(e) => setPickerQuery(e.target.value)}
          placeholder="Поиск по имени или email…"
          className={`${baseInput} mt-2`}
          autoFocus
        />
        <div className="mt-3 max-h-[240px] space-y-2 overflow-y-auto">
          {pickerFiltered.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--kaiten-modal-muted)]">
              {pickerMerged.length === 0
                ? "Нет пользователей (проверьте доступ к CRM)."
                : "Никого не найдено."}
            </p>
          ) : (
            pickerFiltered.map((row) => (
              <label
                key={row.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--kaiten-modal-border)] px-2 py-1.5 text-[0.8125rem]"
              >
                <input
                  type="checkbox"
                  checked={pickerIds.includes(row.id)}
                  onChange={() => togglePickerId(row.id)}
                  className="rounded"
                />
                <KanbanPersonAvatar
                  userId={row.id}
                  homeBoard={board}
                  variant={mode === "assign" ? "assignee" : "participant"}
                  size="picker"
                  titleSuffix=""
                />
                {pickerRowLabel(row)}
              </label>
            ))
          )}
        </div>
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
}
