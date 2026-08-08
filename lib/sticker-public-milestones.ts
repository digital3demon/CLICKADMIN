import { normalizeKanbanColumnTitle } from "@/lib/kaiten-column-title";
import { LAB_WORK_STATUS_LABELS } from "@/lib/lab-work-status";

/** «Перемещена в «…»» — кириллические «» или обычные "". */
export const KANBAN_MOVE_TO_COLUMN_RE =
  /Перемещена\s+в\s+[«"]([^»"]+)[»"](?:\s*\([^)]*\))?/u;

export type StickerPublicMilestones = {
  agreedAt: string | null;
  producedAt: string | null;
};

function normCol(title: string | null | undefined): string {
  return normalizeKanbanColumnTitle(title ?? "");
}

function columnMatches(title: string | null | undefined, label: string): boolean {
  const n = normCol(title);
  const l = normCol(label);
  if (!n || !l) return false;
  return n === l || n.includes(l);
}

function toIso(at: string | Date | undefined | null): string | null {
  if (!at) return null;
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function earlierMilestoneIso(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  const x = a?.trim() || null;
  const y = b?.trim() || null;
  if (!x) return y;
  if (!y) return x;
  return x < y ? x : y;
}

function isPostAssemblyColumn(title: string): boolean {
  return (
    columnMatches(title, LAB_WORK_STATUS_LABELS.PROCESSING) ||
    columnMatches(title, LAB_WORK_STATUS_LABELS.MANUAL) ||
    columnMatches(title, LAB_WORK_STATUS_LABELS.TO_REVIEW) ||
    columnMatches(title, LAB_WORK_STATUS_LABELS.TO_ADMINS)
  );
}

/**
 * По журналу перемещений карточки:
 * — согласование: первый вход в «Производство»;
 * — произведено: уход из «Сборки», иначе первый вход в этап после сборки.
 * activity хранится от новых к старым; обход с конца = по времени по возрастанию.
 */
export function milestonesFromKanbanActivity(
  activity: Array<{ at?: string; text?: string }> | null | undefined,
): StickerPublicMilestones {
  let agreedAt: string | null = null;
  let producedAt: string | null = null;
  let producedFallback: string | null = null;
  let prevColumn: string | null = null;
  const act = activity ?? [];
  for (let i = act.length - 1; i >= 0; i--) {
    const text = (act[i]?.text || "").trim();
    const m = text.match(KANBAN_MOVE_TO_COLUMN_RE);
    if (!m) continue;
    const toCol = (m[1] || "").trim();
    const at = toIso(act[i]?.at);
    if (at) {
      if (
        !agreedAt &&
        columnMatches(toCol, LAB_WORK_STATUS_LABELS.PRODUCTION) &&
        !columnMatches(prevColumn, LAB_WORK_STATUS_LABELS.PRODUCTION)
      ) {
        agreedAt = at;
      }
      if (
        !producedAt &&
        prevColumn !== null &&
        columnMatches(prevColumn, LAB_WORK_STATUS_LABELS.ASSEMBLY) &&
        !columnMatches(toCol, LAB_WORK_STATUS_LABELS.ASSEMBLY)
      ) {
        producedAt = at;
      }
      if (!producedFallback && isPostAssemblyColumn(toCol)) {
        producedFallback = at;
      }
    }
    prevColumn = toCol;
  }
  return { agreedAt, producedAt: producedAt ?? producedFallback };
}

/** По снимкам ревизий: смена kaitenColumnTitle в хронологическом порядке. */
export function milestonesFromRevisionColumns(
  rows: Array<{ at: Date; column: string | null }>,
): StickerPublicMilestones {
  let agreedAt: string | null = null;
  let producedAt: string | null = null;
  let producedFallback: string | null = null;
  let prevColumn: string | null = null;
  for (const row of rows) {
    const col = row.column?.trim() || null;
    const at = toIso(row.at);
    if (col && at) {
      if (
        !agreedAt &&
        columnMatches(col, LAB_WORK_STATUS_LABELS.PRODUCTION) &&
        !columnMatches(prevColumn, LAB_WORK_STATUS_LABELS.PRODUCTION)
      ) {
        agreedAt = at;
      }
      if (
        !producedAt &&
        prevColumn &&
        columnMatches(prevColumn, LAB_WORK_STATUS_LABELS.ASSEMBLY) &&
        !columnMatches(col, LAB_WORK_STATUS_LABELS.ASSEMBLY)
      ) {
        producedAt = at;
      }
      if (!producedFallback && isPostAssemblyColumn(col)) {
        producedFallback = at;
      }
    }
    if (col) prevColumn = col;
  }
  return { agreedAt, producedAt: producedAt ?? producedFallback };
}
