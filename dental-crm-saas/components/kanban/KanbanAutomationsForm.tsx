"use client";

import type {
  KanbanAutomationAction,
  KanbanBoard,
  KanbanAutomationRule,
} from "@/lib/kanban/types";
import { createEmptyAutomationRule } from "@/lib/kanban/automations";
import { IconPlus, IconTrash } from "./kanban-icons";

type Props = {
  board: KanbanBoard;
  onPatchBoard: (fn: (b: KanbanBoard) => void) => void;
};

const ACTION_TYPES: { id: KanbanAutomationAction["type"]; label: string }[] = [
  { id: "move_to_column", label: "Перенести в колонку" },
  { id: "add_assignee", label: "Добавить ответственного" },
  { id: "set_due_in_days", label: "Срок через N дней" },
  { id: "clear_due", label: "Сбросить срок" },
  { id: "add_comment", label: "Комментарий в чат" },
  { id: "set_card_type", label: "Установить тип карточки" },
  { id: "block", label: "Заблокировать (причина)" },
];

function newAction(board: KanbanBoard): KanbanAutomationAction {
  const col = board.columns[0]?.id ?? "";
  return { type: "move_to_column", columnId: col };
}

function KanbanActionEditor({
  board,
  action,
  onChange,
}: {
  board: KanbanBoard;
  action: KanbanAutomationAction;
  onChange: (next: KanbanAutomationAction) => void;
}) {
  const cols = board.columns || [];
  const users = board.users || [];
  const types = board.cardTypes || [];

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] p-2">
      <label className="flex min-w-[10rem] flex-col gap-0.5 text-[0.65rem] font-medium uppercase text-[var(--text-muted)]">
        Действие
        <select
          className="rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--app-text)]"
          value={action.type}
          onChange={(e) => {
            const t = e.target.value as KanbanAutomationAction["type"];
            if (t === "move_to_column") onChange({ type: "move_to_column", columnId: cols[0]?.id ?? "" });
            else if (t === "add_assignee") onChange({ type: "add_assignee", userId: users[0]?.id ?? "" });
            else if (t === "set_due_in_days") onChange({ type: "set_due_in_days", days: 7 });
            else if (t === "clear_due") onChange({ type: "clear_due" });
            else if (t === "add_comment") onChange({ type: "add_comment", text: "" });
            else if (t === "set_card_type") onChange({ type: "set_card_type", cardTypeId: types[0]?.id ?? "" });
            else if (t === "block") onChange({ type: "block", reason: "" });
            else onChange(newAction(board));
          }}
        >
          {ACTION_TYPES.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      {action.type === "move_to_column" ? (
        <label className="flex min-w-[8rem] flex-col gap-0.5 text-[0.65rem] font-medium uppercase text-[var(--text-muted)]">
          Колонка
          <select
            className="rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
            value={action.columnId}
            onChange={(e) => onChange({ ...action, columnId: e.target.value })}
          >
            {cols.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {action.type === "add_assignee" ? (
        <label className="flex min-w-[8rem] flex-col gap-0.5 text-[0.65rem] font-medium uppercase text-[var(--text-muted)]">
          Участник
          <select
            className="rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
            value={action.userId}
            onChange={(e) => onChange({ ...action, userId: e.target.value })}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {action.type === "set_due_in_days" ? (
        <label className="flex w-24 flex-col gap-0.5 text-[0.65rem] font-medium uppercase text-[var(--text-muted)]">
          Дней
          <input
            type="number"
            min={0}
            className="rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
            value={action.days}
            onChange={(e) =>
              onChange({ ...action, days: Number(e.target.value) || 0 })
            }
          />
        </label>
      ) : null}
      {action.type === "add_comment" ? (
        <label className="flex min-w-[12rem] flex-1 flex-col gap-0.5 text-[0.65rem] font-medium uppercase text-[var(--text-muted)]">
          Текст
          <input
            type="text"
            className="rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
            value={action.text}
            onChange={(e) => onChange({ ...action, text: e.target.value })}
            placeholder="Текст комментария"
          />
        </label>
      ) : null}
      {action.type === "set_card_type" ? (
        <label className="flex min-w-[8rem] flex-col gap-0.5 text-[0.65rem] font-medium uppercase text-[var(--text-muted)]">
          Тип
          <select
            className="rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
            value={action.cardTypeId}
            onChange={(e) => onChange({ ...action, cardTypeId: e.target.value })}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {action.type === "block" ? (
        <label className="flex min-w-[12rem] flex-1 flex-col gap-0.5 text-[0.65rem] font-medium uppercase text-[var(--text-muted)]">
          Причина
          <input
            type="text"
            className="rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
            value={action.reason}
            onChange={(e) => onChange({ ...action, reason: e.target.value })}
            placeholder="Обязательно для блокировки"
          />
        </label>
      ) : null}
    </div>
  );
}

export function KanbanAutomationsForm({ board, onPatchBoard }: Props) {
  const rules = board.automations || [];
  const cols = board.columns || [];
  const types = board.cardTypes || [];

  const updateRule = (ruleId: string, patch: Partial<KanbanAutomationRule>) => {
    onPatchBoard((b) => {
      const list = b.automations || [];
      const r = list.find((x) => x.id === ruleId);
      if (!r) return;
      Object.assign(r, patch);
    });
  };

  const removeRule = (ruleId: string) => {
    onPatchBoard((b) => {
      b.automations = (b.automations || []).filter((x) => x.id !== ruleId);
    });
  };

  const addRule = () => {
    onPatchBoard((b) => {
      if (!b.automations) b.automations = [];
      b.automations.push(createEmptyAutomationRule(b));
    });
  };

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-[var(--text-secondary)]">
        Правила выполняются при переносе карточки между колонками или при создании карточки в колонке.
        Условия: колонка (и при переносе — опционально «из какой колонки»), опционально фильтр по типу
        карточки.         Действия выполняются по порядку; «Перенести в колонку» может запустить другие правила
        для новой колонки (ограничение глубины — 8 шагов).
      </p>

      {rules.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Правил пока нет.</p>
      ) : null}

      <ul className="m-0 list-none space-y-4 p-0">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) =>
                    updateRule(rule.id, { enabled: e.target.checked })
                  }
                />
                Включено
              </label>
              <input
                type="text"
                className="min-w-[12rem] flex-1 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm"
                value={rule.name}
                placeholder="Название правила"
                onChange={(e) => updateRule(rule.id, { name: e.target.value })}
              />
              <button
                type="button"
                className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-red-700"
                title="Удалить правило"
                onClick={() => {
                  if (window.confirm("Удалить это правило?")) removeRule(rule.id);
                }}
              >
                <IconTrash />
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-[0.65rem] font-medium uppercase text-[var(--text-muted)]">
                Когда
                <select
                  className="rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"
                  value={rule.trigger}
                  onChange={(e) =>
                    updateRule(rule.id, {
                      trigger: e.target.value as KanbanAutomationRule["trigger"],
                    })
                  }
                >
                  <option value="card_moved_to_column">Карточку перенесли в колонку</option>
                  <option value="card_created_in_column">Карточку создали в колонке</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[0.65rem] font-medium uppercase text-[var(--text-muted)]">
                Колонка
                <select
                  className="rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"
                  value={rule.columnId}
                  onChange={(e) => updateRule(rule.id, { columnId: e.target.value })}
                >
                  {cols.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className={`flex flex-col gap-1 text-[0.65rem] font-medium uppercase text-[var(--text-muted)] ${
                  rule.trigger === "card_created_in_column" ? "opacity-40" : ""
                }`}
              >
                Из колонки (пусто = любая)
                <select
                  className="rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"
                  disabled={rule.trigger === "card_created_in_column"}
                  value={rule.fromColumnId}
                  onChange={(e) =>
                    updateRule(rule.id, { fromColumnId: e.target.value })
                  }
                >
                  <option value="">— любая —</option>
                  {cols.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[0.65rem] font-medium uppercase text-[var(--text-muted)]">
                Тип карточки (пусто = любой)
                <select
                  className="rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"
                  value={rule.cardTypeId}
                  onChange={(e) =>
                    updateRule(rule.id, { cardTypeId: e.target.value })
                  }
                >
                  <option value="">— любой —</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-3">
              <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Тогда
              </div>
              <ul className="mt-2 space-y-2">
                {(rule.actions ?? []).map((act, ix) => (
                  <li key={ix} className="flex flex-wrap items-start gap-2">
                    <KanbanActionEditor
                      board={board}
                      action={act}
                      onChange={(next) => {
                        onPatchBoard((b) => {
                          const r = (b.automations || []).find((x) => x.id === rule.id);
                          if (!r?.actions) return;
                          r.actions[ix] = next;
                        });
                      }}
                    />
                    <button
                      type="button"
                      className="mt-6 rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                      title="Убрать действие"
                      onClick={() => {
                        onPatchBoard((b) => {
                          const r = (b.automations || []).find((x) => x.id === rule.id);
                          if (!r?.actions) return;
                          r.actions.splice(ix, 1);
                        });
                      }}
                    >
                      <IconTrash />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 py-1.5 text-xs font-medium hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  onPatchBoard((b) => {
                    const r = (b.automations || []).find((x) => x.id === rule.id);
                    if (!r) return;
                    if (!r.actions) r.actions = [];
                    r.actions.push(newAction(b));
                  });
                }}
              >
                <IconPlus /> Действие
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
        onClick={addRule}
      >
        <IconPlus /> Добавить правило
      </button>
    </div>
  );
}
