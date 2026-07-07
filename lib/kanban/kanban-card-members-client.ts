import { kanbanCardAbsoluteUrl } from "@/lib/kanban-card-browser-url";
import { shouldSkipCrmKanbanTelegram } from "@/lib/kanban/crm-kanban-telegram";
import { findCard, pushActivity } from "@/lib/kanban/model";
import type { KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import type { KanbanTelegramPrefKey } from "@/lib/kanban-telegram-prefs";
import { escapeTelegramHtml, telegramHtmlLink } from "@/lib/telegram-html";

export type KanbanMemberPickerMode = "assign" | "part";

function kanbanCardLinkHtml(cardId: string, boardId: string, title: string): string {
  return telegramHtmlLink(
    kanbanCardAbsoluteUrl(cardId, boardId),
    (title || "").trim() || "Без названия",
  );
}

function cardOrderWordLinks(
  orderId: string,
  cardId: string,
  boardId: string,
): { cardWord: string; orderWord: string } {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    cardWord: telegramHtmlLink(kanbanCardAbsoluteUrl(cardId, boardId), "карточке"),
    orderWord: telegramHtmlLink(
      `${origin}/orders/${encodeURIComponent(orderId)}`,
      "заказе",
    ),
  };
}

function postKanbanCrmTelegramNotify(payload: {
  kaitenCardId?: number | null;
  event: KanbanTelegramPrefKey;
  lines?: string[];
  linesAdmin?: string[];
  targetUserIds?: string[];
  parseMode?: "HTML";
}) {
  void fetch("/api/kanban/telegram-notify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function postKaitenAssigneesSync(
  orderId: string,
  assignees: string[],
  participants: string[],
) {
  void fetch(`/api/orders/${encodeURIComponent(orderId)}/kaiten-assignees`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignees, participants }),
  }).catch(() => {});
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
  const who = escapeTelegramHtml(actorLabel);
  const oid = card.linkedOrderId?.trim();
  const { cardWord, orderWord } = oid
    ? cardOrderWordLinks(oid, cardId, boardId)
    : { cardWord: "", orderWord: "" };

  if (!shouldSkipCrmKanbanTelegram(kaitenId)) {
    const linkHtml = kanbanCardLinkHtml(cardId, boardId, titleLine);
    if (mode === "assign") {
      const added = nextAssign.filter((id) => !prevAssign.includes(id));
      const removed = prevAssign.filter((id) => !nextAssign.includes(id));
      if (added.length) {
        postKanbanCrmTelegramNotify({
          kaitenCardId: kaitenId,
          event: "tg_person_assigned_responsible",
          targetUserIds: added,
          parseMode: "HTML",
          lines: [`${who} назначил(а) вас ответственным в ${linkHtml}`],
          ...(oid
            ? {
                linesAdmin: [
                  `${who} назначил(а) вас ответственным в ${cardWord} и ${orderWord}`,
                ],
              }
            : {}),
        });
      }
      if (removed.length) {
        postKanbanCrmTelegramNotify({
          kaitenCardId: kaitenId,
          event: "tg_person_removed_from_card",
          targetUserIds: removed,
          parseMode: "HTML",
          lines: [`${who} снял(а) вас с ответственных по ${linkHtml}`],
          ...(oid
            ? {
                linesAdmin: [
                  `${who} снял(а) вас с ответственных по ${cardWord} и ${orderWord}`,
                ],
              }
            : {}),
        });
      }
    } else {
      const added = nextPart.filter((id) => !prevPart.includes(id));
      const removed = prevPart.filter((id) => !nextPart.includes(id));
      if (added.length) {
        postKanbanCrmTelegramNotify({
          kaitenCardId: kaitenId,
          event: "tg_person_added_to_card",
          targetUserIds: added,
          parseMode: "HTML",
          lines: [`${who} добавил(а) вас в ${linkHtml}`],
          ...(oid
            ? {
                linesAdmin: [`${who} добавил(а) вас в ${cardWord} и ${orderWord}`],
              }
            : {}),
        });
      }
      if (removed.length) {
        postKanbanCrmTelegramNotify({
          kaitenCardId: kaitenId,
          event: "tg_person_removed_from_card",
          targetUserIds: removed,
          parseMode: "HTML",
          lines: [`${who} исключил(а) вас из участников ${linkHtml}`],
          ...(oid
            ? {
                linesAdmin: [
                  `${who} исключил(а) вас из участников ${cardWord} и ${orderWord}`,
                ],
              }
            : {}),
        });
      }
    }
  }

  if (oid && card.kaitenCardId != null && Number.isFinite(card.kaitenCardId)) {
    postKaitenAssigneesSync(oid, nextAssign, nextPart);
  }
}
