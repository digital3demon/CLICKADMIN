import {
  getKanbanStageDue,
  setKanbanStageDue,
} from "@/lib/kanban/kanban-stage-due";

/** due_date из Kaiten → YYYY-MM-DD для срока этапа на карточке канбана. */
export function ymdFromKaitenDueDate(raw: unknown): string | null {
  if (raw == null || raw === false) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

type KanbanHeadTarget = {
  urgent: boolean;
  stageDueDate?: string;
  dueDate?: string;
};

/** asap / due_date → поля карточки канбана (не наряд CRM). */
export function applyKaitenHeadFieldsToKanbanCard(
  card: KanbanHeadTarget,
  kaitenCard: Record<string, unknown>,
): boolean {
  let changed = false;
  if ("asap" in kaitenCard) {
    const asap = kaitenCard.asap === true;
    if (card.urgent !== asap) {
      card.urgent = asap;
      changed = true;
    }
  }
  if ("due_date" in kaitenCard) {
    const ymd = ymdFromKaitenDueDate(kaitenCard.due_date);
    const next = ymd ?? "";
    if (getKanbanStageDue(card as never) !== next) {
      setKanbanStageDue(card as never, next);
      changed = true;
    }
  }
  return changed;
}
