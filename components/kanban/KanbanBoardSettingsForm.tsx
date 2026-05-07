"use client";

import type { KanbanBoard } from "@/lib/kanban/types";
import { generateId, trackLanes } from "@/lib/kanban/model";
import { defaultProductionSettings, normalizeProductionSettings } from "@/lib/kanban/production";
import { useEffect, useState } from "react";
import { IconTrash } from "./kanban-icons";

type KanbanBoardSettingsFormProps = {
  board: KanbanBoard;
  onPatchBoard: (fn: (b: KanbanBoard) => void) => void;
  onPatchCardTypes?: (fn: (b: KanbanBoard) => void) => void;
  onEnsureProductionBoardNow?: () => void;
};

export function KanbanBoardSettingsForm({
  board,
  onPatchBoard,
  onPatchCardTypes,
  onEnsureProductionBoardNow,
}: KanbanBoardSettingsFormProps) {
  const patchCardTypes = onPatchCardTypes ?? onPatchBoard;
  const production = board.productionSettings ?? defaultProductionSettings();
  const types = board.cardTypes || [];

  const [archive3dDraft, setArchive3dDraft] = useState(
    (production.archive3dExtensions || []).join(", "),
  );
  const [laneKeywordsDraft, setLaneKeywordsDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    setArchive3dDraft((production.archive3dExtensions || []).join(", "));
    const map: Record<string, string> = {};
    for (const lane of production.lanes) {
      map[lane.id] = (lane.keywords || []).join(", ");
    }
    setLaneKeywordsDraft(map);
  }, [board.id, production.archive3dExtensions, production.lanes]);

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-2 mt-0 text-sm font-semibold text-[var(--text-strong)]">
          Производственный контур
        </h3>
        <p className="mb-3 text-[0.8125rem] leading-snug text-[var(--text-muted)]">
          Автосоздание дочерних карточек при переносе в «Производство», маршрутизация по ключевым
          словам в именах файлов и автоархивация готовых дочерних.
        </p>
        {onEnsureProductionBoardNow ? (
          <div className="mb-3">
            <button
              type="button"
              className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
              onClick={onEnsureProductionBoardNow}
            >
              Создать/обновить доску Производство сейчас
            </button>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-[var(--text-secondary)]">Колонка-триггер (родитель)</span>
            <input
              type="text"
              value={production.triggerColumnTitle}
              onChange={(e) =>
                onPatchBoard((b) => {
                  const p = normalizeProductionSettings(b);
                  p.triggerColumnTitle = e.target.value;
                })
              }
              className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--text-secondary)]">Колонка для родителя после готовности детей</span>
            <input
              type="text"
              value={production.parentDoneColumnTitle}
              onChange={(e) =>
                onPatchBoard((b) => {
                  const p = normalizeProductionSettings(b);
                  p.parentDoneColumnTitle = e.target.value;
                })
              }
              className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--text-secondary)]">Колонка «К исполнению» (дочерняя)</span>
            <input
              type="text"
              value={production.childTodoColumnTitle}
              onChange={(e) =>
                onPatchBoard((b) => {
                  const p = normalizeProductionSettings(b);
                  p.childTodoColumnTitle = e.target.value;
                })
              }
              className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--text-secondary)]">Колонка «В работе» (дочерняя)</span>
            <input
              type="text"
              value={production.childInProgressColumnTitle}
              onChange={(e) =>
                onPatchBoard((b) => {
                  const p = normalizeProductionSettings(b);
                  p.childInProgressColumnTitle = e.target.value;
                })
              }
              className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--text-secondary)]">Колонка «Готово» (дочерняя)</span>
            <input
              type="text"
              value={production.childDoneColumnTitle}
              onChange={(e) =>
                onPatchBoard((b) => {
                  const p = normalizeProductionSettings(b);
                  p.childDoneColumnTitle = e.target.value;
                })
              }
              className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--text-secondary)]">Автоархив дочерних после «Готово» (дней)</span>
            <input
              type="number"
              min={0}
              value={production.childAutoArchiveAfterDays}
              onChange={(e) =>
                onPatchBoard((b) => {
                  const p = normalizeProductionSettings(b);
                  const v = Number(e.target.value);
                  p.childAutoArchiveAfterDays = Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
                })
              }
              className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--text-secondary)]">
              Расширения 3D-файлов для чеклиста архива (через запятую)
            </span>
            <input
              type="text"
              value={archive3dDraft}
              onChange={(e) => setArchive3dDraft(e.target.value)}
              onBlur={() =>
                onPatchBoard((b) => {
                  const p = normalizeProductionSettings(b);
                  p.archive3dExtensions = archive3dDraft
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean);
                })
              }
              className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
              placeholder="stl, ply, obj"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--text-secondary)]">
              Тег @ для упоминания «Производство» в чате карточки
            </span>
            <input
              type="text"
              value={production.productionMentionTag ?? ""}
              onChange={(e) =>
                onPatchBoard((b) => {
                  const p = normalizeProductionSettings(b);
                  p.productionMentionTag = e.target.value;
                })
              }
              placeholder="clickpr"
              className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 font-mono text-[var(--app-text)]"
            />
            <span className="mt-1 block text-[0.6875rem] text-[var(--text-muted)]">
              По умолчанию в текст подставляется @clickpr; в подсказках чата показывается «Производство».
              Для SaaS можно задать свой токен (латиница/цифры).
            </span>
          </label>
        </div>
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-[var(--text-strong)]">Дорожки и ключевые слова</h4>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-[var(--text-muted)]">
                <th className="py-2 pr-2">Дорожка</th>
                <th className="py-2 pr-2">Ключевые слова (через запятую)</th>
                <th className="w-10 py-2" />
              </tr>
            </thead>
            <tbody>
              {production.lanes.map((lane) => (
                <tr key={lane.id} className="border-b border-[var(--border-subtle)]">
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={lane.name}
                      onChange={(e) =>
                        onPatchBoard((b) => {
                          const p = normalizeProductionSettings(b);
                          const row = p.lanes.find((x) => x.id === lane.id);
                          if (row) row.name = e.target.value;
                        })
                      }
                      className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={laneKeywordsDraft[lane.id] ?? (lane.keywords || []).join(", ")}
                      onChange={(e) =>
                        setLaneKeywordsDraft((prev) => ({ ...prev, [lane.id]: e.target.value }))
                      }
                      onBlur={() =>
                        onPatchBoard((b) => {
                          const p = normalizeProductionSettings(b);
                          const row = p.lanes.find((x) => x.id === lane.id);
                          if (!row) return;
                          row.keywords = (laneKeywordsDraft[lane.id] || "")
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean);
                        })
                      }
                      className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
                    />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      title="Удалить дорожку"
                      className="inline-flex rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)] disabled:opacity-40"
                      disabled={lane.id === production.unmatchedLaneId}
                      onClick={() =>
                        onPatchBoard((b) => {
                          const p = normalizeProductionSettings(b);
                          p.lanes = p.lanes.filter((x) => x.id !== lane.id);
                        })
                      }
                    >
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
              onClick={() =>
                onPatchBoard((b) => {
                  const p = normalizeProductionSettings(b);
                  p.lanes.push({
                    id: generateId("lane"),
                    name: "Новая дорожка",
                    keywords: [],
                  });
                })
              }
            >
              + Добавить дорожку
            </button>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              Fallback:
              <select
                value={production.unmatchedLaneId}
                onChange={(e) =>
                  onPatchBoard((b) => {
                    const p = normalizeProductionSettings(b);
                    p.unmatchedLaneId = e.target.value;
                  })
                }
                className="rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
              >
                {production.lanes.map((lane) => (
                  <option key={lane.id} value={lane.id}>
                    {lane.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

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
                    onChange={(e) =>
                      patchCardTypes((b) => {
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
                      patchCardTypes((b) => {
                        const x = (b.cardTypes || []).find((y) => y.id === t.id);
                        if (x) x.color = e.target.value;
                      })
                    }
                    className="h-8 w-14 cursor-pointer rounded border border-[var(--input-border)] bg-[var(--input-bg)]"
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    value={t.defaultTrackLane || ""}
                    onChange={(e) =>
                      patchCardTypes((b) => {
                        const x = (b.cardTypes || []).find((y) => y.id === t.id);
                        if (!x) return;
                        x.defaultTrackLane = e.target.value || undefined;
                      })
                    }
                    className="h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-[var(--app-text)]"
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
          className="mt-3 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
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
      </section>

    </div>
  );
}
