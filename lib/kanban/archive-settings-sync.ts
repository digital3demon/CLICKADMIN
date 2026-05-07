import type { KanbanAppState, KanbanAutoArchiveRule, KanbanBoard } from "@/lib/kanban/types";
import { clampArchiveRetentionDays } from "@/lib/kanban/model";

export const KANBAN_ARCHIVE_SETTINGS_KEY = "kanbanArchiveSettingsV1";

export type KanbanArchiveBoardSettings = {
  boardTitle?: string;
  archiveRetentionDays: number;
  autoArchiveRules: KanbanAutoArchiveRule[];
};

export type KanbanArchiveSettingsSnapshot = {
  version: 1;
  boards: Record<string, KanbanArchiveBoardSettings>;
};

function rulesEqual(a: KanbanAutoArchiveRule[], b: KanbanAutoArchiveRule[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;
    if (
      left.id !== right.id ||
      left.enabled !== right.enabled ||
      left.columnId !== right.columnId ||
      left.idleHours !== right.idleHours
    ) {
      return false;
    }
  }
  return true;
}

function normalizeArchiveRule(raw: KanbanAutoArchiveRule): KanbanAutoArchiveRule {
  const idle = Number.isFinite(raw.idleHours) ? Math.round(raw.idleHours) : 24;
  return {
    id: String(raw.id || "").trim(),
    enabled: raw.enabled !== false,
    columnId: String(raw.columnId || "").trim(),
    idleHours: Math.max(1, Math.min(24 * 180, idle)),
  };
}

function normalizeRulesForBoard(
  board: KanbanBoard,
  rules: KanbanAutoArchiveRule[],
): KanbanAutoArchiveRule[] {
  const validCols = new Set(board.columns.map((c) => c.id));
  return rules
    .map((r) => normalizeArchiveRule(r))
    .filter((r) => r.id && r.columnId && validCols.has(r.columnId));
}

export function extractKanbanArchiveSettings(
  state: KanbanAppState,
): KanbanArchiveSettingsSnapshot {
  const boards: Record<string, KanbanArchiveBoardSettings> = {};
  for (const board of state.boards) {
    boards[board.id] = {
      boardTitle: String(board.title || "").trim(),
      archiveRetentionDays: clampArchiveRetentionDays(board.archiveRetentionDays),
      autoArchiveRules: normalizeRulesForBoard(board, board.autoArchiveRules || []),
    };
  }
  return { version: 1, boards };
}

export function applyKanbanArchiveSettings(
  state: KanbanAppState,
  snapshot: unknown,
): KanbanAppState {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return state;
  }
  const raw = snapshot as {
    version?: unknown;
    boards?: Record<string, KanbanArchiveBoardSettings> | undefined;
  };
  if (raw.version !== 1 || !raw.boards || typeof raw.boards !== "object") {
    return state;
  }
  const next = structuredClone(state);
  let changed = false;
  const normalizedTitleToSettings = new Map<string, KanbanArchiveBoardSettings>();
  for (const item of Object.values(raw.boards)) {
    const key = String(item?.boardTitle || "").trim().toLowerCase();
    if (!key || normalizedTitleToSettings.has(key)) continue;
    normalizedTitleToSettings.set(key, item);
  }
  for (const board of next.boards) {
    const src =
      raw.boards[board.id] ??
      normalizedTitleToSettings.get(String(board.title || "").trim().toLowerCase());
    if (!src) continue;
    const nextRetention = clampArchiveRetentionDays(src.archiveRetentionDays);
    const nextRules = normalizeRulesForBoard(
      board,
      Array.isArray(src.autoArchiveRules) ? src.autoArchiveRules : [],
    );
    if (board.archiveRetentionDays !== nextRetention) {
      board.archiveRetentionDays = nextRetention;
      changed = true;
    }
    if (!rulesEqual(board.autoArchiveRules || [], nextRules)) {
      board.autoArchiveRules = nextRules;
      changed = true;
    }
  }
  return changed ? next : state;
}

