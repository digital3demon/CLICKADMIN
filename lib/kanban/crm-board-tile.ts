/**
 * Плитка CRM-канбана с наряда. Timezone не нужен: этапный срок — YYYY-MM-DD как в БД.
 * Источник: Order (колонка/дорожка/люди), не Kaiten API.
 */
import { kanbanBoardIdForTrackLane } from "@/lib/kanban/apply-card-track-lane";
import {
  isKanbanAggregateBoardId,
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  KANBAN_BOARD_PRODUCTION_ID,
} from "@/lib/kanban/model";

export const CRM_BOARD_TILES_CAP = 5000;

export type CrmKanbanTrackLane = "ORTHOPEDICS" | "ORTHODONTICS" | "TEST";

export type CrmBoardTile = {
  orderId: string;
  orderNumber: string;
  title: string;
  cardTypeId: string | null;
  assignees: string[];
  participants: string[];
  stageDueYmd: string;
  urgent: boolean;
  blocked: boolean;
  blockReason: string;
  columnTitle: string | null;
  sortOrder: number | null;
  trackLane: string | null;
  boardId: string;
  appointmentDate: string | null;
  dueToAdminsAt: string | null;
  dueToAdminsHasTime: boolean | null;
  updatedAt: string;
};

export function normalizeCrmUserIds(raw: readonly unknown[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw || []) {
    const id = String(item || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function trackLaneForKanbanBoardId(boardId: string): CrmKanbanTrackLane | null {
  const id = String(boardId || "").trim();
  if (id === KANBAN_BOARD_ORTHODONTICS_ID) return "ORTHODONTICS";
  if (id === KANBAN_BOARD_ORTHOPEDICS_ID) return "ORTHOPEDICS";
  if (id === KANBAN_BOARD_PRODUCTION_ID) return null;
  return null;
}

export function kanbanBoardIdFromTrackLane(lane: string | null | undefined): string {
  const u = String(lane || "").trim().toUpperCase();
  if (u === "TEST") return KANBAN_BOARD_ORTHOPEDICS_ID;
  return kanbanBoardIdForTrackLane(u || "ORTHOPEDICS");
}

export function isCrmAggregateMyQuery(boardId: string): boolean {
  return isKanbanAggregateBoardId(boardId);
}

/** SQL «Мои» / «Ответственный»: свои id в массивах наряда, не скан всех досок. */
export function crmMyTilesMatchesUser(
  tile: { assignees: readonly string[]; participants: readonly string[] },
  uid: string,
  mode: "my" | "distribute",
): boolean {
  const id = String(uid || "").trim();
  if (!id) return false;
  if (tile.assignees.includes(id)) return true;
  return mode === "my" && tile.participants.includes(id);
}

export function buildCrmBoardTileTitle(input: {
  orderNumber: string;
  patientName: string | null;
  doctorFullName: string;
  titleLabel?: string | null;
  titleMirror?: string | null;
}): string {
  const mirror = (input.titleMirror || "").trim();
  if (mirror) return mirror;
  const label = (input.titleLabel || "").trim();
  const bits = [input.orderNumber, input.patientName, input.doctorFullName, label]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  return bits.join(" ");
}

export function crmBoardTileFromOrderRow(row: {
  id: string;
  orderNumber: string;
  patientName: string | null;
  doctorFullName?: string;
  kaitenCardTypeId: string | null;
  kaitenCardTitleLabel: string | null;
  kaitenCardTitleMirror: string | null;
  kanbanAssigneeIds?: string[] | null;
  kanbanParticipantIds?: string[] | null;
  kanbanStageDueYmd?: string | null;
  isUrgent: boolean;
  kaitenBlocked: boolean;
  kaitenBlockReason: string | null;
  kaitenColumnTitle: string | null;
  kaitenCardSortOrder: number | null;
  kaitenTrackLane: string | null;
  appointmentDate: Date | string | null;
  dueToAdminsAt: Date | string | null;
  kaitenAdminDueHasTime: boolean | null;
  kanbanBoardUpdatedAt?: Date | string | null;
  updatedAt: Date | string;
}): CrmBoardTile {
  const toIso = (v: Date | string | null | undefined) => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  const stage = String(row.kanbanStageDueYmd || "").trim().slice(0, 10);
  const updated =
    toIso(row.kanbanBoardUpdatedAt) || toIso(row.updatedAt) || new Date().toISOString();
  return {
    orderId: row.id,
    orderNumber: row.orderNumber,
    title: buildCrmBoardTileTitle({
      orderNumber: row.orderNumber,
      patientName: row.patientName,
      doctorFullName: row.doctorFullName || "—",
      titleLabel: row.kaitenCardTitleLabel,
      titleMirror: row.kaitenCardTitleMirror,
    }),
    cardTypeId: row.kaitenCardTypeId,
    assignees: normalizeCrmUserIds(row.kanbanAssigneeIds),
    participants: normalizeCrmUserIds(row.kanbanParticipantIds),
    stageDueYmd: stage,
    urgent: Boolean(row.isUrgent),
    blocked: Boolean(row.kaitenBlocked),
    blockReason: (row.kaitenBlockReason || "").trim(),
    columnTitle: (row.kaitenColumnTitle || "").trim() || null,
    sortOrder:
      row.kaitenCardSortOrder != null && Number.isFinite(row.kaitenCardSortOrder)
        ? row.kaitenCardSortOrder
        : null,
    trackLane: row.kaitenTrackLane ?? null,
    boardId: kanbanBoardIdFromTrackLane(row.kaitenTrackLane),
    appointmentDate: toIso(row.appointmentDate),
    dueToAdminsAt: toIso(row.dueToAdminsAt),
    dueToAdminsHasTime: row.kaitenAdminDueHasTime,
    updatedAt: updated,
  };
}
