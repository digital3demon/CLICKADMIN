/**
 * Напоминание о срокe карточки (МСК, календарный день).
 * Кому: ответственные и участники. Повтор в тот же день не шлём.
 */
import { getKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import { isKanbanAggregateBoardId } from "@/lib/kanban/model";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";

export const KANBAN_DEADLINE_REMINDER_STATE_KEY = "kanbanDeadlineRemindersV1";

export type KanbanDeadlineReminderSentState = {
  ymd: string;
  keys: string[];
};

export function deadlineReminderSentKey(cardId: string, userId: string): string {
  return `${cardId}:${userId}`;
}

export function parseDeadlineReminderSentState(
  raw: unknown,
): KanbanDeadlineReminderSentState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ymd: "", keys: [] };
  }
  const o = raw as Record<string, unknown>;
  const ymd = typeof o.ymd === "string" ? o.ymd.trim().slice(0, 10) : "";
  const keys = Array.isArray(o.keys)
    ? o.keys.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  return { ymd, keys };
}

export function collectDeadlineReminderJobs(
  state: KanbanAppState,
  todayYmd: string,
): Array<{ card: KanbanCard; boardId: string; userIds: string[] }> {
  const day = todayYmd.trim().slice(0, 10);
  if (!day) return [];
  const out: Array<{ card: KanbanCard; boardId: string; userIds: string[] }> = [];
  for (const board of state.boards ?? []) {
    if (isKanbanAggregateBoardId(board.id)) continue;
    for (const col of board.columns ?? []) {
      for (const card of col.cards ?? []) {
        if (card.blocked) continue;
        const due = getKanbanStageDue(card);
        if (due !== day) continue;
        const userIds = [
          ...new Set(
            [...(card.assignees || []), ...(card.participants || [])].filter(
              Boolean,
            ),
          ),
        ];
        if (userIds.length === 0) continue;
        out.push({ card, boardId: board.id, userIds });
      }
    }
  }
  return out;
}
