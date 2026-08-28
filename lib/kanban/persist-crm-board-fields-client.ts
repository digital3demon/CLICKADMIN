import type { KaitenRefreshCardPatch } from "@/lib/kanban/apply-kaiten-refresh-patches";
import type { CrmBoardTile } from "@/lib/kanban/crm-board-tile";
import { ymdFromKaitenDueDate } from "@/lib/kanban/kaiten-head-to-kanban-card";
import { forEachKanbanCardInState, getKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
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

const MISSING_PEOPLE_PERSIST_CAP = 80;

/** Наряды, у которых люди есть локально, а в плитке/БД — пусто. */
export function listOrderIdsNeedingCrmPeoplePersist(
  state: KanbanAppState,
  tiles: readonly Pick<CrmBoardTile, "orderId" | "assignees" | "participants">[],
  cap = MISSING_PEOPLE_PERSIST_CAP,
): Array<{ orderId: string; assignees: string[]; participants: string[] }> {
  const tileOids = new Set(tiles.map((t) => t.orderId));
  const inDb = new Set(
    tiles
      .filter(
        (t) =>
          (t.assignees?.length ?? 0) > 0 || (t.participants?.length ?? 0) > 0,
      )
      .map((t) => t.orderId),
  );
  const out: Array<{
    orderId: string;
    assignees: string[];
    participants: string[];
  }> = [];
  const seen = new Set<string>();
  forEachKanbanCardInState(state, (card) => {
    if (out.length >= cap) return;
    const orderId = String(card.linkedOrderId || "").trim();
    if (!orderId || seen.has(orderId) || !tileOids.has(orderId) || inDb.has(orderId)) {
      return;
    }
    const assignees = [...(card.assignees || [])].map((id) => String(id).trim()).filter(Boolean);
    const participants = [...(card.participants || [])]
      .map((id) => String(id).trim())
      .filter(Boolean);
    if (assignees.length === 0 && participants.length === 0) return;
    seen.add(orderId);
    out.push({ orderId, assignees, participants });
  });
  return out;
}

export function persistMissingCrmPeopleFromState(
  state: KanbanAppState,
  tiles: readonly Pick<CrmBoardTile, "orderId" | "assignees" | "participants">[],
): void {
  for (const row of listOrderIdsNeedingCrmPeoplePersist(state, tiles)) {
    persistCrmBoardFieldsClient({
      orderId: row.orderId,
      assignees: row.assignees,
      participants: row.participants,
    });
  }
}

/** Непустые люди/срок из патча Kaiten → тело PATCH наряда. Пустое не пишем. */
export function crmBoardFieldsFromKaitenRefreshPatch(
  patch: KaitenRefreshCardPatch,
): {
  orderId: string;
  assignees?: string[];
  participants?: string[];
  stageDueYmd?: string;
} | null {
  const orderId = String(patch.linkedOrderId || "").trim();
  if (!orderId) return null;
  const assignees = [...(patch.assignees || [])]
    .map((id) => String(id).trim())
    .filter(Boolean);
  const participants = [...(patch.participants || [])]
    .map((id) => String(id).trim())
    .filter(Boolean);
  const due = patch.kaitenHead
    ? ymdFromKaitenDueDate(patch.kaitenHead.due_date ?? patch.kaitenHead.dueDate)
    : null;
  const hasPeople = assignees.length > 0 || participants.length > 0;
  if (!hasPeople && !due) return null;
  return {
    orderId,
    ...(hasPeople ? { assignees, participants } : {}),
    ...(due ? { stageDueYmd: due } : {}),
  };
}

export function persistCrmBoardFieldsFromKaitenRefreshPatches(
  patches: readonly KaitenRefreshCardPatch[],
): void {
  for (const patch of patches) {
    const row = crmBoardFieldsFromKaitenRefreshPatch(patch);
    if (!row) continue;
    persistCrmBoardFieldsClient(row);
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
