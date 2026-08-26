/**
 * Срок / срочность / ответственные / участники зеркалятся из Kaiten в kanbanAppStateV3.
 * Клиентский PUT не должен затирать более свежий inbound с cron.
 */
import { findCardByLinkedOrderId } from "@/lib/kanban/chat-sync";
import {
  forEachKanbanCardInState,
  getKanbanStageDue,
  setKanbanStageDue,
} from "@/lib/kanban/kanban-stage-due";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import {
  hasKanbanCardMembers,
  inboundKanbanMembersEmpty,
  shouldKeepLocalKanbanMembers,
  shouldKeepLocalKanbanStageDue,
} from "@/lib/kanban/preserve-kanban-card-head";

function cardUpdatedAtMs(card: KanbanCard): number {
  const n = Date.parse(card.updatedAt || "");
  return Number.isFinite(n) ? n : 0;
}

function copyInboundMembers(from: KanbanCard, to: KanbanCard): boolean {
  if (
    shouldKeepLocalKanbanMembers(to, {
      assignees: from.assignees,
      participants: from.participants,
    })
  ) {
    return false;
  }
  const assignees = [...(from.assignees || [])];
  const participants = [...(from.participants || [])];
  const prevAssign = to.assignees || [];
  const prevPart = to.participants || [];
  let changed = false;
  if (
    prevAssign.length !== assignees.length ||
    prevAssign.some((id, i) => id !== assignees[i])
  ) {
    to.assignees = assignees;
    changed = true;
  }
  if (
    prevPart.length !== participants.length ||
    prevPart.some((id, i) => id !== participants[i])
  ) {
    to.participants = participants;
    changed = true;
  }
  if (to.kaitenMembersFingerprint !== from.kaitenMembersFingerprint) {
    to.kaitenMembersFingerprint = from.kaitenMembersFingerprint ?? null;
    changed = true;
  }
  if (to.kaitenMembersSyncWarning !== (from.kaitenMembersSyncWarning ?? null)) {
    to.kaitenMembersSyncWarning = from.kaitenMembersSyncWarning ?? null;
    changed = true;
  }
  return changed;
}

/**
 * Копирует inbound-поля с `stored` на `incoming`, если cron уже записал
 * другой отпечаток members или более свежий срок.
 */
export function mergeInboundKaitenMirrorFieldsFromStored(
  incoming: KanbanAppState,
  stored: KanbanAppState,
): boolean {
  let changed = false;
  forEachKanbanCardInState(incoming, (inc) => {
    const oid = inc.linkedOrderId?.trim() || "";
    if (!oid) return;
    const loc = findCardByLinkedOrderId(stored, oid);
    if (!loc) return;
    const sto =
      stored.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;

    const stoFp = sto.kaitenMembersFingerprint ?? null;
    const incFp = inc.kaitenMembersFingerprint ?? null;
    const incomingEmpty = inboundKanbanMembersEmpty(
      inc.assignees,
      inc.participants,
    );
    /** Зеркало нарядов после F5 часто без людей — не ждать смены fingerprint. */
    if (incomingEmpty && hasKanbanCardMembers(sto)) {
      if (copyInboundMembers(sto, inc)) changed = true;
    } else if (
      stoFp &&
      stoFp !== incFp &&
      inc.lastPushedMembersFingerprint !== stoFp
    ) {
      if (copyInboundMembers(sto, inc)) changed = true;
    }

    const stoUp = cardUpdatedAtMs(sto);
    const incUp = cardUpdatedAtMs(inc);
    if (stoUp > incUp) {
      const stoDue = getKanbanStageDue(sto);
      const incDue = getKanbanStageDue(inc);
      if (stoDue !== incDue && !shouldKeepLocalKanbanStageDue(incDue, stoDue)) {
        setKanbanStageDue(inc, stoDue);
        changed = true;
      }
      if (sto.urgent !== inc.urgent) {
        inc.urgent = sto.urgent;
        changed = true;
      }
    }
  });
  return changed;
}
