/**
 * Фон: due_date / asap / members с карточки Kaiten → kanbanAppStateV3
 * (тот же TenantClientState, что и зеркало чата).
 */
import "server-only";

import type { PrismaClient } from "@prisma/client";
import { kaitenMembersFingerprint } from "@/lib/kaiten-members-parse";
import { kaitenMembersSyncEnabled } from "@/lib/kaiten-members-config";
import {
  applyInboundMembersToKanbanCard,
  mapKaitenCardMembersToCrm,
} from "@/lib/kanban/kaiten-members-inbound";
import { findCardByLinkedOrderId } from "@/lib/kanban/chat-sync";
import {
  loadKanbanTenantState,
  mutateKanbanTenantState,
  saveKanbanStateWithRetry,
} from "@/lib/kanban/kanban-tenant-state-write.server";
import { applyKaitenHeadFieldsToKanbanCard } from "@/lib/kanban/kaiten-head-to-kanban-card";
import {
  getKanbanStageDue,
} from "@/lib/kanban/kanban-stage-due";
import {
  kaitenGetCard,
  kaitenListCardMembers,
  type KaitenAuth,
} from "@/lib/kaiten-rest";
import { isKaitenRateLimitedStatus } from "@/lib/kaiten-rate-limit";
import { kaitenLogger } from "@/lib/server/logger";
import type { KanbanCard } from "@/lib/kanban/types";

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

export type InboundKanbanHeadByOrder = Record<
  string,
  {
    assignees: string[];
    participants: string[];
    stageDue: string;
    urgent: boolean;
  }
>;

export type SyncKaitenCardHeadResult = {
  changed: boolean;
  skipped: boolean;
  rateLimited: boolean;
  processed: number;
  byOrderId: InboundKanbanHeadByOrder;
};

function snapshotHead(card: KanbanCard): InboundKanbanHeadByOrder[string] {
  return {
    assignees: [...(card.assignees || [])],
    participants: [...(card.participants || [])],
    stageDue: getKanbanStageDue(card),
    urgent: Boolean(card.urgent),
  };
}

/** Пишет этапные сроки (и asap / людей, если передали) в kanbanAppStateV3. */
export async function persistKaitenStageDueToKanbanState(
  tenantId: string,
  byOrderId: Readonly<
    Record<
      string,
      {
        stageDue?: string | null;
        urgent?: boolean;
        assignees?: string[];
        participants?: string[];
        fingerprint?: string;
      }
    >
  >,
): Promise<{ changed: boolean; skipped: boolean }> {
  const tid = tenantId.trim();
  const keys = Object.keys(byOrderId);
  if (!tid || keys.length === 0) {
    return { changed: false, skipped: true };
  }

  try {
    const saved = await mutateKanbanTenantState(tid, (state) => {
      let changed = false;
      for (const orderId of keys) {
        const loc = findCardByLinkedOrderId(state, orderId);
        if (!loc) continue;
        const card =
          state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;
        const patch = byOrderId[orderId]!;
        const head: Record<string, unknown> = {};
        if ("stageDue" in patch) {
          const ymd = patch.stageDue ?? null;
          head.due_date = ymd && ymd.trim() ? ymd : null;
        }
        if (typeof patch.urgent === "boolean") {
          head.asap = patch.urgent;
        }
        if (Object.keys(head).length > 0 && applyKaitenHeadFieldsToKanbanCard(card, head)) {
          card.updatedAt = new Date().toISOString();
          changed = true;
        }
        const assignees = patch.assignees ?? [];
        const participants = patch.participants ?? [];
        if (
          applyInboundMembersToKanbanCard(card, {
            assignees,
            participants,
            fingerprint:
              patch.fingerprint ||
              `crm:${assignees.slice().sort().join(",")}|${participants.slice().sort().join(",")}`,
            unmappedLabels: [],
          })
        ) {
          card.updatedAt = new Date().toISOString();
          changed = true;
        }
      }
      return changed;
    });
    return { changed: saved.changed, skipped: saved.skipped };
  } catch (err) {
    if (isTenantClientStateMissing(err)) {
      return { changed: false, skipped: true };
    }
    throw err;
  }
}

/**
 * Тот же набор нарядов, что и фоновый чат: members + due_date/asap → JSON канбана.
 */
export async function syncKaitenCardHeadInboundForOrderIds(
  db: PrismaClient,
  auth: KaitenAuth,
  tenantId: string,
  orderIds: string[],
): Promise<SyncKaitenCardHeadResult> {
  const tid = tenantId.trim();
  const uniq = [...new Set(orderIds.map((x) => x.trim()).filter(Boolean))];
  const empty: SyncKaitenCardHeadResult = {
    changed: false,
    skipped: true,
    rateLimited: false,
    processed: 0,
    byOrderId: {},
  };
  if (!tid || uniq.length === 0) return empty;

  const orders = await db.order.findMany({
    where: { id: { in: uniq }, tenantId: tid, kaitenCardId: { not: null } },
    select: { id: true, kaitenCardId: true },
  });
  if (orders.length === 0) return empty;

  try {
    const loaded = await loadKanbanTenantState(tid);
    const state = loaded.state;
    if (!state) return empty;

    const membersEnabled = kaitenMembersSyncEnabled();
    let changed = false;
    let rateLimited = false;
    let processed = 0;
    const byOrderId: InboundKanbanHeadByOrder = {};

    for (const order of orders) {
      if (rateLimited) break;
      if (order.kaitenCardId == null || !Number.isFinite(order.kaitenCardId)) {
        continue;
      }

      const loc = findCardByLinkedOrderId(state, order.id);
      if (!loc) continue;
      const card =
        state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;

      if (membersEnabled) {
        const list = await kaitenListCardMembers(auth, order.kaitenCardId, {
          burst: false,
        });
        if (!list.ok) {
          if (isKaitenRateLimitedStatus(list.status)) {
            rateLimited = true;
            break;
          }
        } else {
          const fingerprint = kaitenMembersFingerprint(list.members);
          const mapped = await mapKaitenCardMembersToCrm(
            db,
            tid,
            auth,
            list.members,
          );
          if (
            applyInboundMembersToKanbanCard(card, {
              assignees: mapped.assignees,
              participants: mapped.participants,
              fingerprint,
              unmappedLabels: mapped.unmappedLabels,
              skipIfPushedFingerprint: card.lastPushedMembersFingerprint ?? null,
            })
          ) {
            changed = true;
          }
        }
      }

      const head = await kaitenGetCard(auth, order.kaitenCardId, { burst: false });
      if (!head.ok) {
        if (isKaitenRateLimitedStatus(head.status)) {
          rateLimited = true;
          byOrderId[order.id] = snapshotHead(card);
          processed += 1;
          break;
        }
      } else if (head.card) {
        if (applyKaitenHeadFieldsToKanbanCard(card, head.card)) {
          card.updatedAt = new Date().toISOString();
          changed = true;
        }
      }

      byOrderId[order.id] = snapshotHead(card);
      processed += 1;
    }

    if (changed) {
      const saved = await saveKanbanStateWithRetry(tid, state, loaded.updatedAt);
      if (!saved) {
        const retry = await persistKaitenStageDueToKanbanState(tid, byOrderId);
        changed = retry.changed || changed;
      }
    }

    return {
      changed,
      skipped: false,
      rateLimited,
      processed,
      byOrderId,
    };
  } catch (err) {
    if (isTenantClientStateMissing(err)) return empty;
    kaitenLogger.warn({ err, tenantId: tid }, "kaiten card head inbound failed");
    throw err;
  }
}
