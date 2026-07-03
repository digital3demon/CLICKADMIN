/**
 * Inbound sync Kaiten для активных нарядов (не отгружены).
 * Общий cursor/throttle в TenantClientState — toast и cron не дублируют одни карточки.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  kaitenChatLowPriorityColumnTitles,
  kaitenChatPriorityColumnTitles,
  shouldIncludeLowPriorityChatSyncCycle,
} from "@/lib/kaiten-chat-priority";
import {
  getKaitenQueueMetrics,
  isKaitenUrgentBacklogHighFromMetrics,
  type KaitenQueueMetrics,
} from "@/lib/kaiten-rest";
import { orderActiveInboundSyncWhere } from "@/lib/order-active-inbound-sync";
import { gateKaitenSyncForTenant } from "@/lib/kaiten-integration/sync";

export const INBOUND_CURSOR_KEY = "kaitenInboundActiveCursorV1";
export const INBOUND_THROTTLE_KEY = "kaitenInboundNextAllowedAt";

export const INBOUND_TOAST_BATCH = 4;
export const INBOUND_CRON_BATCH_PER_TENANT = 20;
export const INBOUND_TOAST_GAP_MS = 3_000;
export const INBOUND_CRON_GAP_MS = 8_000;
export const INBOUND_MENTION_BOOST = 4;

export type InboundSyncSource = "toast" | "cron";

export type InboundCursorState = {
  lastOrderId?: string;
  lastSyncedAt?: string;
  cycle?: number;
};

const memoryCursorByTenant = new Map<string, InboundCursorState>();
const memoryThrottleByTenant = new Map<string, number>();

export function activeInboundOrderBaseWhere(tenantId: string): Prisma.OrderWhereInput {
  return {
    tenantId,
    archivedAt: null,
    kaitenCardId: { not: null },
    ...orderActiveInboundSyncWhere(),
  };
}

export function parseInboundCursor(value: Prisma.JsonValue | null | undefined): InboundCursorState {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return { cycle: 0 };
  }
  const obj = value as Record<string, unknown>;
  return {
    lastOrderId: typeof obj.lastOrderId === "string" ? obj.lastOrderId : undefined,
    lastSyncedAt:
      typeof obj.lastSyncedAt === "string" ? obj.lastSyncedAt : undefined,
    cycle:
      typeof obj.cycle === "number" && Number.isFinite(obj.cycle) ? obj.cycle : 0,
  };
}

export function parseInboundNextAllowedAt(
  value: Prisma.JsonValue | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) return n;
    const d = Date.parse(value);
    if (Number.isFinite(d)) return d;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const at = (value as Record<string, unknown>).at;
    if (typeof at === "number" && Number.isFinite(at)) return at;
    if (typeof at === "string") {
      const d = Date.parse(at);
      if (Number.isFinite(d)) return d;
    }
  }
  return null;
}

export function inboundSyncGapMs(source: InboundSyncSource): number {
  return source === "toast" ? INBOUND_TOAST_GAP_MS : INBOUND_CRON_GAP_MS;
}

export function inboundSyncBatchSize(source: InboundSyncSource): number {
  return source === "toast" ? INBOUND_TOAST_BATCH : INBOUND_CRON_BATCH_PER_TENANT;
}

export function shouldAllowInboundKaitenSync(input: {
  nowMs: number;
  nextAllowedAtMs: number | null;
  queueMetrics: KaitenQueueMetrics;
  source: InboundSyncSource;
}): { allowed: boolean; reason: string } {
  if (
    input.nextAllowedAtMs != null &&
    input.nowMs < input.nextAllowedAtMs
  ) {
    return { allowed: false, reason: "throttled" };
  }
  if (isKaitenUrgentBacklogHighFromMetrics(input.queueMetrics)) {
    return { allowed: false, reason: "urgent_backlog" };
  }
  if (input.source === "cron" && input.queueMetrics.urgentDepth > 0) {
    return { allowed: false, reason: "cron_defer_urgent" };
  }
  return { allowed: true, reason: "ok" };
}

function isTenantClientStateMissing(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  const obj = err as { code?: string; message?: string; meta?: { table?: string } };
  return (
    obj.code === "P2021" &&
    (obj.meta?.table === "public.TenantClientState" ||
      obj.meta?.table === "TenantClientState" ||
      String(obj.message || "").includes("TenantClientState"))
  );
}

export async function readInboundSyncState(
  db: PrismaClient,
  tenantId: string,
): Promise<{
  cursor: InboundCursorState;
  nextAllowedAtMs: number | null;
  persistent: boolean;
}> {
  try {
    const [cursorRow, throttleRow] = await Promise.all([
      db.tenantClientState.findUnique({
        where: { tenantId_key: { tenantId, key: INBOUND_CURSOR_KEY } },
        select: { value: true },
      }),
      db.tenantClientState.findUnique({
        where: { tenantId_key: { tenantId, key: INBOUND_THROTTLE_KEY } },
        select: { value: true },
      }),
    ]);
    return {
      cursor: parseInboundCursor(cursorRow?.value),
      nextAllowedAtMs: parseInboundNextAllowedAt(throttleRow?.value),
      persistent: true,
    };
  } catch (err) {
    if (!isTenantClientStateMissing(err)) throw err;
    return {
      cursor: memoryCursorByTenant.get(tenantId) ?? { cycle: 0 },
      nextAllowedAtMs: memoryThrottleByTenant.get(tenantId) ?? null,
      persistent: false,
    };
  }
}

export async function writeInboundSyncState(
  db: PrismaClient,
  tenantId: string,
  opts: {
    cursor: InboundCursorState;
    nextAllowedAtMs: number;
    persistent: boolean;
  },
): Promise<void> {
  const cursorValue = {
    lastOrderId: opts.cursor.lastOrderId,
    lastSyncedAt: opts.cursor.lastSyncedAt ?? new Date().toISOString(),
    cycle: opts.cursor.cycle ?? 0,
  };
  const throttleValue = { at: opts.nextAllowedAtMs };

  if (!opts.persistent) {
    memoryCursorByTenant.set(tenantId, cursorValue);
    memoryThrottleByTenant.set(tenantId, opts.nextAllowedAtMs);
    return;
  }

  await Promise.all([
    db.tenantClientState.upsert({
      where: { tenantId_key: { tenantId, key: INBOUND_CURSOR_KEY } },
      create: { tenantId, key: INBOUND_CURSOR_KEY, value: cursorValue },
      update: { value: cursorValue },
    }),
    db.tenantClientState.upsert({
      where: { tenantId_key: { tenantId, key: INBOUND_THROTTLE_KEY } },
      create: { tenantId, key: INBOUND_THROTTLE_KEY, value: throttleValue },
      update: { value: throttleValue },
    }),
  ]);
}

async function pickRotatingActiveRows(
  db: PrismaClient,
  baseWhere: Prisma.OrderWhereInput,
  take: number,
  excludeIds: readonly string[],
  lastOrderId?: string,
): Promise<Array<{ id: string }>> {
  if (take <= 0) return [];

  let pivotSyncedAt: Date | null = null;
  let pivotId: string | null = null;
  if (lastOrderId) {
    const pivot = await db.order.findFirst({
      where: { id: lastOrderId, ...baseWhere },
      select: { id: true, kaitenChatSyncedAt: true },
    });
    if (pivot) {
      pivotSyncedAt = pivot.kaitenChatSyncedAt ?? new Date(0);
      pivotId = pivot.id;
    }
  }

  const exclude =
    excludeIds.length > 0 ? { id: { notIn: [...excludeIds] } } : {};
  const afterPivot =
    pivotId && pivotSyncedAt
      ? {
          OR: [
            { kaitenChatSyncedAt: { gt: pivotSyncedAt } },
            {
              AND: [
                { kaitenChatSyncedAt: pivotSyncedAt },
                { id: { gt: pivotId } },
              ],
            },
          ],
        }
      : {};

  const forward = await db.order.findMany({
    where: { ...baseWhere, ...exclude, ...afterPivot },
    orderBy: [{ kaitenChatSyncedAt: "asc" }, { id: "asc" }],
    take,
    select: { id: true },
  });
  if (forward.length >= take || !pivotId) return forward;

  const seen = new Set([...excludeIds, ...forward.map((r) => r.id)]);
  const wrapped = await db.order.findMany({
    where: {
      ...baseWhere,
      id: { notIn: [...seen] },
    },
    orderBy: [{ kaitenChatSyncedAt: "asc" }, { id: "asc" }],
    take: take - forward.length,
    select: { id: true },
  });
  return [...forward, ...wrapped];
}

export async function pickActiveInboundOrderIds(
  db: PrismaClient,
  tenantId: string,
  take: number,
  cursor: InboundCursorState,
  opts?: {
    mentionBoost?: number;
    usePriorityColumns?: boolean;
    cycle?: number;
  },
): Promise<{ orderIds: string[]; nextCursor: InboundCursorState }> {
  const baseWhere = activeInboundOrderBaseWhere(tenantId);
  const picked = new Set<string>();

  const mentionTake = Math.min(opts?.mentionBoost ?? 0, take);
  if (mentionTake > 0) {
    const mentionRows = await db.order.findMany({
      where: {
        ...baseWhere,
        kaitenChatHasLabMention: true,
        kaitenLabMentionSignalAt: { not: null },
      },
      orderBy: [{ kaitenChatSyncedAt: "asc" }, { id: "asc" }],
      take: mentionTake,
      select: { id: true },
    });
    for (const r of mentionRows) picked.add(r.id);
  }

  const cycle = opts?.cycle ?? cursor.cycle ?? 0;
  const includeLowPriority = shouldIncludeLowPriorityChatSyncCycle(cycle);
  const lowPriority = kaitenChatLowPriorityColumnTitles();
  const priorityTitles = kaitenChatPriorityColumnTitles();

  if (opts?.usePriorityColumns && picked.size < take && priorityTitles.length > 0) {
    const columnWhere: Prisma.OrderWhereInput = includeLowPriority
      ? {}
      : {
          OR: [
            { kaitenColumnTitle: { in: priorityTitles } },
            { kaitenColumnTitle: null },
            { kaitenColumnTitle: { notIn: lowPriority } },
          ],
        };
    const priorityRows = await db.order.findMany({
      where: {
        ...baseWhere,
        ...columnWhere,
        kaitenColumnTitle: { in: priorityTitles },
        ...(picked.size > 0 ? { id: { notIn: [...picked] } } : {}),
      },
      orderBy: [{ kaitenChatSyncedAt: "asc" }, { id: "asc" }],
      take: take - picked.size,
      select: { id: true },
    });
    for (const r of priorityRows) picked.add(r.id);
  }

  const remain = take - picked.size;
  const rotated = await pickRotatingActiveRows(
    db,
    baseWhere,
    remain,
    [...picked],
    cursor.lastOrderId,
  );
  for (const r of rotated) picked.add(r.id);

  const orderIds = [...picked];
  const lastOrderId = orderIds.at(-1) ?? cursor.lastOrderId;
  return {
    orderIds,
    nextCursor: {
      lastOrderId,
      lastSyncedAt: new Date().toISOString(),
      cycle: cycle + 1,
    },
  };
}

export async function maybeRunActiveInboundKaitenSync(
  db: PrismaClient,
  tenantId: string,
  source: InboundSyncSource,
  runSync: (orderIds: string[]) => Promise<{ rateLimited: boolean }>,
  opts?: { maxTake?: number },
): Promise<{
  ran: boolean;
  skippedReason: string | null;
  syncedOrderCount: number;
  rateLimited: boolean;
}> {
  const tid = tenantId.trim();
  if (!tid) {
    return { ran: false, skippedReason: "no_tenant", syncedOrderCount: 0, rateLimited: false };
  }

  const integrationGate = await gateKaitenSyncForTenant(db, tid);
  if (integrationGate.skip) {
    return {
      ran: false,
      skippedReason: integrationGate.skippedReason,
      syncedOrderCount: 0,
      rateLimited: false,
    };
  }

  const nowMs = Date.now();
  const queueMetrics = getKaitenQueueMetrics(nowMs);
  const state = await readInboundSyncState(db, tid);
  const gate = shouldAllowInboundKaitenSync({
    nowMs,
    nextAllowedAtMs: state.nextAllowedAtMs,
    queueMetrics,
    source,
  });
  if (!gate.allowed) {
    return {
      ran: false,
      skippedReason: gate.reason,
      syncedOrderCount: 0,
      rateLimited: false,
    };
  }

  const take = Math.min(
    inboundSyncBatchSize(source),
    opts?.maxTake ?? inboundSyncBatchSize(source),
  );
  if (take <= 0) {
    return {
      ran: false,
      skippedReason: "budget_exhausted",
      syncedOrderCount: 0,
      rateLimited: false,
    };
  }
  const { orderIds, nextCursor } = await pickActiveInboundOrderIds(
    db,
    tid,
    take,
    state.cursor,
    {
      mentionBoost: INBOUND_MENTION_BOOST,
      usePriorityColumns: source === "cron",
      cycle: state.cursor.cycle ?? 0,
    },
  );
  if (orderIds.length === 0) {
    return {
      ran: false,
      skippedReason: "no_active_orders",
      syncedOrderCount: 0,
      rateLimited: false,
    };
  }

  const result = await runSync(orderIds);
  await writeInboundSyncState(db, tid, {
    cursor: nextCursor,
    nextAllowedAtMs: nowMs + inboundSyncGapMs(source),
    persistent: state.persistent,
  });

  return {
    ran: true,
    skippedReason: null,
    syncedOrderCount: orderIds.length,
    rateLimited: result.rateLimited,
  };
}
