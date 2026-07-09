/**
 * Персональный UI канбана (не доска/карточки).
 * Хранится в client-state scope=user, ключ kanbanBoardUiV1.
 * Tenant kanbanAppStateV3 — только общее содержимое досок.
 */
import type {
  KanbanAppState,
  KanbanFilterTemplate,
  KanbanFilters,
} from "@/lib/kanban/types";

/** Дублируем id из model, чтобы не тянуть циклический импорт model ↔ ui-state. */
const AGGREGATE_BOARD_IDS = new Set([
  "kanban_board_my_cards",
  "kanban_board_distribute",
]);

export const KANBAN_BOARD_UI_KEY = "kanbanBoardUiV1" as const;

export type KanbanBoardUiState = {
  version: 1;
  filters: KanbanFilters;
  filterTemplates: KanbanFilterTemplate[];
  activeBoardId: string;
  viewMode: "board" | "calendar" | "list";
  calendarMonth: { y: number; m: number };
  search: string;
};

export function emptyKanbanFilters(): KanbanFilters {
  return {
    cardTypeId: "",
    due: "",
    assigneeUserId: "",
    participantUserId: "",
  };
}

function normalizeFilters(raw: unknown): KanbanFilters {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    cardTypeId: String(f.cardTypeId ?? ""),
    due: String(f.due ?? ""),
    assigneeUserId: String(f.assigneeUserId ?? ""),
    participantUserId: String(f.participantUserId ?? ""),
  };
}

function normalizeFilterTemplates(raw: unknown): KanbanFilterTemplate[] {
  if (!Array.isArray(raw)) return [];
  const out: KanbanFilterTemplate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    if (typeof t.id !== "string" || typeof t.name !== "string") continue;
    out.push({
      id: t.id,
      name: String(t.name).slice(0, 80),
      filters: normalizeFilters(t.filters),
    });
    if (out.length >= 20) break;
  }
  return out;
}

function normalizeViewMode(raw: unknown): KanbanBoardUiState["viewMode"] {
  if (raw === "calendar" || raw === "list" || raw === "board") return raw;
  return "board";
}

function normalizeCalendarMonth(raw: unknown): { y: number; m: number } {
  const now = new Date();
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const y = Number(o.y);
  const m = Number(o.m);
  return {
    y: Number.isFinite(y) ? y : now.getFullYear(),
    m: Number.isFinite(m) && m >= 0 && m <= 11 ? m : now.getMonth(),
  };
}

export function defaultKanbanBoardUiState(
  activeBoardId = "",
): KanbanBoardUiState {
  const now = new Date();
  return {
    version: 1,
    filters: emptyKanbanFilters(),
    filterTemplates: [],
    activeBoardId,
    viewMode: "board",
    calendarMonth: { y: now.getFullYear(), m: now.getMonth() },
    search: "",
  };
}

/** null — payload отсутствует или не объект (нужна миграция с tenant). */
export function normalizeKanbanBoardUiState(
  raw: unknown,
): KanbanBoardUiState | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    version: 1,
    filters: normalizeFilters(o.filters),
    filterTemplates: normalizeFilterTemplates(o.filterTemplates),
    activeBoardId: String(o.activeBoardId ?? ""),
    viewMode: normalizeViewMode(o.viewMode),
    calendarMonth: normalizeCalendarMonth(o.calendarMonth),
    search: String(o.search ?? ""),
  };
}

export function extractKanbanBoardUiState(
  state: KanbanAppState,
): KanbanBoardUiState {
  return {
    version: 1,
    filters: normalizeFilters(state.filters),
    filterTemplates: normalizeFilterTemplates(state.filterTemplates),
    activeBoardId: String(state.activeBoardId ?? ""),
    viewMode: normalizeViewMode(state.viewMode),
    calendarMonth: normalizeCalendarMonth(state.calendarMonth),
    search: String(state.search ?? ""),
  };
}

export function applyKanbanBoardUiState(
  state: KanbanAppState,
  ui: KanbanBoardUiState,
): KanbanAppState {
  const next = structuredClone(state);
  next.filters = { ...ui.filters };
  next.filterTemplates = ui.filterTemplates.map((t) => ({
    ...t,
    filters: { ...t.filters },
  }));
  next.viewMode = ui.viewMode;
  next.calendarMonth = { ...ui.calendarMonth };
  next.search = ui.search;
  if (ui.activeBoardId) {
    const inBoards = next.boards.some((b) => b.id === ui.activeBoardId);
    if (inBoards || AGGREGATE_BOARD_IDS.has(ui.activeBoardId)) {
      next.activeBoardId = ui.activeBoardId;
    }
  }
  return next;
}

export function hasNonDefaultKanbanBoardUi(ui: KanbanBoardUiState): boolean {
  if (ui.search.trim()) return true;
  if (ui.viewMode !== "board") return true;
  if (ui.filterTemplates.length > 0) return true;
  if (ui.activeBoardId.trim()) return true;
  const f = ui.filters;
  return Boolean(
    f.cardTypeId || f.due || f.assigneeUserId || f.participantUserId,
  );
}

/** Сброс персональных полей перед записью в tenant kanbanAppStateV3. */
export function stripPersonalKanbanUiForTenant(
  state: KanbanAppState,
): KanbanAppState {
  const now = new Date();
  const firstBoardId = state.boards[0]?.id ?? state.activeBoardId;
  return {
    ...state,
    search: "",
    filters: emptyKanbanFilters(),
    filterTemplates: [],
    viewMode: "board",
    calendarMonth: { y: now.getFullYear(), m: now.getMonth() },
    activeBoardId: firstBoardId,
  };
}
