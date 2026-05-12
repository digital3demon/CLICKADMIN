"use client";

import type { KanbanBoard } from "@/lib/kanban/types";
import { generateId, trackLanes } from "@/lib/kanban/model";
import { memo } from "react";
import { IconTrash } from "./kanban-icons";

type KanbanBoardSettingsFormProps = {
  board: KanbanBoard;
  onPatchBoard: (fn: (b: KanbanBoard) => void) => void;
  onPatchCardTypes?: (fn: (b: KanbanBoard) => void) => void;
  canEditCardTypes?: boolean;
};

function KanbanBoardSettingsFormImpl({
  board,
  onPatchBoard,
  onPatchCardTypes,
  canEditCardTypes = false,
}: KanbanBoardSettingsFormProps) {
  const patchCardTypes = onPatchCardTypes ?? onPatchBoard;
  const types = board.cardTypes || [];

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-2 mt-0 text-sm font-semibold text-[var(--text-strong)]">
          Типы карточек
        </h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-[var(--text-muted)]">
              <th className="py-2 pr-2">Название</th>
              <th className="py-2 pr-2">Цвет</th>
              <th className="py-2 pr-2">Пространство по умолчанию</th>
              <th className="w-10 py-2" />
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border-subtle)]">
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={t.name}
                    disabled={!canEditCardTypes}
                    onChange={(e) =>
                      patchCardTypes((b) => {
                        const x = (b.cardTypes || []).find((y) => y.id === t.id);
                        if (x) x.name = e.target.value;
                      })
                    }
                    className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-45"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="color"
                    value={
                      t.color && /^#[0-9a-fA-F]{6}$/.test(String(t.color).trim())
                        ? String(t.color).trim()
                        : "#94a3b8"
                    }
                    disabled={!canEditCardTypes}
                    onChange={(e) =>
                      patchCardTypes((b) => {
                        const x = (b.cardTypes || []).find((y) => y.id === t.id);
                        if (x) x.color = e.target.value;
                      })
                    }
                    className="h-8 w-14 cursor-pointer rounded border border-[var(--input-border)] bg-[var(--input-bg)] disabled:cursor-not-allowed disabled:opacity-45"
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    value={t.defaultTrackLane || ""}
                    disabled={!canEditCardTypes}
                    onChange={(e) =>
                      patchCardTypes((b) => {
                        const x = (b.cardTypes || []).find((y) => y.id === t.id);
                        if (!x) return;
                        x.defaultTrackLane = e.target.value || undefined;
                      })
                    }
                    className="h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <option value="">Не задано</option>
                    {trackLanes().map((lane) => (
                      <option key={lane.id} value={lane.id}>
                        {lane.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    title="Удалить тип"
                    disabled={!canEditCardTypes}
                    className="inline-flex rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)]"
                    onClick={() => {
                      let n = 0;
                      board.columns.forEach((col) => {
                        col.cards.forEach((c) => {
                          if (c.cardTypeId === t.id) n++;
                        });
                      });
                      if (
                        n > 0 &&
                        !window.confirm(
                          `У ${n} карточек выбран этот тип. Удалить тип и сбросить у них тип?`,
                        )
                      ) {
                        return;
                      }
                      patchCardTypes((b) => {
                        b.columns.forEach((col) => {
                          col.cards.forEach((c) => {
                            if (c.cardTypeId === t.id) c.cardTypeId = "";
                          });
                        });
                        b.cardTypes = (b.cardTypes || []).filter((x) => x.id !== t.id);
                      });
                    }}
                  >
                    <IconTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          disabled={!canEditCardTypes}
          className="mt-3 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--surface-subtle)]"
          onClick={() =>
            patchCardTypes((b) => {
              b.cardTypes = b.cardTypes || [];
              const maxO = b.cardTypes.length
                ? Math.max(...b.cardTypes.map((x) => x.sortOrder || 0))
                : 0;
              b.cardTypes.push({
                id: generateId("kt"),
                name: "Новый тип",
                color: "#94a3b8",
                sortOrder: maxO + 10,
              });
            })
          }
        >
          + Добавить тип
        </button>
        {!canEditCardTypes ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Нет доступа к редактированию типов карточек канбана.
          </p>
        ) : null}
      </section>

    </div>
  );
}

export const KanbanBoardSettingsForm = memo(KanbanBoardSettingsFormImpl);
