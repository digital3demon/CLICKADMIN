import { kanbanCardAbsoluteUrl } from "@/lib/kanban-card-browser-url";
import { postKanbanTelegramNotify } from "@/lib/kanban-crm-telegram-notify-client";
import { shouldSkipCrmKanbanTelegram } from "@/lib/kanban/crm-kanban-telegram";
import {
  loadKanbanCardHeadsCache,
  membersForKanbanAggregateKeep,
  upsertKanbanCardHeadCache,
} from "@/lib/kanban/kanban-card-heads-cache";
import { buildKanbanPersonDueTelegramLines } from "@/lib/kanban/kanban-person-due-telegram";
import { findCard, pushActivity } from "@/lib/kanban/model";
import type { KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import type { KanbanTelegramPrefKey } from "@/lib/kanban-telegram-prefs";
import { persistCrmBoardFieldsClient } from "@/lib/kanban/persist-crm-board-fields-client";
import { uniqTelegramTargetUserIds } from "@/lib/telegram-kanban-card-scope";

export type KanbanMemberPickerMode = "assign" | "part";

function orderPageUrl(orderId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/orders/${encodeURIComponent(orderId)}`;
}

function postMemberTelegram(opts: {
  kaitenCardId?: number | null;
  event: KanbanTelegramPrefKey;
  alternatePrefKeys?: KanbanTelegramPrefKey[];
  targetUserIds: string[];
  orderId?: string;
  cardId?: string;
  lines: string[];
  linesAdmin?: string[];
  linesSelf?: string[];
  linesSelfAdmin?: string[];
}) {
  postKanbanTelegramNotify({
    kaitenCardId: opts.kaitenCardId,
    event: opts.event,
    ...(opts.alternatePrefKeys?.length
      ? { alternatePrefKeys: opts.alternatePrefKeys }
      : {}),
    targetUserIds: opts.targetUserIds,
    parseMode: "HTML",
    ...(opts.orderId ? { orderId: opts.orderId } : {}),
    ...(opts.cardId ? { cardId: opts.cardId } : {}),
    lines: opts.lines,
    ...(opts.linesAdmin ? { linesAdmin: opts.linesAdmin } : {}),
    ...(opts.linesSelf ? { linesSelf: opts.linesSelf } : {}),
    ...(opts.linesSelfAdmin ? { linesSelfAdmin: opts.linesSelfAdmin } : {}),
  });
}

/** Обновляет assignees/participants на доске и пишет activity. */
export function applyKanbanCardMembersOnBoard(
  board: KanbanBoard,
  cardId: string,
  mode: KanbanMemberPickerMode,
  userIds: string[],
  activityActorLabel?: string,
): KanbanCard | null {
  const fc = findCard(board, cardId);
  if (!fc) return null;
  if (mode === "assign") {
    fc.card.assignees = [...userIds];
    pushActivity(
      fc.card,
      "Изменены ответственные",
      board.users[0]?.id,
      board,
      activityActorLabel,
    );
  } else {
    fc.card.participants = [...userIds];
    pushActivity(
      fc.card,
      "Изменён состав участников",
      board.users[0]?.id,
      board,
      activityActorLabel,
    );
  }
  fc.card.updatedAt = new Date().toISOString();
  upsertKanbanCardHeadCache(fc.card);
  return fc.card;
}

/** Telegram + Kaiten sync после смены ответственных/участников. */
export function notifyKanbanCardMemberChange(args: {
  card: KanbanCard;
  cardId: string;
  boardId: string;
  mode: KanbanMemberPickerMode;
  prevAssign: string[];
  prevPart: string[];
  nextAssign: string[];
  nextPart: string[];
  actorLabel: string;
}): void {
  const {
    card,
    cardId,
    boardId,
    mode,
    prevAssign,
    prevPart,
    nextAssign,
    nextPart,
    actorLabel,
  } = args;
  const kaitenId = card.kaitenCardId;
  const titleLine = (card.title || "").trim() || "Без названия";
  const oid = card.linkedOrderId?.trim() || "";
  const cardUrl = kanbanCardAbsoluteUrl(cardId, boardId);
  const orderUrl = oid ? orderPageUrl(oid) : "";

  if (!shouldSkipCrmKanbanTelegram(kaitenId)) {
    if (mode === "assign") {
      const added = nextAssign.filter((id) => !prevAssign.includes(id));
      const removed = prevAssign.filter((id) => !nextAssign.includes(id));
      if (added.length) {
        const { lines, linesAdmin, linesSelf, linesSelfAdmin } =
          buildKanbanPersonDueTelegramLines({
          kind: "added_assignee",
          actorLabel,
          cardTitle: titleLine,
          cardUrl,
          orderUrl,
        });
        postMemberTelegram({
          kaitenCardId: kaitenId,
          event: "tg_person_assigned_responsible",
          alternatePrefKeys: ["tg_person_added_to_card"],
          targetUserIds: added,
          orderId: oid || undefined,
          cardId,
          lines,
          linesAdmin,
          linesSelf,
          linesSelfAdmin,
        });
      }
      if (removed.length) {
        const { lines, linesAdmin, linesSelf, linesSelfAdmin } =
          buildKanbanPersonDueTelegramLines({
          kind: "removed",
          actorLabel,
          cardTitle: titleLine,
          cardUrl,
          orderUrl,
        });
        postMemberTelegram({
          kaitenCardId: kaitenId,
          event: "tg_person_removed_from_card",
          targetUserIds: removed,
          orderId: oid || undefined,
          cardId,
          lines,
          linesAdmin,
          linesSelf,
          linesSelfAdmin,
        });
      }
    } else {
      const added = nextPart.filter((id) => !prevPart.includes(id));
      const removed = prevPart.filter((id) => !nextPart.includes(id));
      if (added.length) {
        const { lines, linesAdmin, linesSelf, linesSelfAdmin } =
          buildKanbanPersonDueTelegramLines({
          kind: "added_participant",
          actorLabel,
          cardTitle: titleLine,
          cardUrl,
          orderUrl,
        });
        postMemberTelegram({
          kaitenCardId: kaitenId,
          event: "tg_person_added_to_card",
          targetUserIds: added,
          orderId: oid || undefined,
          cardId,
          lines,
          linesAdmin,
          linesSelf,
          linesSelfAdmin,
        });
      }
      if (removed.length) {
        const { lines, linesAdmin, linesSelf, linesSelfAdmin } =
          buildKanbanPersonDueTelegramLines({
          kind: "removed",
          actorLabel,
          cardTitle: titleLine,
          cardUrl,
          orderUrl,
        });
        postMemberTelegram({
          kaitenCardId: kaitenId,
          event: "tg_person_removed_from_card",
          targetUserIds: removed,
          orderId: oid || undefined,
          cardId,
          lines,
          linesAdmin,
          linesSelf,
          linesSelfAdmin,
        });
      }
    }
  }

  if (oid) {
    persistCrmBoardFieldsClient({
      orderId: oid,
      assignees: nextAssign,
      participants: nextPart,
    });
  }
  if (oid && card.kaitenCardId != null && Number.isFinite(card.kaitenCardId)) {
    void fetch(`/api/orders/${encodeURIComponent(oid)}/kaiten-assignees`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignees: nextAssign, participants: nextPart }),
    }).catch(() => {});
  }
}

/** Telegram после смены этапного срока: кто, карточка, дата. */
export function notifyKanbanCardDueChange(args: {
  card: KanbanCard;
  cardId: string;
  boardId: string;
  actorLabel: string;
  actorUserId?: string | null;
  dueYmd: string;
}): void {
  const { card, cardId, boardId, actorLabel, dueYmd } = args;
  if (shouldSkipCrmKanbanTelegram(card.kaitenCardId)) return;
  const titleLine = (card.title || "").trim() || "Без названия";
  const oid = card.linkedOrderId?.trim() || "";
  const members = membersForKanbanAggregateKeep(card, loadKanbanCardHeadsCache());
  const targetUserIds = uniqTelegramTargetUserIds(
    members.assignees,
    members.participants,
    args.actorUserId ? [args.actorUserId] : [],
  );
  const { lines, linesAdmin, linesSelf, linesSelfAdmin } =
    buildKanbanPersonDueTelegramLines({
    kind: dueYmd.trim() ? "due_set" : "due_cleared",
    actorLabel,
    cardTitle: titleLine,
    cardUrl: kanbanCardAbsoluteUrl(cardId, boardId),
    orderUrl: oid ? orderPageUrl(oid) : "",
    dueYmd,
  });
  postKanbanTelegramNotify({
    kaitenCardId: card.kaitenCardId,
    event: "tg_due_changed",
    parseMode: "HTML",
    ...(targetUserIds.length ? { targetUserIds } : {}),
    ...(oid ? { orderId: oid } : {}),
    cardId,
    lines,
    ...(linesAdmin ? { linesAdmin } : {}),
    ...(linesSelf ? { linesSelf } : {}),
    ...(linesSelfAdmin ? { linesSelfAdmin } : {}),
  });
}
