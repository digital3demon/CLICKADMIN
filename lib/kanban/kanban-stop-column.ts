import { isKaitenStopLaneTitle } from "@/lib/kaiten-stop-lane";

/** Дорожка / колонка «СТОП» в CRM и в Kaiten — не обычный столбец доски. */
export function isKanbanStopColumnTitle(
  raw: string | null | undefined,
): boolean {
  return isKaitenStopLaneTitle(raw);
}

export const KANBAN_STOP_COLUMN_TITLE = "СТОП";
