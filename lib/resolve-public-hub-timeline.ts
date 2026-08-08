import type { KanbanBoard } from "@/lib/kanban/types";
import { normalizeKanbanColumnTitle } from "@/lib/kaiten-column-title";
import { LAB_WORK_STATUS_LABELS } from "@/lib/lab-work-status";
import { isHandedToAdminsKaitenColumnTitle } from "@/lib/sticker-public-client-copy";
import {
  DEFAULT_PUBLIC_HUB_TIMELINE,
  type PublicHubColumnRef,
  type PublicHubTimelineCondition,
  type PublicHubTimelineConfig,
  type PublicHubTimelineRow,
} from "@/lib/sticker-public-hub-timeline";
import { KANBAN_MOVE_TO_COLUMN_RE } from "@/lib/sticker-public-milestones";

export type ResolvedTimelineRow = {
  id: string;
  label: string;
  at: string | null;
  /** Пояснение при fallback (например «Поступление» без workReceivedAt). */
  note?: string;
};

export type ResolvePublicHubTimelineInput = {
  config?: PublicHubTimelineConfig | null;
  order: {
    createdAt: string;
    workReceivedAt: string | null;
  };
  kanbanActivity: Array<{ at?: string; text?: string }>;
  revisionColumnRows: Array<{ at: Date; column: string | null }>;
  revisionFieldRows: Array<{
    at: Date;
    isUrgent?: boolean | null;
    urgentCoefficient?: number | null;
  }>;
  /** Для mode:next — порядок колонок на досках tenant. */
  kanbanBoards?: KanbanBoard[];
};

const KANBAN_BLOCKED_RE = /^Карточка заблокирована:/u;

function normCol(title: string | null | undefined): string {
  return normalizeKanbanColumnTitle(title ?? "");
}

function toIso(at: string | Date | undefined | null): string | null {
  if (!at) return null;
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function columnTitleMatches(
  actualTitle: string | null | undefined,
  ref: PublicHubColumnRef,
): boolean {
  if (ref.mode === "any") return true;
  if (ref.mode === "next") return false;
  const title = ref.title.trim();
  if (!title) return false;
  const n = normCol(actualTitle);
  const l = normCol(title);
  if (!n || !l) return false;
  if (l === normCol("Сдана админам") && isHandedToAdminsKaitenColumnTitle(actualTitle)) {
    return true;
  }
  return n === l || n.includes(l) || l.includes(n);
}

function findNextColumnTitle(
  boards: KanbanBoard[] | undefined,
  fromTitle: string,
  boardIdHint?: string,
): string | null {
  if (!boards?.length) return null;
  const fromNorm = normCol(fromTitle);
  for (const board of boards) {
    if (boardIdHint && board.id !== boardIdHint) continue;
    const cols = board.columns || [];
    for (let i = 0; i < cols.length - 1; i++) {
      const colTitle = (cols[i]?.title || "").trim();
      if (normCol(colTitle) === fromNorm || normCol(colTitle).includes(fromNorm)) {
        return (cols[i + 1]?.title || "").trim() || null;
      }
    }
  }
  for (const board of boards) {
    const cols = board.columns || [];
    for (let i = 0; i < cols.length - 1; i++) {
      const colTitle = (cols[i]?.title || "").trim();
      if (normCol(colTitle) === fromNorm || normCol(colTitle).includes(fromNorm)) {
        return (cols[i + 1]?.title || "").trim() || null;
      }
    }
  }
  return null;
}

function columnRefMatchesTitle(
  actualTitle: string | null | undefined,
  ref: PublicHubColumnRef,
  boards?: KanbanBoard[],
  fromTitleForNext?: string,
): boolean {
  if (ref.mode === "any") return true;
  if (ref.mode === "next") {
    if (!fromTitleForNext || !actualTitle) return false;
    const nextTitle = findNextColumnTitle(boards, fromTitleForNext);
    if (!nextTitle) return false;
    return columnTitleMatches(actualTitle, { mode: "column", boardId: "", columnId: "", title: nextTitle });
  }
  return columnTitleMatches(actualTitle, ref);
}

type MoveEvent = { at: string; from: string | null; to: string };

function collectKanbanMoves(
  activity: Array<{ at?: string; text?: string }>,
  seedFromColumn?: string | null,
): MoveEvent[] {
  const moves: MoveEvent[] = [];
  let prevColumn = String(seedFromColumn ?? "").trim() || null;
  const act = activity ?? [];
  for (let i = act.length - 1; i >= 0; i--) {
    const text = (act[i]?.text || "").trim();
    const m = text.match(KANBAN_MOVE_TO_COLUMN_RE);
    if (!m) continue;
    const toCol = (m[1] || "").trim();
    const at = toIso(act[i]?.at);
    if (at) {
      moves.push({ at, from: prevColumn, to: toCol });
    }
    prevColumn = toCol;
  }
  return moves;
}

function earliestRevisionColumn(
  rows: Array<{ at: Date; column: string | null }>,
): string | null {
  for (const row of rows) {
    const col = row.column?.trim();
    if (col) return col;
  }
  return null;
}

/** Этапы после «Сборки» — fallback для «Произведено», если сборку пропустили. */
const POST_ASSEMBLY_TITLES = [
  LAB_WORK_STATUS_LABELS.PROCESSING,
  LAB_WORK_STATUS_LABELS.MANUAL,
  LAB_WORK_STATUS_LABELS.TO_REVIEW,
  LAB_WORK_STATUS_LABELS.TO_ADMINS,
] as const;

function collectRevisionMoves(
  rows: Array<{ at: Date; column: string | null }>,
): MoveEvent[] {
  const moves: MoveEvent[] = [];
  let prevColumn: string | null = null;
  for (const row of rows) {
    const col = row.column?.trim() || null;
    const at = toIso(row.at);
    if (prevColumn && col && at) {
      moves.push({ at, from: prevColumn, to: col });
    }
    if (col) prevColumn = col;
  }
  return moves;
}

function earlierIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function resolveFromKanbanMoves(
  moves: MoveEvent[],
  condition: PublicHubTimelineCondition,
  boards?: KanbanBoard[],
): string | null {
  let result: string | null = null;
  for (const move of moves) {
    let matched = false;
    switch (condition.type) {
      case "kanban_move": {
        const toOk = columnRefMatchesTitle(
          move.to,
          condition.to,
          boards,
          move.from ?? undefined,
        );
        const fromOk =
          move.from != null &&
          columnRefMatchesTitle(move.from, condition.from, boards);
        matched = Boolean(fromOk && toOk);
        break;
      }
      case "kanban_enter": {
        matched = columnRefMatchesTitle(move.to, condition.column, boards);
        break;
      }
      case "kanban_leave": {
        matched =
          move.from != null &&
          columnRefMatchesTitle(move.from, condition.column, boards) &&
          !columnRefMatchesTitle(move.to, condition.column, boards);
        break;
      }
      default:
        break;
    }
    if (matched) {
      result = result ? earlierIso(result, move.at) : move.at;
    }
  }
  return result;
}

/** Если выход из «Сборки» не найден — дата входа в обработку / проверку / админам. */
function resolveLeaveAssemblyFallback(moves: MoveEvent[]): string | null {
  let result: string | null = null;
  for (const move of moves) {
    const hit = POST_ASSEMBLY_TITLES.some((title) =>
      columnTitleMatches(move.to, {
        mode: "column",
        boardId: "",
        columnId: "",
        title,
      }),
    );
    if (hit) result = result ? earlierIso(result, move.at) : move.at;
  }
  return result;
}

function isLeaveAssemblyCondition(
  condition: PublicHubTimelineCondition,
): boolean {
  if (condition.type !== "kanban_leave") return false;
  if (condition.column.mode !== "column") return false;
  return columnTitleMatches(condition.column.title, {
    mode: "column",
    boardId: "",
    columnId: "",
    title: LAB_WORK_STATUS_LABELS.ASSEMBLY,
  });
}

function resolveKanbanBlocked(
  activity: Array<{ at?: string; text?: string }>,
): string | null {
  let result: string | null = null;
  const act = activity ?? [];
  for (let i = act.length - 1; i >= 0; i--) {
    const text = (act[i]?.text || "").trim();
    if (!KANBAN_BLOCKED_RE.test(text)) continue;
    const at = toIso(act[i]?.at);
    if (at) result = result ? earlierIso(result, at) : at;
  }
  return result;
}

function resolveRevisionFieldChanged(
  rows: ResolvePublicHubTimelineInput["revisionFieldRows"],
  field: "isUrgent" | "urgentCoefficient",
): string | null {
  let prevUrgent: boolean | null | undefined;
  let prevCoef: number | null | undefined;
  let result: string | null = null;
  for (const row of rows) {
    const at = toIso(row.at);
    if (!at) continue;
    if (field === "isUrgent") {
      if (prevUrgent !== undefined && row.isUrgent !== prevUrgent) {
        result = result ? earlierIso(result, at) : at;
      }
      prevUrgent = row.isUrgent;
    } else {
      if (prevCoef !== undefined && row.urgentCoefficient !== prevCoef) {
        result = result ? earlierIso(result, at) : at;
      }
      prevCoef = row.urgentCoefficient;
    }
  }
  return result;
}

function resolveOrderField(
  order: ResolvePublicHubTimelineInput["order"],
  condition: Extract<PublicHubTimelineCondition, { type: "order_field" }>,
): { at: string | null; note?: string } {
  if (condition.field === "createdAt") {
    return { at: order.createdAt };
  }
  if (order.workReceivedAt) {
    return { at: order.workReceivedAt };
  }
  if (condition.fallback === "createdAt") {
    return {
      at: order.createdAt,
      note: "отдельная дата не указана, показана дата оформления",
    };
  }
  return { at: null };
}

function resolveRow(
  row: PublicHubTimelineRow,
  input: ResolvePublicHubTimelineInput,
): ResolvedTimelineRow {
  const { condition } = row;
  const seedFrom = earliestRevisionColumn(input.revisionColumnRows);
  const kanbanMoves = collectKanbanMoves(input.kanbanActivity, seedFrom);
  const revisionMoves = collectRevisionMoves(input.revisionColumnRows);

  switch (condition.type) {
    case "order_field": {
      const { at, note } = resolveOrderField(input.order, condition);
      return { id: row.id, label: row.label, at, note };
    }
    case "kanban_blocked": {
      const at = resolveKanbanBlocked(input.kanbanActivity);
      return { id: row.id, label: row.label, at };
    }
    case "revision_field_changed": {
      const at = resolveRevisionFieldChanged(input.revisionFieldRows, condition.field);
      return { id: row.id, label: row.label, at };
    }
    case "kanban_move":
    case "kanban_enter":
    case "kanban_leave": {
      const fromKanban = resolveFromKanbanMoves(
        kanbanMoves,
        condition,
        input.kanbanBoards,
      );
      const fromRevisions = resolveFromKanbanMoves(
        revisionMoves,
        condition,
        input.kanbanBoards,
      );
      let at = earlierIso(fromKanban, fromRevisions);
      if (!at && isLeaveAssemblyCondition(condition)) {
        at = earlierIso(
          resolveLeaveAssemblyFallback(kanbanMoves),
          resolveLeaveAssemblyFallback(revisionMoves),
        );
      }
      return { id: row.id, label: row.label, at };
    }
    default:
      return { id: row.id, label: row.label, at: null };
  }
}

export function resolvePublicHubTimeline(
  input: ResolvePublicHubTimelineInput,
): ResolvedTimelineRow[] {
  const config = input.config?.rows?.length
    ? input.config
    : DEFAULT_PUBLIC_HUB_TIMELINE;
  return config.rows.map((row) => resolveRow(row, input));
}
