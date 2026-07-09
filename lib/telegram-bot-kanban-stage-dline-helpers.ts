import {
  forEachKanbanCardInState,
  getKanbanStageDue,
} from "@/lib/kanban/kanban-stage-due";
import { endYmdKanbanDlinetm } from "@/lib/kanban-dline-end-ymd";
import {
  moscowTodayYmd,
  moscowWorkWeekFridayYmd,
} from "@/lib/shipments-date-range";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";

export type KanbanStageDlineWindow = {
  startYmd: string;
  endYmd: string;
  header: string;
};

export function kanbanStageDlineWindowForCommand(
  cmd: "/cardtd" | "/cardtm" | "/cardw" | "/dlinetd" | "/dlinetm" | "/dlinew",
  todayYmd = moscowTodayYmd(),
): KanbanStageDlineWindow {
  if (cmd === "/dlinetd" || cmd === "/cardtd") {
    return {
      startYmd: todayYmd,
      endYmd: todayYmd,
      header:
        cmd === "/cardtd"
          ? `Срок карточек на сегодня (${todayYmd}, МСК)`
          : `Мой срок на сегодня (${todayYmd}, МСК)`,
    };
  }
  if (cmd === "/dlinetm" || cmd === "/cardtm") {
    const endYmd = endYmdKanbanDlinetm(todayYmd);
    return {
      startYmd: todayYmd,
      endYmd,
      header:
        cmd === "/cardtm"
          ? `Срок карточек, по ${endYmd} включительно (${todayYmd}…${endYmd}, МСК)`
          : `Мой срок, по ${endYmd} включительно (${todayYmd}…${endYmd}, МСК)`,
    };
  }
  const fri = moscowWorkWeekFridayYmd(todayYmd);
  return {
    startYmd: todayYmd,
    endYmd: fri,
    header:
      cmd === "/cardw"
        ? `Срок карточек до конца рабочей недели (${todayYmd}…${fri}, МСК)`
        : `Мой срок до конца рабочей недели (${todayYmd}…${fri}, МСК)`,
  };
}

export function kanbanStageDueYmdInInclusiveRange(
  stageYmd: string,
  startYmd: string,
  endYmd: string,
): boolean {
  const s = stageYmd.trim().slice(0, 10);
  if (!s) return false;
  return s >= startYmd && s <= endYmd;
}

export function kanbanCardTelegramLabel(card: KanbanCard): string {
  return card.title.replace(/\n/g, " ").trim() || card.id;
}

export function kanbanCardIncludesCrmUser(card: KanbanCard, crmUserId: string): boolean {
  const id = crmUserId.trim();
  if (!id) return false;
  return (
    card.assignees?.includes(id) === true ||
    card.participants?.includes(id) === true
  );
}

export function collectKanbanStageDueCards(
  state: KanbanAppState,
  window: KanbanStageDlineWindow,
  opts?: { crmUserId?: string | null },
): KanbanCard[] {
  const crmUserId = opts?.crmUserId?.trim() || null;
  const out: KanbanCard[] = [];
  forEachKanbanCardInState(state, (card) => {
    if (crmUserId && !kanbanCardIncludesCrmUser(card, crmUserId)) return;
    const stageYmd = getKanbanStageDue(card);
    if (!kanbanStageDueYmdInInclusiveRange(stageYmd, window.startYmd, window.endYmd)) {
      return;
    }
    out.push(card);
  });
  out.sort((a, b) => {
    const da = getKanbanStageDue(a);
    const db = getKanbanStageDue(b);
    if (da !== db) return da.localeCompare(db);
    return kanbanCardTelegramLabel(a).localeCompare(kanbanCardTelegramLabel(b), "ru");
  });
  return out;
}
