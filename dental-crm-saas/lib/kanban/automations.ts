import type {
  KanbanAutomationAction,
  KanbanAutomationEvent,
  KanbanAutomationRule,
  KanbanBoard,
  KanbanCard,
} from "./types";
import {
  actorUserId,
  findCard,
  generateId,
  pushActivity,
  tryBlockCard,
} from "./model";

const MAX_DEPTH = 8;

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
    case "set_due_in_days": {
      card.dueDate = addDaysISO(action.days);
      card.updatedAt = new Date().toISOString();
      return true;
    }
    case "clear_due": {
      if (!card.dueDate) return false;
      card.dueDate = "";
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
    default:
      return false;
  }
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
