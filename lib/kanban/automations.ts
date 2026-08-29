import type {
  KanbanAutomationAction,
  KanbanAutomationEvent,
  KanbanAutomationRule,
  KanbanAutomationTrigger,
  KanbanBoard,
  KanbanCard,
} from "./types";
import { clearKanbanStageDue, setKanbanStageDue } from "./kanban-stage-due";
import {
  actorUserId,
  archiveCardByIdOnBoard,
  findCard,
  generateId,
  performUnblock,
  pushActivity,
  tryBlockCard,
} from "./model";

const MAX_DEPTH = 8;
/** Как Kaiten `archive_after_*`: 0 = сразу, иначе простой в колонке правила. */
export const KANBAN_ARCHIVE_AFTER_HOURS_MAX = 24 * 180;

export function normalizeArchiveAfterHours(raw: unknown): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(KANBAN_ARCHIVE_AFTER_HOURS_MAX, n);
}

export const KANBAN_AUTOMATION_TRIGGER_OPTIONS: {
  id: KanbanAutomationTrigger;
  label: string;
}[] = [
  { id: "card_moved_to_column", label: "Карточку перенесли в колонку" },
  { id: "card_created_in_column", label: "Карточку создали в колонке" },
  { id: "card_blocked", label: "Карточку заблокировали" },
  { id: "card_unblocked", label: "С карточки сняли блокировку" },
];

export const KANBAN_AUTOMATION_ACTION_OPTIONS: {
  id: KanbanAutomationAction["type"];
  label: string;
}[] = [
  { id: "move_to_column", label: "Перенести в колонку" },
  { id: "archive", label: "Поместить в архив (срок)" },
  { id: "add_assignee", label: "Добавить ответственного" },
  { id: "remove_assignee", label: "Снять ответственного" },
  { id: "add_participant", label: "Добавить участника" },
  { id: "remove_participant", label: "Снять участника" },
  { id: "set_due_in_days", label: "Срок через N дней" },
  { id: "clear_due", label: "Снять срок" },
  { id: "set_urgent", label: "Отметить срочной (ASAP)" },
  { id: "clear_urgent", label: "Снять метку «срочно»" },
  { id: "add_comment", label: "Комментарий в чат" },
  { id: "set_card_type", label: "Установить тип карточки" },
  { id: "block", label: "Заблокировать (причина)" },
  { id: "unblock", label: "Снять блокировку" },
  { id: "complete_checklists", label: "Отметить все пункты чеклиста" },
];

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(0, Math.floor(days)));
  return d.toISOString().slice(0, 10);
}

export function createEmptyAutomationRule(
  board: KanbanBoard,
): KanbanAutomationRule {
  const colId = board.columns[0]?.id ?? "";
  return {
    id: generateId("auto"),
    enabled: true,
    name: "Новое правило",
    boardId: board.id,
    trigger: "card_moved_to_column",
    columnId: colId,
    fromColumnId: "",
    cardTypeId: "",
    actions: [],
  };
}

function ruleMatches(
  rule: KanbanAutomationRule,
  event: KanbanAutomationEvent,
  board: KanbanBoard,
): boolean {
  if (!rule.enabled) return false;
  if (rule.trigger !== event.type) return false;
  if (rule.boardId.trim() && rule.boardId !== board.id) return false;

  const card = findCard(board, event.cardId)?.card;
  if (!card) return false;

  if (rule.cardTypeId.trim()) {
    if (String(card.cardTypeId || "") !== rule.cardTypeId.trim()) return false;
  }

  if (event.type === "card_moved_to_column") {
    if (rule.columnId !== event.toColumnId) return false;
    if (rule.fromColumnId.trim() && rule.fromColumnId !== event.fromColumnId) {
      return false;
    }
    return true;
  }

  if (event.type === "card_created_in_column") {
    return rule.columnId === event.columnId;
  }

  if (event.type === "card_blocked" || event.type === "card_unblocked") {
    if (rule.columnId.trim() && rule.columnId !== event.columnId) return false;
    return true;
  }

  return false;
}

function moveCardToColumn(
  board: KanbanBoard,
  cardId: string,
  targetColumnId: string,
  activityActorLabel?: string,
): boolean {
  const found = findCard(board, cardId);
  if (!found) return false;
  const targetCol = board.columns.find((c) => c.id === targetColumnId);
  if (!targetCol) return false;
  if (found.col.id === targetColumnId) return false;
  const card = found.card;
  found.col.cards = found.col.cards.filter((c) => c.id !== cardId);
  targetCol.cards.push(card);
  const now = new Date().toISOString();
  card.lastMovedAt = now;
  card.updatedAt = now;
  pushActivity(
    card,
    `Перемещена в «${targetCol.title}»`,
    actorUserId(board),
    board,
    activityActorLabel,
  );
  return true;
}

function applyNonMoveAction(
  board: KanbanBoard,
  card: KanbanCard,
  action: KanbanAutomationAction,
  actor: string,
  activityActorLabel?: string,
): boolean {
  switch (action.type) {
    case "move_to_column":
      return false;
    case "add_assignee": {
      if (!action.userId.trim()) return false;
      const a = card.assignees || [];
      if (a.includes(action.userId)) return false;
      card.assignees = [...a, action.userId];
      card.updatedAt = new Date().toISOString();
      return true;
    }
    case "remove_assignee": {
      const uid = action.userId.trim();
      if (!uid) return false;
      const a = card.assignees || [];
      if (!a.includes(uid)) return false;
      card.assignees = a.filter((id) => id !== uid);
      card.updatedAt = new Date().toISOString();
      return true;
    }
    case "add_participant": {
      if (!action.userId.trim()) return false;
      const p = card.participants || [];
      if (p.includes(action.userId)) return false;
      card.participants = [...p, action.userId];
      card.updatedAt = new Date().toISOString();
      return true;
    }
    case "remove_participant": {
      const uid = action.userId.trim();
      if (!uid) return false;
      const p = card.participants || [];
      if (!p.includes(uid)) return false;
      card.participants = p.filter((id) => id !== uid);
      card.updatedAt = new Date().toISOString();
      return true;
    }
    case "set_due_in_days": {
      setKanbanStageDue(card, addDaysISO(action.days));
      card.updatedAt = new Date().toISOString();
      return true;
    }
    case "clear_due": {
      if (!clearKanbanStageDue(card)) return false;
      card.updatedAt = new Date().toISOString();
      return true;
    }
    case "set_urgent": {
      if (card.urgent) return false;
      card.urgent = true;
      card.updatedAt = new Date().toISOString();
      return true;
    }
    case "clear_urgent": {
      if (!card.urgent) return false;
      card.urgent = false;
      card.updatedAt = new Date().toISOString();
      return true;
    }
    case "add_comment": {
      const t = (action.text || "").trim();
      if (!t) return false;
      card.comments = card.comments || [];
      card.comments.push({
        id: generateId("cm"),
        userId: actor,
        text: t,
        createdAt: new Date().toISOString(),
      });
      card.updatedAt = new Date().toISOString();
      return true;
    }
    case "set_card_type": {
      if (!action.cardTypeId.trim()) return false;
      card.cardTypeId = action.cardTypeId.trim();
      card.updatedAt = new Date().toISOString();
      return true;
    }
    case "block": {
      const r = (action.reason || "").trim();
      if (!r) return false;
      if (card.blocked) return false;
      return tryBlockCard(card, board, r, activityActorLabel);
    }
    case "unblock": {
      if (!card.blocked) return false;
      performUnblock(card, board, activityActorLabel);
      return true;
    }
    case "complete_checklists": {
      const items = card.checklist || [];
      if (items.length === 0) return false;
      const now = new Date().toISOString();
      let changed = false;
      for (const it of items) {
        if (it.completed) continue;
        it.completed = true;
        it.completedAt = now;
        changed = true;
      }
      if (!changed) return false;
      card.updatedAt = now;
      return true;
    }
    case "archive": {
      const hours = normalizeArchiveAfterHours(action.afterHours);
      if (hours > 0) {
        pushActivity(
          card,
          `В архив через ${hours} ч`,
          actor,
          board,
          activityActorLabel,
        );
        return true;
      }
      return archiveCardByIdOnBoard(board, card.id, "auto");
    }
    default:
      return false;
  }
}

function cardIdleSince(card: KanbanCard, now: Date): number {
  const raw = card.lastMovedAt || card.updatedAt || card.createdAt;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return 0;
  return now.getTime() - d.getTime();
}

/**
 * Отложенный архив (Kaiten archive_after на done-колонке):
 * карточка всё ещё в колонке правила и простояла afterHours.
 */
export function applyKanbanAutomationDelayedArchives(
  board: KanbanBoard,
  now = new Date(),
): number {
  let archived = 0;
  for (const rule of board.automations || []) {
    if (!rule?.enabled) continue;
    if (rule.boardId.trim() && rule.boardId !== board.id) continue;
    if (
      rule.trigger !== "card_moved_to_column" &&
      rule.trigger !== "card_created_in_column"
    ) {
      continue;
    }
    const col = board.columns.find((c) => c.id === rule.columnId);
    if (!col) continue;
    for (const action of rule.actions || []) {
      if (action.type !== "archive") continue;
      const hours = normalizeArchiveAfterHours(action.afterHours);
      if (hours <= 0) continue;
      const thresholdMs = hours * 60 * 60 * 1000;
      const typeFilter = rule.cardTypeId.trim();
      for (const card of [...col.cards]) {
        if (typeFilter && String(card.cardTypeId || "") !== typeFilter) continue;
        if (cardIdleSince(card, now) < thresholdMs) continue;
        if (archiveCardByIdOnBoard(board, card.id, "auto")) archived += 1;
      }
    }
  }
  return archived;
}

/**
 * Выполняет правила доски для события. Действие `move_to_column` может вызвать каскад для новой колонки.
 */
export function runKanbanAutomations(
  board: KanbanBoard,
  event: KanbanAutomationEvent,
  depth = 0,
  activityActorLabel?: string,
): void {
  if (depth > MAX_DEPTH) return;
  const rules = (board.automations || []).filter((r) => r?.enabled);
  const actor = actorUserId(board);

  for (const rule of rules) {
    if (!ruleMatches(rule, event, board)) continue;

    let changed = false;

    for (const action of rule.actions) {
      const cardNow = findCard(board, event.cardId)?.card;
      if (!cardNow) break;

      if (action.type === "move_to_column") {
        const fc = findCard(board, event.cardId)?.col;
        if (!fc) break;
        const fromId = fc.id;
        if (fromId === action.columnId) continue;
        if (!moveCardToColumn(board, event.cardId, action.columnId, activityActorLabel))
          continue;
        changed = true;
        runKanbanAutomations(
          board,
          {
            type: "card_moved_to_column",
            cardId: event.cardId,
            fromColumnId: fromId,
            toColumnId: action.columnId,
          },
          depth + 1,
          activityActorLabel,
        );
        continue;
      }

      if (applyNonMoveAction(board, cardNow, action, actor, activityActorLabel)) {
        changed = true;
      }
    }

    if (changed) {
      const c = findCard(board, event.cardId)?.card;
      if (c) {
        pushActivity(c, `Автоматизация «${rule.name}»`, actor, board, activityActorLabel);
      }
    }
  }
}
