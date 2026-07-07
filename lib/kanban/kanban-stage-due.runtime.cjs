/**
 * Runtime для deploy-скрипта (без TS). Держать в sync с kanban-stage-due.ts.
 * Меняет только поля этапного срока на KanbanCard в JSON канбана.
 */
const KANBAN_LEGACY_STAGE_DUE_CLEAR_VERSION = "20260707-v4";
const KANBAN_CLEAR_ALL_STAGE_DUE_MARKER_KEY =
  "kanban-clear-all-stage-due-20260707-v4";

function normalizeKanbanStageDueDate(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.slice(0, 10);
}

function getKanbanStageDue(card) {
  if (!card || typeof card !== "object") return "";
  const stage = normalizeKanbanStageDueDate(card.stageDueDate);
  if (stage) return stage;
  return normalizeKanbanStageDueDate(card.dueDate);
}

function clearKanbanStageDue(card) {
  if (!card || typeof card !== "object") return false;
  const had = Boolean(getKanbanStageDue(card));
  card.stageDueDate = "";
  card.dueDate = "";
  return had;
}

function forEachKanbanCardInState(state, fn) {
  for (const board of state.boards ?? []) {
    for (const col of board.columns ?? []) {
      for (const card of col.cards ?? []) fn(card);
    }
    for (const ac of board.archivedCards ?? []) {
      if (ac?.card) fn(ac.card);
    }
    for (const sc of board.stoppedCards ?? []) {
      if (sc?.card) fn(sc.card);
    }
  }
}

function clearAllKanbanStageDueDatesInKanbanState(state) {
  let clearedCount = 0;
  forEachKanbanCardInState(state, (card) => {
    if (clearKanbanStageDue(card)) clearedCount += 1;
  });
  return clearedCount;
}

function applyKanbanStageDueClearToState(state) {
  const clearedCount = clearAllKanbanStageDueDatesInKanbanState(state);
  state.legacyStageDueClearVersion = KANBAN_LEGACY_STAGE_DUE_CLEAR_VERSION;
  return clearedCount;
}

module.exports = {
  KANBAN_LEGACY_STAGE_DUE_CLEAR_VERSION,
  KANBAN_CLEAR_ALL_STAGE_DUE_MARKER_KEY,
  clearKanbanStageDue,
  clearAllKanbanStageDueDatesInKanbanState,
  applyKanbanStageDueClearToState,
};
