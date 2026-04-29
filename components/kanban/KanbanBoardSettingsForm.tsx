"use client";

import type { KanbanBoard } from "@/lib/kanban/types";
import { generateId } from "@/lib/kanban/model";
import { IconTrash } from "./kanban-icons";

type KanbanBoardSettingsFormProps = {
  board: KanbanBoard;
  onPatchBoard: (fn: (b: KanbanBoard) => void) => void;
};

export function KanbanBoardSettingsForm({
  board,
  onPatchBoard,
}: KanbanBoardSettingsFormProps) {
  const types = board.cardTypes || [];
  const users = board.users || [];

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
                    onChange={(e) =>
                      onPatchBoard((b) => {
                        const x = (b.cardTypes || []).find((y) => y.id === t.id);
                        if (x) x.name = e.target.value;
                      })
                    }
                    className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
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
                    onChange={(e) =>
                      onPatchBoard((b) => {
                        const x = (b.cardTypes || []).find((y) => y.id === t.id);
                        if (x) x.color = e.target.value;
                      })
                    }
                    className="h-8 w-14 cursor-pointer rounded border border-[var(--input-border)] bg-[var(--input-bg)]"
                  />
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    title="Удалить тип"
                    className="inline-flex rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
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
                      onPatchBoard((b) => {
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
          className="mt-3 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
          onClick={() =>
            onPatchBoard((b) => {
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
      </section>

      <section>
        <h3 className="mb-2 mt-0 text-sm font-semibold text-[var(--text-strong)]">
          Участники доски
        </h3>
        <p className="mb-3 text-[0.8125rem] leading-snug text-[var(--text-muted)]">
          Эти люди доступны в списках «Ответственные» и «Участники» в карточках.
        </p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-[var(--text-muted)]">
              <th className="py-2 pr-2">Имя</th>
              <th className="w-24 py-2 pr-2">Инициалы</th>
              <th className="w-20 py-2 pr-2">Цвет</th>
              <th className="w-10 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border-subtle)]">
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={u.name}
                    onChange={(e) =>
                      onPatchBoard((b) => {
                        const x = b.users.find((y) => y.id === u.id);
                        if (x) x.name = e.target.value;
                      })
                    }
                    className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={u.initials}
                    maxLength={4}
                    onChange={(e) =>
                      onPatchBoard((b) => {
                        const x = b.users.find((y) => y.id === u.id);
                        if (x) x.initials = e.target.value;
                      })
                    }
                    className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="color"
                    value={
                      u.color && /^#[0-9a-fA-F]{6}$/.test(String(u.color).trim())
                        ? String(u.color).trim()
                        : "#64748b"
                    }
                    onChange={(e) =>
                      onPatchBoard((b) => {
                        const x = b.users.find((y) => y.id === u.id);
                        if (x) x.color = e.target.value;
                      })
                    }
                    className="h-8 w-full min-w-[3.5rem] cursor-pointer rounded border border-[var(--input-border)] bg-[var(--input-bg)]"
                  />
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    title="Удалить участника"
                    className="inline-flex rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Удалить «${u.name}»? Ссылки на этого участника в карточках будут сняты.`,
                        )
                      )
                        return;
                      onPatchBoard((b) => {
                        b.users = b.users.filter((x) => x.id !== u.id);
                        b.columns.forEach((col) => {
                          col.cards.forEach((c) => {
                            c.assignees = (c.assignees || []).filter(
                              (id) => id !== u.id,
                            );
                            c.participants = (c.participants || []).filter(
                              (id) => id !== u.id,
                            );
                            if (c.createdByUserId === u.id) c.createdByUserId = "";
                            if (c.blockedByUserId === u.id) c.blockedByUserId = "";
                            (c.comments || []).forEach((cm) => {
                              if (cm.userId === u.id) cm.userId = "";
                            });
                            (c.activity || []).forEach((a) => {
                              if (a.userId === u.id) a.userId = "";
                            });
                            (c.files || []).forEach((f) => {
                              if (f.addedByUserId === u.id) f.addedByUserId = "";
                            });
                          });
                        });
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
          className="mt-3 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
          onClick={() =>
            onPatchBoard((b) => {
              b.users = b.users || [];
              b.users.push({
                id: generateId("ku"),
                name: "Новый участник",
                initials: "Н",
                color: "#64748b",
              });
            })
          }
        >
          + Добавить участника
        </button>
      </section>
    </div>
  );
}
