import "server-only";

import { OrderStatus, type Prisma } from "@prisma/client";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTestVisibilityWhere } from "@/lib/order-test-visibility";
import { crmKanbanLinkedCardId } from "@/lib/kanban-order-card-url";
import {
  CRM_BOARD_TILES_CAP,
  buildCrmBoardTileTitle,
  crmBoardTileFromOrderRow,
  type CrmBoardTile,
  type CrmKanbanTrackLane,
  normalizeCrmUserIds,
  trackLaneForKanbanBoardId,
} from "@/lib/kanban/crm-board-tile";
import { getKanbanStageDue, setKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import { loadKanbanTenantState } from "@/lib/kanban/kanban-tenant-state-write.server";
import {
  createCard,
  isKanbanAggregateBoardId,
  KANBAN_BOARD_PRODUCTION_ID,
} from "@/lib/kanban/model";
import { hasKanbanCardMembers } from "@/lib/kanban/preserve-kanban-card-head";
import type { KanbanCard } from "@/lib/kanban/types";
import type { UserRole } from "@prisma/client";

const TILE_SELECT = {
  id: true,
  orderNumber: true,
  patientName: true,
  doctorId: true,
  kaitenCardTypeId: true,
  kaitenCardTitleLabel: true,
  kaitenCardTitleMirror: true,
  kanbanAssigneeIds: true,
  kanbanParticipantIds: true,
  kanbanStageDueYmd: true,
  isUrgent: true,
  kaitenBlocked: true,
  kaitenBlockReason: true,
  kaitenColumnTitle: true,
  kaitenCardSortOrder: true,
  kaitenTrackLane: true,
  appointmentDate: true,
  dueToAdminsAt: true,
  kaitenAdminDueHasTime: true,
  kanbanBoardUpdatedAt: true,
  updatedAt: true,
} as const;

function hydrateWhere(
  tenantId: string,
  visibilityAnd: Prisma.OrderWhereInput,
): Prisma.OrderWhereInput {
  return {
    tenantId,
    archivedAt: null,
    status: { not: OrderStatus.CANCELLED },
    isTestOrder: false,
    AND: [visibilityAnd],
  };
}

async function attachCardTypeNames(
  rows: Array<{ kaitenCardTypeId: string | null }>,
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(rows.map((r) => r.kaitenCardTypeId).filter(Boolean)),
  ] as string[];
  if (ids.length === 0) return new Map();
  const clients = await getClientsPrisma();
  const types = await clients.kaitenCardType.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  return new Map(types.map((t) => [t.id, (t.name || "").trim()]));
}

async function attachDoctorNames(
  rows: Array<{ doctorId: string } & Record<string, unknown>>,
): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((r) => r.doctorId).filter(Boolean))];
  if (ids.length === 0) return new Map();
  const clients = await getClientsPrisma();
  const doctors = await clients.doctor.findMany({
    where: { id: { in: ids } },
    select: { id: true, fullName: true },
  });
  return new Map(doctors.map((d) => [d.id, d.fullName.trim() || "—"]));
}

export function crmMyTilesPeopleWhere(
  mode: "my" | "distribute",
  uid: string,
): Prisma.OrderWhereInput {
  return mode === "distribute"
    ? { kanbanAssigneeIds: { has: uid } }
    : {
        OR: [
          { kanbanAssigneeIds: { has: uid } },
          { kanbanParticipantIds: { has: uid } },
        ],
      };
}

/** Один проход: люди/срок из tenant JSON → Order, если в БД ещё пусто. */
export async function backfillCrmBoardPeopleFromTenant(
  tenantId: string,
  boardId: string,
): Promise<void> {
  const { state } = await loadKanbanTenantState(tenantId);
  if (!state) return;
  const prisma = await getOrdersPrisma();
  const boards = (state.boards || []).filter((b) => {
    if (b.id === KANBAN_BOARD_PRODUCTION_ID) return false;
    if (isKanbanAggregateBoardId(boardId)) return true;
    return b.id === boardId;
  });
  const pending: Array<{
    oid: string;
    assignees: string[];
    participants: string[];
    stage: string;
  }> = [];
  const seen = new Set<string>();
  for (const board of boards) {
    for (const col of board.columns || []) {
      for (const card of col.cards || []) {
        const oid = String(card.linkedOrderId || "").trim();
        if (!oid || seen.has(oid)) continue;
        const assignees = normalizeCrmUserIds(card.assignees);
        const participants = normalizeCrmUserIds(card.participants);
        const stage = getKanbanStageDue(card);
        if (!hasKanbanCardMembers(card) && !stage) continue;
        seen.add(oid);
        pending.push({ oid, assignees, participants, stage });
        if (pending.length >= 200) break;
      }
      if (pending.length >= 200) break;
    }
    if (pending.length >= 200) break;
  }
  if (pending.length === 0) return;
  const existing = await prisma.order.findMany({
    where: { tenantId, id: { in: pending.map((p) => p.oid) } },
    select: {
      id: true,
      kanbanAssigneeIds: true,
      kanbanParticipantIds: true,
      kanbanStageDueYmd: true,
    },
  });
  const emptyIds = new Set(
    existing
      .filter(
        (row) =>
          (row.kanbanAssigneeIds?.length ?? 0) === 0 &&
          (row.kanbanParticipantIds?.length ?? 0) === 0 &&
          !String(row.kanbanStageDueYmd || "").trim(),
      )
      .map((row) => row.id),
  );
  const now = new Date();
  await Promise.all(
    pending
      .filter((p) => emptyIds.has(p.oid))
      .map((p) =>
        prisma.order.updateMany({
          where: { id: p.oid, tenantId },
          data: {
            kanbanAssigneeIds: { set: p.assignees },
            kanbanParticipantIds: { set: p.participants },
            kanbanStageDueYmd: p.stage || null,
            kanbanBoardUpdatedAt: now,
          },
        }),
      ),
  );
}

export async function persistCrmBoardFieldsOnOrder(input: {
  tenantId: string;
  orderId: string;
  assignees?: readonly string[];
  participants?: readonly string[];
  stageDueYmd?: string | null;
  columnTitle?: string | null;
  sortOrder?: number | null;
  trackLane?: string | null;
}): Promise<boolean> {
  const prisma = await getOrdersPrisma();
  const oid = input.orderId.trim();
  if (!oid) return false;
  const data: Prisma.OrderUpdateInput = {
    kanbanBoardUpdatedAt: new Date(),
  };
  if (input.assignees) {
    data.kanbanAssigneeIds = { set: normalizeCrmUserIds(input.assignees) };
  }
  if (input.participants) {
    data.kanbanParticipantIds = { set: normalizeCrmUserIds(input.participants) };
  }
  if (input.stageDueYmd !== undefined) {
    data.kanbanStageDueYmd = (input.stageDueYmd || "").trim().slice(0, 10) || null;
  }
  if (input.columnTitle !== undefined) {
    data.kaitenColumnTitle = (input.columnTitle || "").trim() || null;
  }
  if (input.sortOrder !== undefined) {
    data.kaitenCardSortOrder =
      input.sortOrder != null && Number.isFinite(input.sortOrder)
        ? input.sortOrder
        : null;
  }
  if (input.trackLane !== undefined) {
    const u = String(input.trackLane || "").trim().toUpperCase();
    data.kaitenTrackLane =
      u === "ORTHODONTICS" || u === "ORTHOPEDICS" || u === "TEST"
        ? (u as never)
        : undefined;
  }
  const res = await prisma.order.updateMany({
    where: { id: oid, tenantId: input.tenantId },
    data,
  });
  return res.count > 0;
}

export async function listCrmBoardTiles(input: {
  tenantId: string;
  viewerRole: UserRole;
  viewerUserId: string;
  boardId: string;
  since?: Date | null;
}): Promise<{ tiles: CrmBoardTile[]; asOf: string }> {
  const prisma = await getOrdersPrisma();
  const visibilityAnd = orderTestVisibilityWhere({
    viewerRole: input.viewerRole,
    viewerUserId: input.viewerUserId,
  });
  const lane = trackLaneForKanbanBoardId(input.boardId);
  const laneFilter: Prisma.OrderWhereInput | undefined =
    lane === "ORTHOPEDICS"
      ? { kaitenTrackLane: { in: ["ORTHOPEDICS", "TEST"] } }
      : lane
        ? { kaitenTrackLane: lane as CrmKanbanTrackLane }
        : undefined;
  const where: Prisma.OrderWhereInput = {
    ...hydrateWhere(input.tenantId, visibilityAnd),
    ...(laneFilter ?? {}),
    ...(input.boardId === KANBAN_BOARD_PRODUCTION_ID
      ? { id: { in: [] } }
      : {}),
    ...(input.since
      ? {
          OR: [
            { kanbanBoardUpdatedAt: { gt: input.since } },
            { updatedAt: { gt: input.since } },
          ],
        }
      : {}),
  };
  if (!lane && input.boardId !== KANBAN_BOARD_PRODUCTION_ID) {
    return { tiles: [], asOf: new Date().toISOString() };
  }
  const rows = await prisma.order.findMany({
    where,
    orderBy: [{ kaitenCardSortOrder: "asc" }, { createdAt: "desc" }],
    take: CRM_BOARD_TILES_CAP,
    select: TILE_SELECT,
  });
  const [names, typeNames] = await Promise.all([
    attachDoctorNames(rows),
    attachCardTypeNames(rows),
  ]);
  const tiles = rows.map((r) =>
    crmBoardTileFromOrderRow({
      ...r,
      doctorFullName: names.get(r.doctorId) || "—",
      kaitenCardTypeName: r.kaitenCardTypeId
        ? typeNames.get(r.kaitenCardTypeId) || null
        : null,
    }),
  );
  return { tiles, asOf: new Date().toISOString() };
}

export async function listCrmMyTiles(input: {
  tenantId: string;
  viewerRole: UserRole;
  viewerUserId: string;
  mode: "my" | "distribute";
  since?: Date | null;
}): Promise<{ tiles: CrmBoardTile[]; asOf: string }> {
  const prisma = await getOrdersPrisma();
  const uid = input.viewerUserId.trim();
  const visibilityAnd = orderTestVisibilityWhere({
    viewerRole: input.viewerRole,
    viewerUserId: uid,
  });
  const people = crmMyTilesPeopleWhere(input.mode, uid);
  const where: Prisma.OrderWhereInput = {
    ...hydrateWhere(input.tenantId, visibilityAnd),
    AND: [
      visibilityAnd,
      people,
      {
        OR: [
          { kaitenTrackLane: { in: ["ORTHOPEDICS", "ORTHODONTICS", "TEST"] } },
          { kaitenTrackLane: null },
        ],
      },
      ...(input.since
        ? [
            {
              OR: [
                { kanbanBoardUpdatedAt: { gt: input.since } },
                { updatedAt: { gt: input.since } },
              ],
            } satisfies Prisma.OrderWhereInput,
          ]
        : []),
    ],
  };
  const rows = await prisma.order.findMany({
    where,
    orderBy: [{ kanbanBoardUpdatedAt: "desc" }, { createdAt: "desc" }],
    take: CRM_BOARD_TILES_CAP,
    select: TILE_SELECT,
  });
  const [names, typeNames] = await Promise.all([
    attachDoctorNames(rows),
    attachCardTypeNames(rows),
  ]);
  const tiles = rows.map((r) =>
    crmBoardTileFromOrderRow({
      ...r,
      doctorFullName: names.get(r.doctorId) || "—",
      kaitenCardTypeName: r.kaitenCardTypeId
        ? typeNames.get(r.kaitenCardTypeId) || null
        : null,
    }),
  );
  return { tiles, asOf: new Date().toISOString() };
}

const TELEGRAM_STAGE_DUE_CAP = 200;

/** Этапный срок с наряда (не tenant JSON): «Мой срок» / «Срок карточек». */
export async function listCrmStageDueCardsForTelegram(input: {
  tenantId: string;
  crmUserId?: string | null;
  startYmd: string;
  endYmd: string;
}): Promise<{ cards: KanbanCard[]; statusByKey: Map<string, string> }> {
  const prisma = await getOrdersPrisma();
  const uid = (input.crmUserId || "").trim();
  const start = input.startYmd.trim().slice(0, 10);
  const end = input.endYmd.trim().slice(0, 10);
  if (!start || !end) return { cards: [], statusByKey: new Map() };
  const where: Prisma.OrderWhereInput = {
    tenantId: input.tenantId,
    archivedAt: null,
    status: { not: OrderStatus.CANCELLED },
    isTestOrder: false,
    kanbanStageDueYmd: { gte: start, lte: end },
    AND: [
      ...(uid ? [crmMyTilesPeopleWhere("my", uid)] : []),
      {
        OR: [
          { kaitenTrackLane: { in: ["ORTHOPEDICS", "ORTHODONTICS", "TEST"] } },
          { kaitenTrackLane: null },
        ],
      },
    ],
  };
  const rows = await prisma.order.findMany({
    where,
    orderBy: [{ kanbanStageDueYmd: "asc" }, { orderNumber: "asc" }],
    take: TELEGRAM_STAGE_DUE_CAP,
    select: {
      id: true,
      orderNumber: true,
      patientName: true,
      doctorId: true,
      kaitenCardTitleLabel: true,
      kaitenCardTitleMirror: true,
      kanbanAssigneeIds: true,
      kanbanParticipantIds: true,
      kanbanStageDueYmd: true,
      kaitenColumnTitle: true,
      kaitenBlocked: true,
    },
  });
  const names = await attachDoctorNames(rows);
  const statusByKey = new Map<string, string>();
  const cards = rows.map((row) => {
    const title = buildCrmBoardTileTitle({
      orderNumber: row.orderNumber,
      patientName: row.patientName,
      doctorFullName: names.get(row.doctorId) || "—",
      titleLabel: row.kaitenCardTitleLabel,
      titleMirror: row.kaitenCardTitleMirror,
    });
    const due = String(row.kanbanStageDueYmd || "").trim().slice(0, 10);
    const card = createCard({
      id: crmKanbanLinkedCardId(row.id),
      title,
      linkedOrderId: row.id,
      linkedOrderNumber: row.orderNumber,
      assignees: normalizeCrmUserIds(row.kanbanAssigneeIds),
      participants: normalizeCrmUserIds(row.kanbanParticipantIds),
      stageDueDate: due,
      blocked: Boolean(row.kaitenBlocked),
    });
    setKanbanStageDue(card, due);
    const status = row.kaitenBlocked
      ? "Стоп"
      : (row.kaitenColumnTitle || "").trim() || "—";
    statusByKey.set(row.id, status);
    statusByKey.set(card.id, status);
    return card;
  });
  return { cards, statusByKey };
}
