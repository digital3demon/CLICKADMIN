import "server-only";

import type { PrismaClient } from "@prisma/client";
import {
  formatKaitenUnmappedMemberLabel,
  kaitenMembersFingerprint,
} from "@/lib/kaiten-members-parse";
import {
  loadKaitenUsersDirectory,
  resolveKaitenMemberToCrmUser,
} from "@/lib/kaiten-user-directory";
import { findCardByLinkedOrderId } from "@/lib/kanban/chat-sync";
import { mutateKanbanTenantState } from "@/lib/kanban/kanban-tenant-state-write.server";
import type { KanbanCard } from "@/lib/kanban/types";
import {
  inboundKanbanMembersEmpty,
  shouldKeepLocalKanbanMembers,
} from "@/lib/kanban/preserve-kanban-card-head";
import {
  kaitenListCardMembers,
  KAITEN_MEMBER_TYPE_RESPONSIBLE,
  type KaitenAuth,
  type KaitenCardMemberRow,
} from "@/lib/kaiten-rest";
import { isKaitenRateLimitedStatus } from "@/lib/kaiten-rate-limit";
import { kaitenLogger } from "@/lib/server/logger";

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

export type InboundMembersApplyResult = {
  changed: boolean;
  skipped: boolean;
  rateLimited: boolean;
  fingerprint: string | null;
  unmappedLabels: string[];
};

async function mapMembersToCrm(
  db: PrismaClient,
  tenantId: string,
  auth: KaitenAuth,
  members: KaitenCardMemberRow[],
  directoryCache?: Awaited<ReturnType<typeof loadKaitenUsersDirectory>>,
): Promise<{
  assignees: string[];
  participants: string[];
  unmappedLabels: string[];
}> {
  const directory =
    directoryCache ?? (await loadKaitenUsersDirectory(db, tenantId, auth));
  const assignees: string[] = [];
  const participants: string[] = [];
  const unmappedLabels: string[] = [];
  const seenAssign = new Set<string>();
  const seenPart = new Set<string>();

  for (const m of members) {
    const resolved = await resolveKaitenMemberToCrmUser(db, tenantId, m, directory);
    if (!resolved.ok) {
      unmappedLabels.push(formatKaitenUnmappedMemberLabel(m));
      continue;
    }
    if (m.type === KAITEN_MEMBER_TYPE_RESPONSIBLE) {
      if (!seenAssign.has(resolved.crmUserId)) {
        seenAssign.add(resolved.crmUserId);
        assignees.push(resolved.crmUserId);
      }
    } else if (!seenPart.has(resolved.crmUserId) && !seenAssign.has(resolved.crmUserId)) {
      seenPart.add(resolved.crmUserId);
      participants.push(resolved.crmUserId);
    }
  }

  return { assignees, participants, unmappedLabels };
}

export async function mapKaitenCardMembersToCrm(
  db: PrismaClient,
  tenantId: string,
  auth: KaitenAuth,
  members: KaitenCardMemberRow[],
  directoryCache?: Awaited<ReturnType<typeof loadKaitenUsersDirectory>>,
): Promise<{
  assignees: string[];
  participants: string[];
  unmappedLabels: string[];
}> {
  return mapMembersToCrm(db, tenantId, auth, members, directoryCache);
}

export function applyInboundMembersToKanbanCard(
  card: KanbanCard,
  input: {
    assignees: string[];
    participants: string[];
    fingerprint: string;
    unmappedLabels: string[];
    skipIfPushedFingerprint?: string | null;
    forceApply?: boolean;
  },
): boolean {
  return applyMembersToCard(card, input);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function applyMembersToCard(
  card: KanbanCard,
  input: {
    assignees: string[];
    participants: string[];
    fingerprint: string;
    unmappedLabels: string[];
    skipIfPushedFingerprint?: string | null;
    /** Одноразовый backfill: всегда перезаписать assignees/participants из Kaiten. */
    forceApply?: boolean;
  },
): boolean {
  /** Пустой inbound (в т.ч. forceApply / backfill) не затирает людей на карточке. */
  if (inboundKanbanMembersEmpty(input.assignees, input.participants)) {
    return false;
  }
  const localEmpty = inboundKanbanMembersEmpty(card.assignees, card.participants);
  if (
    !input.forceApply &&
    !localEmpty &&
    input.skipIfPushedFingerprint &&
    input.skipIfPushedFingerprint === input.fingerprint
  ) {
    return false;
  }
  if (
    !input.forceApply &&
    !localEmpty &&
    card.kaitenMembersFingerprint === input.fingerprint
  ) {
    const warn =
      input.unmappedLabels.length > 0
        ? `Из Kaiten не сопоставлены: ${input.unmappedLabels.slice(0, 3).join("; ")}`
        : null;
    if (warn !== (card.kaitenMembersSyncWarning ?? null)) {
      card.kaitenMembersSyncWarning = warn;
      return true;
    }
    return false;
  }

  const prevAssign = card.assignees || [];
  const prevPart = card.participants || [];
  if (
    arraysEqual(prevAssign, input.assignees) &&
    arraysEqual(prevPart, input.participants) &&
    card.kaitenMembersFingerprint === input.fingerprint
  ) {
    return false;
  }
  if (
    shouldKeepLocalKanbanMembers(card, {
      assignees: input.assignees,
      participants: input.participants,
    })
  ) {
    return false;
  }

  card.assignees = [...input.assignees];
  card.participants = [...input.participants];
  card.kaitenMembersFingerprint = input.fingerprint;
  card.kaitenMembersSyncWarning =
    input.unmappedLabels.length > 0
      ? `Из Kaiten не сопоставлены: ${input.unmappedLabels.slice(0, 3).join("; ")}`
      : null;
  card.updatedAt = new Date().toISOString();
  return true;
}

/** Inbound: Kaiten members → assignees/participants в kanbanAppStateV3. */
export async function syncKaitenMembersInboundForOrder(
  db: PrismaClient,
  auth: KaitenAuth,
  input: {
    tenantId: string;
    orderId: string;
    kaitenCardId: number;
    forceApply?: boolean;
  },
): Promise<InboundMembersApplyResult> {
  const tenantId = input.tenantId.trim();
  const orderId = input.orderId.trim();
  if (!tenantId || !orderId || !Number.isFinite(input.kaitenCardId)) {
    return {
      changed: false,
      skipped: true,
      rateLimited: false,
      fingerprint: null,
      unmappedLabels: [],
    };
  }

  const list = await kaitenListCardMembers(auth, input.kaitenCardId, {
    burst: false,
  });
  if (!list.ok) {
    return {
      changed: false,
      skipped: false,
      rateLimited: isKaitenRateLimitedStatus(list.status),
      fingerprint: null,
      unmappedLabels: [],
    };
  }

  const fingerprint = kaitenMembersFingerprint(list.members);
  const mapped = await mapMembersToCrm(db, tenantId, auth, list.members);

  try {
    let skippedMissing = false;
    const saved = await mutateKanbanTenantState(tenantId, (state) => {
      const loc = findCardByLinkedOrderId(state, orderId);
      if (!loc) {
        skippedMissing = true;
        return false;
      }
      const card =
        state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;
      return applyMembersToCard(card, {
        assignees: mapped.assignees,
        participants: mapped.participants,
        fingerprint,
        unmappedLabels: mapped.unmappedLabels,
        skipIfPushedFingerprint: input.forceApply
          ? null
          : (card.lastPushedMembersFingerprint ?? null),
        forceApply: input.forceApply,
      });
    });
    if (saved.skipped || skippedMissing) {
      return {
        changed: false,
        skipped: true,
        rateLimited: false,
        fingerprint,
        unmappedLabels: mapped.unmappedLabels,
      };
    }
    if (!saved.changed) {
      return {
        changed: false,
        skipped: false,
        rateLimited: false,
        fingerprint,
        unmappedLabels: mapped.unmappedLabels,
      };
    }

    if (mapped.unmappedLabels.length > 0) {
      kaitenLogger.info(
        {
          tenantId,
          orderId,
          kaitenCardId: input.kaitenCardId,
          unmapped: mapped.unmappedLabels.slice(0, 5),
        },
        "kaiten members inbound unmapped users",
      );
    }

    return {
      changed: true,
      skipped: false,
      rateLimited: false,
      fingerprint,
      unmappedLabels: mapped.unmappedLabels,
    };
  } catch (err) {
    if (isTenantClientStateMissing(err)) {
      return {
        changed: false,
        skipped: true,
        rateLimited: false,
        fingerprint,
        unmappedLabels: mapped.unmappedLabels,
      };
    }
    throw err;
  }
}

export async function updateLastPushedMembersFingerprintInKanbanState(input: {
  tenantId: string;
  orderId: string;
  fingerprint: string;
  /** CRM id — пишем в JSON сразу после успешного push в Kaiten (не ждём debounce PUT). */
  assignees?: string[];
  participants?: string[];
}): Promise<void> {
  const tenantId = input.tenantId.trim();
  const orderId = input.orderId.trim();
  const hasMembersPayload =
    input.assignees !== undefined || input.participants !== undefined;
  if (!tenantId || !orderId) return;
  if (!input.fingerprint && !hasMembersPayload) return;

  try {
    await mutateKanbanTenantState(tenantId, (state) => {
      const loc = findCardByLinkedOrderId(state, orderId);
      if (!loc) return false;
      const card =
        state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;
      if (input.fingerprint) {
        card.lastPushedMembersFingerprint = input.fingerprint;
        card.kaitenMembersFingerprint = input.fingerprint;
      }
      if (input.assignees !== undefined) card.assignees = [...input.assignees];
      if (input.participants !== undefined) {
        const assignSet = new Set(card.assignees || []);
        card.participants = input.participants.filter((id) => !assignSet.has(id));
      }
      card.kaitenMembersSyncWarning = null;
      card.updatedAt = new Date().toISOString();
      return true;
    });
  } catch (err) {
    if (isTenantClientStateMissing(err)) return;
    throw err;
  }
}
