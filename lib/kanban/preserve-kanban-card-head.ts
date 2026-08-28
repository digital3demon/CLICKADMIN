/**
 * Срок этапа и ответственные/участники в JSON канбана не затираются
 * пустым снимком Kaiten / cron / remote merge.
 */
import {
  forEachKanbanCardInState,
  getKanbanStageDue,
  setKanbanStageDue,
} from "@/lib/kanban/kanban-stage-due";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";

export function hasKanbanCardMembers(
  card: Pick<KanbanCard, "assignees" | "participants">,
): boolean {
  return (card.assignees?.length ?? 0) > 0 || (card.participants?.length ?? 0) > 0;
}

export function inboundKanbanMembersEmpty(
  assignees: readonly string[] | null | undefined,
  participants: readonly string[] | null | undefined,
): boolean {
  return (assignees?.length ?? 0) === 0 && (participants?.length ?? 0) === 0;
}

/** Пустой inbound не снимает локальных людей. */
export function shouldKeepLocalKanbanMembers(
  local: Pick<KanbanCard, "assignees" | "participants">,
  inbound: {
    assignees?: readonly string[] | null;
    participants?: readonly string[] | null;
  },
): boolean {
  return (
    hasKanbanCardMembers(local) &&
    inboundKanbanMembersEmpty(inbound.assignees, inbound.participants)
  );
}

/** Пустой inbound срок не снимает локальный этапный срок. */
export function shouldKeepLocalKanbanStageDue(
  localYmd: string,
  inboundYmd: string | null | undefined,
): boolean {
  const local = (localYmd || "").trim();
  const inbound = (inboundYmd || "").trim();
  return Boolean(local) && !inbound;
}

/** Накладывает непустой состав с Kaiten/titles-sync по наряду. */
export function applyKanbanMembersByOrderId(
  state: KanbanAppState,
  byOrderId: Readonly<
    Record<string, { assignees?: readonly string[]; participants?: readonly string[] }>
  >,
): boolean {
  let changed = false;
  forEachKanbanCardInState(state, (card) => {
    const oid = String(card.linkedOrderId || "").trim();
    if (!oid) return;
    const row = byOrderId[oid];
    if (!row) return;
    if (inboundKanbanMembersEmpty(row.assignees, row.participants)) return;
    if (
      shouldKeepLocalKanbanMembers(card, {
        assignees: row.assignees,
        participants: row.participants,
      })
    ) {
      return;
    }
    const nextA = [...(row.assignees || [])];
    const nextP = [...(row.participants || [])];
    const prevA = card.assignees || [];
    const prevP = card.participants || [];
    const sameA =
      prevA.length === nextA.length && prevA.every((id, i) => id === nextA[i]);
    const sameP =
      prevP.length === nextP.length && prevP.every((id, i) => id === nextP[i]);
    if (sameA && sameP) return;
    card.assignees = nextA;
    card.participants = nextP;
    changed = true;
  });
  return changed;
}

/** Копирует людей/срок с local на remote, если remote пустой. */
export function overlayLocalKanbanCardHeadOntoRemote(
  local: KanbanAppState,
  remote: KanbanAppState,
): void {
  const localById = new Map<string, KanbanCard>();
  const localByOrder = new Map<string, KanbanCard>();
  forEachKanbanCardInState(local, (card) => {
    const id = String(card.id || "").trim();
    if (id) localById.set(id, card);
    const oid = String(card.linkedOrderId || "").trim();
    if (oid) localByOrder.set(oid, card);
  });
  forEachKanbanCardInState(remote, (card) => {
    const loc =
      localById.get(String(card.id || "").trim()) ??
      localByOrder.get(String(card.linkedOrderId || "").trim());
    if (!loc) return;
    if (
      shouldKeepLocalKanbanMembers(loc, {
        assignees: card.assignees,
        participants: card.participants,
      })
    ) {
      card.assignees = [...(loc.assignees || [])];
      card.participants = [...(loc.participants || [])];
    }
    const localDue = getKanbanStageDue(loc);
    if (shouldKeepLocalKanbanStageDue(localDue, getKanbanStageDue(card))) {
      setKanbanStageDue(card, localDue);
    }
    if (!(card.comments?.length) && (loc.comments?.length ?? 0) > 0) {
      card.comments = structuredClone(loc.comments);
    }
    if ((loc.files?.length ?? 0) > 0) {
      const byId = new Map((card.files || []).map((f) => [f.id, f]));
      for (const f of loc.files || []) {
        const cur = byId.get(f.id);
        if (!cur) {
          byId.set(f.id, structuredClone(f));
          continue;
        }
        if (!(cur.dataUrl || "").trim() && (f.dataUrl || "").trim()) {
          byId.set(f.id, { ...cur, dataUrl: f.dataUrl });
        }
      }
      card.files = [...byId.values()];
    }
  });
}
