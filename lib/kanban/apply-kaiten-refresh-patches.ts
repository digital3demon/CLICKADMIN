/**
 * Патчи refresh с сервера → живой канбан.
 * Снимок tenant часто без тех же cardId; клиент находит карточку по наряду / Kaiten id.
 */
import {
  findKanbanCardsForKaitenRefresh,
} from "@/lib/kanban/chat-sync";
import { applyKaitenHeadFieldsToKanbanCard } from "@/lib/kanban/kaiten-head-to-kanban-card";
import { shouldKeepLocalKanbanMembers } from "@/lib/kanban/preserve-kanban-card-head";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";

export type KaitenRefreshCardPatch = {
  cardId: string;
  linkedOrderId: string | null;
  kaitenCardId: number;
  assignees: string[];
  participants: string[];
  fingerprint: string;
  unmappedLabels: string[];
  kaitenHead: Record<string, unknown> | null;
};

/** В ответ API — только asap/due_date. Полная карточка Kaiten ломает JSON.stringify. */
export function slimKaitenHeadForPatch(
  card: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!card) return null;
  const out: Record<string, unknown> = {};
  if ("asap" in card) out.asap = card.asap === true;
  if ("due_date" in card) {
    const raw = card.due_date;
    if (raw == null || raw === false || String(raw).trim() === "") {
      out.due_date = null;
    } else if (typeof raw === "string" || typeof raw === "number") {
      out.due_date = raw;
    } else {
      out.due_date = String(raw);
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function applyMembersPatch(card: KanbanCard, patch: KaitenRefreshCardPatch): boolean {
  if (
    shouldKeepLocalKanbanMembers(card, {
      assignees: patch.assignees,
      participants: patch.participants,
    })
  ) {
    return false;
  }
  const prevA = card.assignees || [];
  const prevP = card.participants || [];
  const sameA =
    prevA.length === patch.assignees.length &&
    [...prevA].sort().every((v, i) => v === [...patch.assignees].sort()[i]);
  const sameP =
    prevP.length === patch.participants.length &&
    [...prevP].sort().every((v, i) => v === [...patch.participants].sort()[i]);
  if (sameA && sameP && card.kaitenMembersFingerprint === patch.fingerprint) {
    return false;
  }
  card.assignees = [...patch.assignees];
  card.participants = [...patch.participants];
  card.kaitenMembersFingerprint = patch.fingerprint;
  card.kaitenMembersSyncWarning =
    patch.unmappedLabels.length > 0
      ? `Из Kaiten не сопоставлены: ${patch.unmappedLabels.slice(0, 3).join("; ")}`
      : null;
  if (card.kaitenCardId == null) card.kaitenCardId = patch.kaitenCardId;
  card.updatedAt = new Date().toISOString();
  return true;
}

export function applyKaitenRefreshPatchesToState(
  state: KanbanAppState,
  patches: readonly KaitenRefreshCardPatch[],
): { state: KanbanAppState; changed: number } {
  const next = structuredClone(state);
  let changed = 0;
  for (const patch of patches) {
    const hits = findKanbanCardsForKaitenRefresh(next, patch);
    for (const hit of hits) {
      let cardChanged = applyMembersPatch(hit.card, patch);
      if (patch.kaitenHead && applyKaitenHeadFieldsToKanbanCard(hit.card, patch.kaitenHead)) {
        cardChanged = true;
      }
      if (cardChanged) changed += 1;
    }
  }
  return { state: next, changed };
}
