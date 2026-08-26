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

/** Копирует людей/срок с local на remote, если remote пустой. */
export function overlayLocalKanbanCardHeadOntoRemote(
  local: KanbanAppState,
  remote: KanbanAppState,
): void {
  const localById = new Map<string, KanbanCard>();
  forEachKanbanCardInState(local, (card) => {
    const id = String(card.id || "").trim();
    if (id) localById.set(id, card);
  });
  forEachKanbanCardInState(remote, (card) => {
    const loc = localById.get(String(card.id || "").trim());
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
  });
}
