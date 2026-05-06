"use client";

import type { KanbanBoard } from "@/lib/kanban/types";
import {
  DEFAULT_KANBAN_ADMIN_MENTION_TAG,
  normalizeKanbanAdminMentionTag,
} from "@/lib/kanban-admin-mention";
import { clampArchiveRetentionDays, generateId } from "@/lib/kanban/model";
import { useEffect, useMemo, useState } from "react";
import { useKanbanCrmUsers } from "./kanban-crm-users-context";
import { IconTrash } from "./kanban-icons";

type KanbanBoardSettingsFormProps = {
  board: KanbanBoard;
  onPatchBoard: (fn: (b: KanbanBoard) => void) => void;
  /** Редактирование тега @лаборатории для организации (не локально для одной доски). */
  canEditKanbanAdminTag?: boolean;
};

export function KanbanBoardSettingsForm({
  board,
  onPatchBoard,
  canEditKanbanAdminTag = false,
}: KanbanBoardSettingsFormProps) {
  const types = board.cardTypes || [];
  const archiveRules = board.autoArchiveRules || [];
  const { list: crmUsers, loading: crmUsersLoading } = useKanbanCrmUsers();
  const excludedIds = board.excludedCrmUserIds ?? [];
  const excludedSet = useMemo(() => new Set(excludedIds), [excludedIds]);
  const candidatesToExclude = useMemo(
    () => crmUsers.filter((u) => u?.id && !excludedSet.has(u.id)),
    [crmUsers, excludedSet],
  );
  const [pickExcludeUserId, setPickExcludeUserId] = useState("");
  const retentionYearsRaw =
    (Number.isFinite(board.archiveRetentionDays)
      ? Number(board.archiveRetentionDays)
      : 365) / 365;
  const retentionYears =
    Math.round(retentionYearsRaw * 1000) / 1000;

  const [labTagDraft, setLabTagDraft] = useState(DEFAULT_KANBAN_ADMIN_MENTION_TAG);
  const [labTagSaving, setLabTagSaving] = useState(false);
  const [labTagError, setLabTagError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then(
        (j: {
          user?: unknown;
          tenant?: { kanbanAdminMentionTag?: string | null };
        }) => {
          if (cancelled || !j?.user) return;
          setLabTagDraft(
            normalizeKanbanAdminMentionTag(j.tenant?.kanbanAdminMentionTag ?? null),
          );
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const persistLabTag = async () => {
    if (!canEditKanbanAdminTag) return;
    setLabTagSaving(true);
    setLabTagError(null);
    try {
      const trimmed = labTagDraft.trim();
      const res = await fetch("/api/tenant/kanban-admin-mention-tag", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kanbanAdminMentionTag: trimmed.length === 0 ? null : trimmed,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        kanbanAdminMentionTag?: string | null;
      };
      if (!res.ok) {
        setLabTagError(j.error ?? "Не сохранено");
        return;
      }
      setLabTagDraft(
        normalizeKanbanAdminMentionTag(j.kanbanAdminMentionTag ?? null),
      );
    } catch {
      setLabTagError("Сеть");
    } finally {
      setLabTagSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-2 mt-0 text-sm font-semibold text-[var(--text-strong)]">
          Чат канбана и Kaiten
        </h3>
        <p className="mb-3 text-[0.8125rem] leading-snug text-[var(--text-muted)]">
          Старший администратор и администратор в списке @ не показываются по отдельности —
          один общий тег для упоминания команды (уведомления уходят всем с этими ролями).
          Пустое значение или сброс сохраняет стандартный тег «{DEFAULT_KANBAN_ADMIN_MENTION_TAG}».
        </p>
        <label className="mb-1 block max-w-md text-sm">
          <span className="mb-1 block text-[var(--text-secondary)]">
            Токен без «@» (латиница, 2–32 символа)
          </span>
          <input
            type="text"
            value={labTagDraft}
            disabled={!canEditKanbanAdminTag || labTagSaving}
            onChange={(e) => setLabTagDraft(e.target.value)}
            onBlur={() => void persistLabTag()}
            placeholder={DEFAULT_KANBAN_ADMIN_MENTION_TAG}
            className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 font-mono text-[var(--app-text)] disabled:opacity-60"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {labTagError ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{labTagError}</p>
        ) : null}
        {!canEditKanbanAdminTag ? (
          <p className="mt-2 text-[0.75rem] text-[var(--text-muted)]">
            Изменить тег могут владелец, старший администратор или администратор.
          </p>
        ) : null}
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
          Исключить пользователей
        </h3>
        <p className="mb-3 text-[0.8125rem] leading-snug text-[var(--text-muted)]">
          По умолчанию в списках «Ответственные» и «Участники» в карточках доступны все
          пользователи организации. Здесь можно скрыть лишних только для этой доски (они не
          смогут быть выбраны в новых назначениях).
        </p>
        {crmUsersLoading ? (
          <p className="text-sm text-[var(--text-muted)]">Загрузка пользователей…</p>
        ) : null}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-[var(--text-muted)]">
              <th className="py-2 pr-2">Исключён из списков</th>
              <th className="w-12 py-2" />
            </tr>
          </thead>
          <tbody>
            {excludedIds.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="py-3 text-[var(--text-muted)]"
                >
                  Никого не исключено — все пользователи CRM доступны для выбора.
                </td>
              </tr>
            ) : (
              excludedIds.map((uid) => {
                const row = crmUsers.find((u) => u.id === uid);
                const label =
                  row?.displayName?.trim() ||
                  row?.email?.trim() ||
                  uid;
                return (
                  <tr key={uid} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2 pr-2 text-[var(--app-text)]">{label}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        title="Вернуть в списки"
                        className="inline-flex rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
                        onClick={() =>
                          onPatchBoard((b) => {
                            b.excludedCrmUserIds = (b.excludedCrmUserIds || []).filter(
                              (x) => x !== uid,
                            );
                          })
                        }
                      >
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="mt-3 flex max-w-xl flex-wrap items-end gap-2">
          <label className="block min-w-[12rem] flex-1 text-sm">
            <span className="mb-1 block text-[var(--text-secondary)]">
              Добавить в исключения
            </span>
            <select
              className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-[var(--app-text)]"
              value={pickExcludeUserId}
              disabled={candidatesToExclude.length === 0}
              onChange={(e) => setPickExcludeUserId(e.target.value)}
            >
              <option value="">
                {candidatesToExclude.length === 0
                  ? "Нет доступных пользователей"
                  : "Выберите пользователя…"}
              </option>
              {candidatesToExclude.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName?.trim() || u.email || u.id}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            disabled={!pickExcludeUserId.trim()}
            onClick={() => {
              const id = pickExcludeUserId.trim();
              if (!id) return;
              onPatchBoard((b) => {
                const cur = b.excludedCrmUserIds || [];
                if (cur.includes(id)) return;
                b.excludedCrmUserIds = [...cur, id];
              });
              setPickExcludeUserId("");
            }}
          >
            Исключить
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 mt-0 text-sm font-semibold text-[var(--text-strong)]">
          Архив карточек
        </h3>
        <p className="mb-3 text-[0.8125rem] leading-snug text-[var(--text-muted)]">
          Для выбранной колонки можно включить автоархивацию: карточка попадет в архив,
          если не двигалась указанное время. Из архива карточки удаляются по сроку хранения.
        </p>
        <label className="mb-4 block max-w-xs text-sm">
          <span className="mb-1 block text-[var(--text-secondary)]">
            Хранить в архиве (лет)
          </span>
          <input
            type="number"
            min={1 / 365}
            max={30}
            step={0.01}
            value={retentionYears}
            onChange={(e) =>
              onPatchBoard((b) => {
                const y = Number(e.target.value);
                if (!Number.isFinite(y)) {
                  b.archiveRetentionDays = clampArchiveRetentionDays(365);
                  return;
                }
                const days = Math.round(y * 365);
                b.archiveRetentionDays = clampArchiveRetentionDays(days);
              })
            }
            className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
          />
        </label>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-[var(--text-muted)]">
              <th className="py-2 pr-2">Колонка</th>
              <th className="w-32 py-2 pr-2">Часов до архива</th>
              <th className="w-24 py-2 pr-2">Вкл.</th>
              <th className="w-10 py-2" />
            </tr>
          </thead>
          <tbody>
            {archiveRules.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border-subtle)]">
                <td className="py-2 pr-2">
                  <select
                    value={r.columnId}
                    onChange={(e) =>
                      onPatchBoard((b) => {
                        const x = (b.autoArchiveRules || []).find((y) => y.id === r.id);
                        if (x) x.columnId = e.target.value;
                      })
                    }
                    className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
                  >
                    {board.columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={1}
                    max={24 * 180}
                    value={r.idleHours}
                    onChange={(e) =>
                      onPatchBoard((b) => {
                        const x = (b.autoArchiveRules || []).find((y) => y.id === r.id);
                        if (!x) return;
                        const v = Number(e.target.value);
                        x.idleHours = Number.isFinite(v)
                          ? Math.max(1, Math.min(24 * 180, Math.round(v)))
                          : 24;
                      })
                    }
                    className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)]"
                  />
                </td>
                <td className="py-2 pr-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={r.enabled !== false}
                      onChange={(e) =>
                        onPatchBoard((b) => {
                          const x = (b.autoArchiveRules || []).find((y) => y.id === r.id);
                          if (x) x.enabled = e.target.checked;
                        })
                      }
                    />
                    <span>Да</span>
                  </label>
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    title="Удалить правило"
                    className="inline-flex rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
                    onClick={() =>
                      onPatchBoard((b) => {
                        b.autoArchiveRules = (b.autoArchiveRules || []).filter(
                          (x) => x.id !== r.id,
                        );
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
        <button
          type="button"
          className="mt-3 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
          onClick={() =>
            onPatchBoard((b) => {
              const firstColumnId = b.columns[0]?.id ?? "";
              if (!firstColumnId) return;
              b.autoArchiveRules = b.autoArchiveRules || [];
              b.autoArchiveRules.push({
                id: generateId("kar"),
                enabled: true,
                columnId: firstColumnId,
                idleHours: 24,
              });
            })
          }
        >
          + Добавить правило автоархивации
        </button>
      </section>
    </div>
  );
}
