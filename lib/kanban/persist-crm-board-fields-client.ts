import type { KaitenRefreshCardPatch } from "@/lib/kanban/apply-kaiten-refresh-patches";
import type { CrmBoardTile } from "@/lib/kanban/crm-board-tile";
import { ymdFromKaitenDueDate } from "@/lib/kanban/kaiten-head-to-kanban-card";
import { kaitenBlockedMetaFromCard } from "@/lib/kaiten-card-block";
import { forEachKanbanCardInState, getKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import {
  patchCrmBoardTilesCacheColumn,
  patchCrmBoardTilesCacheTimer,
  patchCrmBoardTilesCacheTrackLane,
  patchCrmBoardTilesCacheBlock,
} from "@/lib/kanban/crm-board-tiles-cache";
import {
  upsertKanbanCardColumnCache,
  upsertKanbanCardHeadCache,
} from "@/lib/kanban/kanban-card-heads-cache";
import {
  clearPendingKanbanColumnMove,
  rememberPendingKanbanColumnMove,
} from "@/lib/kanban/pending-column-moves";
import {
  clearPendingKanbanBlock,
  listPendingKanbanBlocks,
  pendingBlockForOrder,
  rememberPendingKanbanBlock,
} from "@/lib/kanban/pending-kanban-blocks";
import {
  clearPendingKanbanTrackLane,
  rememberPendingKanbanTrackLane,
} from "@/lib/kanban/pending-track-lane-moves";
import { slimKanbanChecklist } from "@/lib/kanban/kanban-linked-checklist";
import type { ChecklistItem, KanbanAppState, KanbanCard } from "@/lib/kanban/types";
export { crmColumnPersistFromLinkedMove } from "@/lib/kanban/crm-column-persist";

export function rememberCrmKanbanTrackLaneLocal(input: {
  cardId: string;
  orderId?: string;
  trackLane: "ORTHOPEDICS" | "ORTHODONTICS";
}): void {
  const oid = String(input.orderId || "").trim();
  rememberPendingKanbanTrackLane({
    cardId: input.cardId,
    orderId: oid || undefined,
    trackLane: input.trackLane,
  });
  if (oid) patchCrmBoardTilesCacheTrackLane(oid, input.trackLane);
}

/** Кнопка «Обновить»: дорожка с Kaiten затирает локальный pending. */
export function commitKanbanTrackLaneFromKaitenRefresh(input: {
  cardId: string;
  orderId: string;
  trackLane: "ORTHOPEDICS" | "ORTHODONTICS";
}): void {
  const oid = input.orderId.trim();
  if (!oid) return;
  clearPendingKanbanTrackLane(oid);
  clearPendingKanbanTrackLane(input.cardId);
  patchCrmBoardTilesCacheTrackLane(oid, input.trackLane);
}

export function rememberCrmKanbanBlockLocal(input: {
  cardId: string;
  orderId?: string;
  blocked: boolean;
  blockReason?: string;
  blockedAt?: string | null;
}): void {
  const oid = String(input.orderId || "").trim();
  const reason = input.blocked ? String(input.blockReason || "").trim() : "";
  rememberPendingKanbanBlock({
    cardId: input.cardId,
    orderId: oid || undefined,
    blocked: input.blocked,
    blockReason: reason,
    blockedAt: input.blocked ? input.blockedAt ?? null : null,
  });
  if (oid) {
    patchCrmBoardTilesCacheBlock(oid, {
      blocked: input.blocked,
      blockReason: reason,
    });
  }
}

/** Кнопка «Обновить»: блок с Kaiten затирает локальный pending. */
export function commitKanbanBlockFromKaitenRefresh(input: {
  cardId: string;
  orderId: string;
  blocked: boolean;
  blockReason?: string | null;
}): void {
  const oid = input.orderId.trim();
  if (!oid) return;
  clearPendingKanbanBlock(oid);
  clearPendingKanbanBlock(input.cardId);
  patchCrmBoardTilesCacheBlock(oid, {
    blocked: input.blocked,
    blockReason: input.blocked ? String(input.blockReason || "").trim() : "",
  });
}

export function rememberCrmKanbanColumnLocal(input: {
  cardId: string;
  orderId?: string;
  columnTitle: string;
  toColumnId?: string;
}): void {
  const title = input.columnTitle.trim();
  if (!title) return;
  rememberPendingKanbanColumnMove({
    cardId: input.cardId,
    orderId: input.orderId,
    toColumnId: input.toColumnId,
    toColumnTitle: title,
  });
  if (input.orderId) patchCrmBoardTilesCacheColumn(input.orderId, title);
  upsertKanbanCardColumnCache(
    { id: input.cardId, linkedOrderId: input.orderId },
    title,
  );
}

/** Кнопка «Обновить»: колонка с Kaiten затирает локальный pending. */
export function commitKanbanColumnFromKaitenRefresh(input: {
  cardId: string;
  orderId: string;
  columnTitle: string;
}): void {
  const title = input.columnTitle.trim();
  const oid = input.orderId.trim();
  if (!title || !oid) return;
  clearPendingKanbanColumnMove(oid);
  clearPendingKanbanColumnMove(input.cardId);
  patchCrmBoardTilesCacheColumn(oid, title);
  upsertKanbanCardColumnCache(
    { id: input.cardId, linkedOrderId: oid },
    title,
  );
}

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

/**
 * Кнопка «Обновить»: люди / срок / колонка / блок с Kaiten → наряд.
 * `isUrgent` наряда не трогаем (срочно карточки ≠ срочно наряда).
 */
export function crmBoardFieldsFromKaitenRefreshPatch(
  patch: KaitenRefreshCardPatch,
): {
  orderId: string;
  assignees?: string[];
  participants?: string[];
  stageDueYmd?: string;
  columnTitle?: string;
  blocked?: boolean;
  blockReason?: string | null;
  blockedAt?: string | null;
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
  const columnTitle = (patch.columnTitle || "").trim();
  const head = patch.kaitenHead;
  const hasBlockKeys =
    head != null &&
    ("blocked" in head || "is_blocked" in head || "block_reason" in head);
  const block = hasBlockKeys && head ? kaitenBlockedMetaFromCard(head) : null;
  if (!hasPeople && !due && !columnTitle && !block) return null;
  return {
    orderId,
    ...(hasPeople ? { assignees, participants } : {}),
    ...(due ? { stageDueYmd: due } : {}),
    ...(columnTitle ? { columnTitle } : {}),
    ...(block
      ? {
          blocked: block.blocked,
          blockReason: block.reason,
          blockedAt: block.blockedAtIso,
        }
      : {}),
  };
}

export function persistCrmBoardFieldsFromKaitenRefreshPatches(
  patches: readonly KaitenRefreshCardPatch[],
): void {
  const pendingBlocks = listPendingKanbanBlocks();
  for (const patch of patches) {
    const row = crmBoardFieldsFromKaitenRefreshPatch(patch);
    if (!row) continue;
    const pending = pendingBlockForOrder(row.orderId, pendingBlocks);
    if (pending && row.blocked !== undefined) {
      const { blocked: _b, blockReason: _r, blockedAt: _a, ...rest } = row;
      if (!rest.assignees && !rest.participants && !rest.stageDueYmd && !rest.columnTitle) {
        continue;
      }
      persistCrmBoardFieldsClient(rest);
      continue;
    }
    if (row.blocked !== undefined) {
      commitKanbanBlockFromKaitenRefresh({
        cardId: row.orderId,
        orderId: row.orderId,
        blocked: row.blocked,
        blockReason: row.blockReason,
      });
    }
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
  timerStartedAt?: string | null;
  timerDurationMs?: number | null;
  timerFrozenAt?: string | null;
  timerStartedByUserId?: string | null;
  timerParkedAt?: string | null;
  timerParkedRemainingMs?: number | null;
  blocked?: boolean;
  blockReason?: string | null;
  blockedAt?: string | null;
  checklist?: readonly ChecklistItem[] | null;
}): void {
  const orderId = String(input.orderId || "").trim();
  if (!orderId) return;
  const body: Record<string, unknown> = { orderId };
  if (input.assignees) body.assignees = [...input.assignees];
  if (input.participants) body.participants = [...input.participants];
  if (input.stageDueYmd !== undefined) body.stageDueYmd = input.stageDueYmd;
  if (input.columnTitle !== undefined) body.columnTitle = input.columnTitle;
  if (input.sortOrder !== undefined) body.sortOrder = input.sortOrder;
  if (input.trackLane !== undefined) {
    body.trackLane = input.trackLane;
    if (input.trackLane) patchCrmBoardTilesCacheTrackLane(orderId, input.trackLane);
  }
  if (input.timerStartedAt !== undefined) body.timerStartedAt = input.timerStartedAt;
  if (input.timerDurationMs !== undefined) body.timerDurationMs = input.timerDurationMs;
  if (input.timerFrozenAt !== undefined) body.timerFrozenAt = input.timerFrozenAt;
  if (input.timerStartedByUserId !== undefined) {
    body.timerStartedByUserId = input.timerStartedByUserId;
  }
  if (input.timerParkedAt !== undefined) body.timerParkedAt = input.timerParkedAt;
  if (input.timerParkedRemainingMs !== undefined) {
    body.timerParkedRemainingMs = input.timerParkedRemainingMs;
  }
  if (input.blocked !== undefined) {
    body.blocked = input.blocked;
    const reason =
      input.blocked === true
        ? String(input.blockReason ?? "").trim()
        : "";
    patchCrmBoardTilesCacheBlock(orderId, {
      blocked: input.blocked === true,
      blockReason: reason,
    });
  }
  if (input.blockReason !== undefined) body.blockReason = input.blockReason;
  if (input.blockedAt !== undefined) body.blockedAt = input.blockedAt;
  if (input.checklist !== undefined) {
    body.checklist = slimKanbanChecklist(input.checklist);
  }
  void fetch("/api/kanban/board-fields", {
    method: "PATCH",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export function persistKanbanLinkedCardTimer(card: KanbanCard): void {
  const orderId = String(card.linkedOrderId || "").trim();
  if (!orderId) return;
  persistCrmBoardFieldsClient({
    orderId,
    timerStartedAt: card.timerStartedAt ?? null,
    timerDurationMs: card.timerDurationMs ?? null,
    timerFrozenAt: card.timerFrozenAt ?? null,
    timerStartedByUserId: card.timerStartedByUserId ?? null,
    timerParkedAt: card.timerParkedAt ?? null,
    timerParkedRemainingMs:
      card.timerParkedRemainingMs != null && Number.isFinite(card.timerParkedRemainingMs)
        ? card.timerParkedRemainingMs
        : null,
  });
  patchCrmBoardTilesCacheTimer(orderId, {
    timerStartedAt: card.timerStartedAt ?? null,
    timerDurationMs: card.timerDurationMs ?? null,
    timerFrozenAt: card.timerFrozenAt ?? null,
    timerStartedByUserId: card.timerStartedByUserId ?? null,
    timerParkedAt: card.timerParkedAt ?? null,
    timerParkedRemainingMs:
      card.timerParkedRemainingMs != null && Number.isFinite(card.timerParkedRemainingMs)
        ? card.timerParkedRemainingMs
        : null,
  });
  upsertKanbanCardHeadCache(card);
}

const MISSING_TIMER_PERSIST_CAP = 80;

export function persistMissingCrmTimersFromState(
  state: KanbanAppState,
  tiles: readonly Pick<
    CrmBoardTile,
    "orderId" | "timerStartedAt" | "timerDurationMs" | "timerParkedAt"
  >[],
): void {
  const tileOids = new Set(tiles.map((t) => t.orderId));
  const inDb = new Set(
    tiles
      .filter(
        (t) =>
          Boolean(t.timerStartedAt) ||
          (t.timerDurationMs != null && t.timerDurationMs > 0) ||
          Boolean(t.timerParkedAt),
      )
      .map((t) => t.orderId),
  );
  let n = 0;
  forEachKanbanCardInState(state, (card) => {
    if (n >= MISSING_TIMER_PERSIST_CAP) return;
    const orderId = String(card.linkedOrderId || "").trim();
    if (!orderId || !tileOids.has(orderId) || inDb.has(orderId)) return;
    const has =
      Boolean(card.timerStartedAt) ||
      (card.timerDurationMs != null && card.timerDurationMs > 0) ||
      Boolean(card.timerParkedAt);
    if (!has) return;
    persistKanbanLinkedCardTimer(card);
    n += 1;
  });
}

export function persistKanbanLinkedCardBlock(card: KanbanCard): void {
  const orderId = String(card.linkedOrderId || "").trim();
  if (!orderId) return;
  rememberCrmKanbanBlockLocal({
    cardId: card.id,
    orderId,
    blocked: Boolean(card.blocked),
    blockReason: card.blockReason || "",
    blockedAt: card.blockedAt || null,
  });
  persistCrmBoardFieldsClient({
    orderId,
    blocked: Boolean(card.blocked),
    blockReason: card.blockReason || "",
    blockedAt: card.blockedAt || null,
  });
}

export function persistKanbanLinkedCardChecklist(card: KanbanCard): void {
  const orderId = String(card.linkedOrderId || "").trim();
  if (!orderId || card.parentCardId) return;
  persistCrmBoardFieldsClient({
    orderId,
    checklist: card.checklist || [],
  });
  upsertKanbanCardHeadCache(card);
}

const MISSING_CHECKLIST_PERSIST_CAP = 80;

export function persistMissingCrmChecklistsFromState(
  state: KanbanAppState,
  tiles: readonly Pick<CrmBoardTile, "orderId" | "checklist">[],
): void {
  const tileOids = new Set(tiles.map((t) => t.orderId));
  const inDb = new Set(
    tiles.filter((t) => t.checklist != null).map((t) => t.orderId),
  );
  let n = 0;
  forEachKanbanCardInState(state, (card) => {
    if (n >= MISSING_CHECKLIST_PERSIST_CAP) return;
    const orderId = String(card.linkedOrderId || "").trim();
    if (!orderId || card.parentCardId || !tileOids.has(orderId) || inDb.has(orderId)) {
      return;
    }
    if (!(card.checklist || []).length) return;
    persistKanbanLinkedCardChecklist(card);
    n += 1;
  });
}
