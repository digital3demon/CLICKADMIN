import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  KAITEN_MEMBERS_BACKOFF_KEY,
  KAITEN_MEMBERS_CURSOR_KEY,
  KAITEN_MEMBERS_THROTTLE_KEY,
  kaitenMembersInboundGapMs,
  kaitenMembersSyncEnabled,
} from "@/lib/kaiten-members-config";
import { syncKaitenMembersInboundForOrder } from "@/lib/kanban/kaiten-members-inbound";
import {
  activeInboundOrderBaseWhere,
  parseInboundCursor,
  shouldAllowInboundKaitenSync,
} from "@/lib/kaiten-inbound-active-sync";
import { gateKaitenSyncForTenant } from "@/lib/kaiten-integration/sync";
import { getKaitenQueueMetrics, type KaitenAuth } from "@/lib/kaiten-rest";

export type MembersInboundCursorState = {
  lastOrderId?: string;
  lastSyncedAt?: string;
};

function parseMembersBackoff(value: Prisma.JsonValue | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) return n;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const at = (value as Record<string, unknown>).at;
    if (typeof at === "number" && Number.isFinite(at)) return at;
  }
  return null;
}

function parseMembersNextAllowedAt(
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

async function readMembersSyncState(
  db: PrismaClient,
  tenantId: string,
): Promise<{
  cursor: MembersInboundCursorState;
  nextAllowedAtMs: number | null;
  backoffUntilMs: number | null;
  persistent: boolean;
}> {
  try {
    const [cursorRow, throttleRow, backoffRow] = await Promise.all([
      db.tenantClientState.findUnique({
        where: { tenantId_key: { tenantId, key: KAITEN_MEMBERS_CURSOR_KEY } },
        select: { value: true },
      }),
      db.tenantClientState.findUnique({
        where: { tenantId_key: { tenantId, key: KAITEN_MEMBERS_THROTTLE_KEY } },
        select: { value: true },
      }),
      db.tenantClientState.findUnique({
        where: { tenantId_key: { tenantId, key: KAITEN_MEMBERS_BACKOFF_KEY } },
        select: { value: true },
      }),
    ]);
    return {
      cursor: parseInboundCursor(cursorRow?.value) as MembersInboundCursorState,
      nextAllowedAtMs: parseMembersNextAllowedAt(throttleRow?.value),
      backoffUntilMs: parseMembersBackoff(backoffRow?.value),
      persistent: true,
    };
  } catch (err) {
    if (!isTenantClientStateMissing(err)) throw err;
    return {
      cursor: {},
      nextAllowedAtMs: null,
      backoffUntilMs: null,
      persistent: false,
    };
  }
}

async function writeMembersSyncState(
  db: PrismaClient,
  tenantId: string,
  opts: {
    cursor: MembersInboundCursorState;
    nextAllowedAtMs: number;
    backoffUntilMs?: number | null;
    persistent: boolean;
  },
): Promise<void> {
  if (!opts.persistent) return;
  const throttleValue = { at: opts.nextAllowedAtMs };
  const writes = [
    db.tenantClientState.upsert({
      where: { tenantId_key: { tenantId, key: KAITEN_MEMBERS_CURSOR_KEY } },
      create: { tenantId, key: KAITEN_MEMBERS_CURSOR_KEY, value: opts.cursor as never },
      update: { value: opts.cursor as never },
    }),
    db.tenantClientState.upsert({
      where: { tenantId_key: { tenantId, key: KAITEN_MEMBERS_THROTTLE_KEY } },
      create: { tenantId, key: KAITEN_MEMBERS_THROTTLE_KEY, value: throttleValue as never },
      update: { value: throttleValue as never },
    }),
  ];
  if (opts.backoffUntilMs != null) {
    writes.push(
      db.tenantClientState.upsert({
        where: { tenantId_key: { tenantId, key: KAITEN_MEMBERS_BACKOFF_KEY } },
        create: {
          tenantId,
          key: KAITEN_MEMBERS_BACKOFF_KEY,
          value: { at: opts.backoffUntilMs } as never,
        },
        update: { value: { at: opts.backoffUntilMs } as never },
      }),
    );
  }
  await Promise.all(writes);
}

async function pickNextMembersOrder(
  db: PrismaClient,
  tenantId: string,
  cursor: MembersInboundCursorState,
): Promise<{ id: string; kaitenCardId: number } | null> {
  const baseWhere = activeInboundOrderBaseWhere(tenantId);
  const afterId = cursor.lastOrderId?.trim() || null;

  const rows = await db.order.findMany({
    where: baseWhere,
    orderBy: { id: "asc" },
    select: { id: true, kaitenCardId: true },
    ...(afterId ? { cursor: { id: afterId }, skip: 1 } : {}),
    take: 1,
  });
  if (rows.length > 0 && rows[0]!.kaitenCardId != null) {
    return { id: rows[0]!.id, kaitenCardId: rows[0]!.kaitenCardId! };
  }

  const wrap = await db.order.findFirst({
    where: baseWhere,
    orderBy: { id: "asc" },
    select: { id: true, kaitenCardId: true },
  });
  if (!wrap?.kaitenCardId) return null;
  return { id: wrap.id, kaitenCardId: wrap.kaitenCardId };
}

const MEMBERS_BACKOFF_STEPS_MS = [2 * 60_000, 4 * 60_000, 8 * 60_000];

export async function maybeRunMembersInboundKaitenSync(
  db: PrismaClient,
  tenantId: string,
  auth: KaitenAuth,
): Promise<{
  ran: boolean;
  skippedReason: string | null;
  rateLimited: boolean;
  changed: boolean;
}> {
  if (!kaitenMembersSyncEnabled()) {
    return { ran: false, skippedReason: "disabled", rateLimited: false, changed: false };
  }

  const tid = tenantId.trim();
  if (!tid) {
    return { ran: false, skippedReason: "no_tenant", rateLimited: false, changed: false };
  }

  const integrationGate = await gateKaitenSyncForTenant(db, tid);
  if (integrationGate.skip) {
    return {
      ran: false,
      skippedReason: integrationGate.skippedReason,
      rateLimited: false,
      changed: false,
    };
  }

  const nowMs = Date.now();
  const queueMetrics = getKaitenQueueMetrics(nowMs);
  const state = await readMembersSyncState(db, tid);

  const effectiveNextAllowed = Math.max(
    state.nextAllowedAtMs ?? 0,
    state.backoffUntilMs ?? 0,
  );
  const gate = shouldAllowInboundKaitenSync({
    nowMs,
    nextAllowedAtMs: effectiveNextAllowed > nowMs ? effectiveNextAllowed : null,
    queueMetrics,
  });
  if (!gate.allowed) {
    return {
      ran: false,
      skippedReason: gate.reason,
      rateLimited: false,
      changed: false,
    };
  }

  const picked = await pickNextMembersOrder(db, tid, state.cursor);
  if (!picked) {
    return {
      ran: false,
      skippedReason: "no_active_orders",
      rateLimited: false,
      changed: false,
    };
  }

  const result = await syncKaitenMembersInboundForOrder(db, auth, {
    tenantId: tid,
    orderId: picked.id,
    kaitenCardId: picked.kaitenCardId,
  });

  let backoffUntilMs: number | null = null;
  if (result.rateLimited) {
    const prev = state.backoffUntilMs ?? 0;
    const stepIdx = prev > nowMs ? 1 : 0;
    const addMs = MEMBERS_BACKOFF_STEPS_MS[Math.min(stepIdx, MEMBERS_BACKOFF_STEPS_MS.length - 1)]!;
    backoffUntilMs = nowMs + addMs;
  }

  await writeMembersSyncState(db, tid, {
    cursor: {
      lastOrderId: picked.id,
      lastSyncedAt: new Date().toISOString(),
    },
    nextAllowedAtMs: nowMs + kaitenMembersInboundGapMs(),
    backoffUntilMs: result.rateLimited ? backoffUntilMs : null,
    persistent: state.persistent,
  });

  return {
    ran: true,
    skippedReason: null,
    rateLimited: result.rateLimited,
    changed: result.changed,
  };
}
