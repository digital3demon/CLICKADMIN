import { normalizeKanbanColumnTitle } from "@/lib/kaiten-column-title";
import { LAB_WORK_STATUS_LABELS } from "@/lib/lab-work-status";

/** «Перемещена в «…»» — кириллические кавычки «». */
export const KANBAN_MOVE_TO_COLUMN_RE =
  /Перемещена\s+в\s+«([^»]+)»(?:\s*\([^)]*\))?/u;

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

/**
 * По журналу перемещений карточки: Согласование→Производство, уход из Сборки дальше.
 * activity хранится от новых к старым; обход с конца = по времени по возрастанию.
 */
export function milestonesFromKanbanActivity(
  activity: Array<{ at?: string; text?: string }> | null | undefined,
): StickerPublicMilestones {
  let agreedAt: string | null = null;
  let producedAt: string | null = null;
  let prevColumn: string | null = null;
  const act = activity ?? [];
  for (let i = act.length - 1; i >= 0; i--) {
    const text = (act[i]?.text || "").trim();
    const m = text.match(KANBAN_MOVE_TO_COLUMN_RE);
    if (!m) continue;
    const toCol = (m[1] || "").trim();
    const at = toIso(act[i]?.at);
    if (prevColumn !== null && at) {
      if (
        !agreedAt &&
        columnMatches(prevColumn, LAB_WORK_STATUS_LABELS.APPROVAL) &&
        columnMatches(toCol, LAB_WORK_STATUS_LABELS.PRODUCTION)
      ) {
        agreedAt = at;
      }
      if (
        !producedAt &&
        columnMatches(prevColumn, LAB_WORK_STATUS_LABELS.ASSEMBLY) &&
        !columnMatches(toCol, LAB_WORK_STATUS_LABELS.ASSEMBLY)
      ) {
        producedAt = at;
      }
    }
    prevColumn = toCol;
  }
  return { agreedAt, producedAt };
}

/** По снимкам ревизий: смена kaitenColumnTitle в хронологическом порядке. */
export function milestonesFromRevisionColumns(
  rows: Array<{ at: Date; column: string | null }>,
): StickerPublicMilestones {
  let agreedAt: string | null = null;
  let producedAt: string | null = null;
  let prevColumn: string | null = null;
  for (const row of rows) {
    const col = row.column?.trim() || null;
    const at = toIso(row.at);
    if (prevColumn && col && at) {
      if (
        !agreedAt &&
        columnMatches(prevColumn, LAB_WORK_STATUS_LABELS.APPROVAL) &&
        columnMatches(col, LAB_WORK_STATUS_LABELS.PRODUCTION)
      ) {
        agreedAt = at;
      }
      if (
        !producedAt &&
        columnMatches(prevColumn, LAB_WORK_STATUS_LABELS.ASSEMBLY) &&
        !columnMatches(col, LAB_WORK_STATUS_LABELS.ASSEMBLY)
      ) {
        producedAt = at;
      }
    }
    if (col) prevColumn = col;
  }
  return { agreedAt, producedAt };
}
