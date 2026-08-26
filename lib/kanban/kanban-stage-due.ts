/**
 * Этапный срок карточки канбана (поле «Срок» в UI) = Kaiten `due_date`.
 *
 * НЕ лабораторный срок наряда (`Order.dueDate`, в заголовке карточки).
 * НЕ дата записи пациента (`Order.appointmentDate`).
 * Миграции и очистка здесь меняют только `KanbanCard` внутри kanbanAppStateV3 / standalone payload.
 */
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";

/** Канон YYYY-MM-DD для этапного срока. */
export function normalizeKanbanStageDueDate(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  return s.slice(0, 10);
}

/** Чтение этапного срока: `stageDueDate`, иначе legacy `dueDate` (только чтение). */
export function getKanbanStageDue(card: KanbanCard): string {
  const stage = normalizeKanbanStageDueDate(card.stageDueDate);
  if (stage) return stage;
  return normalizeKanbanStageDueDate(card.dueDate);
}

/** Запись этапного срока; legacy `dueDate` сбрасывается. */
export function setKanbanStageDue(card: KanbanCard, ymd: string): void {
  card.stageDueDate = normalizeKanbanStageDueDate(ymd);
  card.dueDate = "";
}

/** Очистка этапного срока на карточке канбана. */
export function clearKanbanStageDue(card: KanbanCard): boolean {
  const had = Boolean(getKanbanStageDue(card));
  card.stageDueDate = "";
  card.dueDate = "";
  return had;
}

export function hasKanbanStageDue(card: KanbanCard): boolean {
  return Boolean(getKanbanStageDue(card));
}

/** Обход всех карточек в JSON канбана (колонки, архив, СТОП). */
export function forEachKanbanCardInState(
  state: KanbanAppState,
  fn: (card: KanbanCard) => void,
): void {
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

export const KANBAN_LEGACY_STAGE_DUE_CLEAR_VERSION = "20260707-v4" as const;

export const KANBAN_CLEAR_ALL_STAGE_DUE_MARKER_KEY =
  "kanban-clear-all-stage-due-20260707-v4" as const;

/** Массовый сброс сроков отключён — не меняет карточки. */
export function clearAllKanbanStageDueDatesInKanbanState(
  state: KanbanAppState,
): { state: KanbanAppState; clearedCount: number } {
  return { state, clearedCount: 0 };
}

/**
 * Больше не чистит сроки: только ставит маркер, чтобы старый wipe не повторился.
 * Скрипт массовой очистки сроков отключён.
 */
export function applyKanbanLegacyStageDueClearMigration(
  state: KanbanAppState,
): { state: KanbanAppState; changed: boolean; clearedCount: number } {
  if (state.legacyStageDueClearVersion === KANBAN_LEGACY_STAGE_DUE_CLEAR_VERSION) {
    return { state, changed: false, clearedCount: 0 };
  }
  const next = structuredClone(state);
  next.legacyStageDueClearVersion = KANBAN_LEGACY_STAGE_DUE_CLEAR_VERSION;
  return { state: next, changed: true, clearedCount: 0 };
}
