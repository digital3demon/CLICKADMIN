import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import {
  KANBAN_CHAT_STATE_KEY,
  parseKanbanAppState,
} from "@/lib/kanban/chat-sync";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import {
  collectKanbanStageDueCards,
  kanbanCardTelegramLabel,
  kanbanStageDlineWindowForCommand,
} from "@/lib/telegram-bot-kanban-stage-dline-helpers";

export {
  collectKanbanStageDueCards,
  kanbanStageDueYmdInInclusiveRange,
  kanbanStageDlineWindowForCommand,
} from "@/lib/telegram-bot-kanban-stage-dline-helpers";

function kanbanCardTelegramHref(card: KanbanCard): string {
  const base = crmPublicBaseUrl().replace(/\/+$/, "");
  const linked = card.linkedOrderId?.trim();
  if (linked) {
    return `${base}${kanbanOrderDeepLinkPath(linked)}`;
  }
  const params = new URLSearchParams({ card: card.id });
  return `${base}/kanban?${params.toString()}`;
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
  opts?: { crmUserId?: string | null },
): Promise<{ header: string; items: { url: string; label: string }[] }> {
  const window = kanbanStageDlineWindowForCommand(cmd);
  const state = await loadKanbanAppStateForTenant(tenantId);
  if (!state) {
    return { header: window.header, items: [] };
  }
  const cards = collectKanbanStageDueCards(state, window, opts);
  return {
    header: window.header,
    items: cards.map((card) => ({
      url: kanbanCardTelegramHref(card),
      label: kanbanCardTelegramLabel(card),
    })),
  };
}
