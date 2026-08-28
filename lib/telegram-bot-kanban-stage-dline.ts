import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { orderPathById } from "@/lib/order-public-ref";
import {
  KANBAN_CHAT_STATE_KEY,
  parseKanbanAppState,
} from "@/lib/kanban/chat-sync";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import { listCrmStageDueCardsForTelegram } from "@/lib/kanban/crm-board-fields.server";
import { getKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import {
  collectKanbanStageDueCards,
  formatKanbanStageDueTelegramDetail,
  kanbanCardTelegramLabel,
  kanbanStageDlineWindowForCommand,
  mergeKanbanStageDueCards,
} from "@/lib/telegram-bot-kanban-stage-dline-helpers";
import type { TelegramHtmlListItem } from "@/lib/telegram-html-message";

export {
  collectKanbanStageDueCards,
  kanbanStageDueYmdInInclusiveRange,
  kanbanStageDlineWindowForCommand,
} from "@/lib/telegram-bot-kanban-stage-dline-helpers";

function kanbanCardTelegramHref(
  card: KanbanCard,
  linkToOrderPage: boolean,
): string {
  const base = crmPublicBaseUrl().replace(/\/+$/, "");
  const linked = card.linkedOrderId?.trim();
  if (linked) {
    if (linkToOrderPage) {
      return `${base}${orderPathById(linked)}`;
    }
    return `${base}${kanbanOrderDeepLinkPath(linked)}`;
  }
  const params = new URLSearchParams({ card: card.id });
  return `${base}/kanban?${params.toString()}`;
}

function kanbanCardTelegramItem(
  card: KanbanCard,
  linkToOrderPage: boolean,
  statusLabel: string,
): TelegramHtmlListItem {
  return {
    url: kanbanCardTelegramHref(card, linkToOrderPage),
    label: kanbanCardTelegramLabel(card),
    detail: formatKanbanStageDueTelegramDetail(statusLabel, getKanbanStageDue(card)),
    showUrl: true,
  };
}

/** Колонка / стоп / архив для статуса в списках бота. */
function kanbanCardStatusById(state: KanbanAppState): Map<string, string> {
  const m = new Map<string, string>();
  for (const board of state.boards ?? []) {
    for (const col of board.columns ?? []) {
      const title = String(col.title ?? "").trim() || "—";
      for (const card of col.cards ?? []) {
        m.set(card.id, card.blocked ? "Стоп" : title);
      }
    }
    for (const ac of board.archivedCards ?? []) {
      if (ac?.card) m.set(ac.card.id, "Архив");
    }
    for (const sc of board.stoppedCards ?? []) {
      if (sc?.card) m.set(sc.card.id, "Стоп");
    }
  }
  return m;
}

export async function loadKanbanAppStateForTenant(
  tenantId: string,
): Promise<KanbanAppState | null> {
  const corePrisma = await getPrisma();
  const row = await corePrisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_CHAT_STATE_KEY } },
    select: { value: true },
  });
  return parseKanbanAppState(row?.value ?? null);
}

export async function fetchKanbanStageDlineTelegramItems(
  tenantId: string,
  cmd: "/cardtd" | "/cardtm" | "/cardw" | "/dlinetd" | "/dlinetm" | "/dlinew",
  opts?: { crmUserId?: string | null; linkToOrderPage?: boolean },
): Promise<{ header: string; items: TelegramHtmlListItem[] }> {
  const window = kanbanStageDlineWindowForCommand(cmd);
  const linkToOrderPage = opts?.linkToOrderPage === true;
  const [fromOrders, state] = await Promise.all([
    listCrmStageDueCardsForTelegram({
      tenantId,
      crmUserId: opts?.crmUserId,
      startYmd: window.startYmd,
      endYmd: window.endYmd,
    }),
    loadKanbanAppStateForTenant(tenantId),
  ]);
  const fromJson = state
    ? collectKanbanStageDueCards(state, window, opts)
    : [];
  const statusById = state ? kanbanCardStatusById(state) : new Map<string, string>();
  const cards = mergeKanbanStageDueCards(fromOrders.cards, fromJson);
  return {
    header: window.header,
    items: cards.map((card) => {
      const oid = String(card.linkedOrderId || "").trim();
      const status =
        statusById.get(card.id) ??
        (oid ? fromOrders.statusByKey.get(oid) : undefined) ??
        fromOrders.statusByKey.get(card.id) ??
        "—";
      return kanbanCardTelegramItem(card, linkToOrderPage, status);
    }),
  };
}
