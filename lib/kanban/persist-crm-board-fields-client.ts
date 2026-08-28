import { forEachKanbanCardInState, getKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import type { CrmBoardTile } from "@/lib/kanban/crm-board-tile";
import type { KanbanAppState } from "@/lib/kanban/types";

const MISSING_STAGE_DUE_PERSIST_CAP = 80;

/** Наряды, у которых этапный срок есть локально, а в плитке/БД — пусто. */
export function listOrderIdsNeedingCrmStageDuePersist(
  state: KanbanAppState,
  tiles: readonly Pick<CrmBoardTile, "orderId" | "stageDueYmd">[],
  cap = MISSING_STAGE_DUE_PERSIST_CAP,
): Array<{ orderId: string; stageDueYmd: string }> {
  const tileOids = new Set(tiles.map((t) => t.orderId));
  const inDb = new Set(
    tiles
      .filter((t) => String(t.stageDueYmd || "").trim())
      .map((t) => t.orderId),
  );
  const out: Array<{ orderId: string; stageDueYmd: string }> = [];
  const seen = new Set<string>();
  forEachKanbanCardInState(state, (card) => {
    if (out.length >= cap) return;
    const orderId = String(card.linkedOrderId || "").trim();
    if (!orderId || seen.has(orderId) || !tileOids.has(orderId) || inDb.has(orderId)) {
      return;
    }
    const stageDueYmd = getKanbanStageDue(card);
    if (!stageDueYmd) return;
    seen.add(orderId);
    out.push({ orderId, stageDueYmd });
  });
  return out;
}

export function persistMissingCrmStageDuesFromState(
  state: KanbanAppState,
  tiles: readonly Pick<CrmBoardTile, "orderId" | "stageDueYmd">[],
): void {
  for (const row of listOrderIdsNeedingCrmStageDuePersist(state, tiles)) {
    persistCrmBoardFieldsClient({
      orderId: row.orderId,
      stageDueYmd: row.stageDueYmd,
    });
  }
}

/** Пишет живые поля плитки в CRM (наряд), не в tenant JSON и не в Kaiten. */
export function persistCrmBoardFieldsClient(input: {
  orderId?: string | null;
  assignees?: readonly string[];
  participants?: readonly string[];
  stageDueYmd?: string | null;
  columnTitle?: string | null;
  sortOrder?: number | null;
  trackLane?: string | null;
}): void {
  const orderId = String(input.orderId || "").trim();
  if (!orderId) return;
  const body: Record<string, unknown> = { orderId };
  if (input.assignees) body.assignees = [...input.assignees];
  if (input.participants) body.participants = [...input.participants];
  if (input.stageDueYmd !== undefined) body.stageDueYmd = input.stageDueYmd;
  if (input.columnTitle !== undefined) body.columnTitle = input.columnTitle;
  if (input.sortOrder !== undefined) body.sortOrder = input.sortOrder;
  if (input.trackLane !== undefined) body.trackLane = input.trackLane;
  void fetch("/api/kanban/board-fields", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}
