import {
  forEachKanbanCardInState,
  getKanbanStageDue,
} from "@/lib/kanban/kanban-stage-due";
import { endYmdKanbanDlinetm } from "@/lib/kanban-dline-end-ymd";
import {
  moscowTodayYmd,
  moscowWorkWeekFridayYmd,
} from "@/lib/shipments-date-range";
import { formatKanbanDueYmdForTelegram } from "@/lib/kanban/kanban-person-due-telegram";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";

export type KanbanStageDlineWindow = {
  startYmd: string;
  endYmd: string;
  header: string;
};

function stageDueInclusiveHeader(
  prefix: "Мой срок" | "Срок карточек",
  startYmd: string,
  endYmd: string,
): string {
  return `${prefix}, по ${endYmd} включительно (${startYmd}…${endYmd}, МСК)`;
}

export function kanbanStageDlineWindowForCommand(
  cmd: "/cardtd" | "/cardtm" | "/cardw" | "/dlinetd" | "/dlinetm" | "/dlinew",
  todayYmd = moscowTodayYmd(),
): KanbanStageDlineWindow {
  const prefix = cmd.startsWith("/card") ? "Срок карточек" : "Мой срок";
  if (cmd === "/dlinetd" || cmd === "/cardtd") {
    return {
      startYmd: todayYmd,
      endYmd: todayYmd,
      header: stageDueInclusiveHeader(prefix, todayYmd, todayYmd),
    };
  }
  if (cmd === "/dlinetm" || cmd === "/cardtm") {
    const endYmd = endYmdKanbanDlinetm(todayYmd);
    return {
      startYmd: todayYmd,
      endYmd,
      header: stageDueInclusiveHeader(prefix, todayYmd, endYmd),
    };
  }
  const fri = moscowWorkWeekFridayYmd(todayYmd);
  return {
    startYmd: todayYmd,
    endYmd: fri,
    header: stageDueInclusiveHeader(prefix, todayYmd, fri),
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

/** Есть этапный срок и он не позже конца окна — просроченные тоже входят. */
export function kanbanStageDueYmdOnOrBeforeEnd(stageYmd: string, endYmd: string): boolean {
  const s = stageYmd.trim().slice(0, 10);
  if (!s) return false;
  return s <= endYmd;
}

/** Статус и дата этапного срока под заголовком карточки в «Мой срок». */
export function formatKanbanStageDueTelegramDetail(
  statusLabel: string,
  stageDueYmd: string,
): string {
  const due = formatKanbanDueYmdForTelegram(stageDueYmd);
  return `Статус: ${statusLabel}\nСрок : ${due}`;
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
    if (!kanbanStageDueYmdOnOrBeforeEnd(stageYmd, window.endYmd)) {
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

/** Сначала наряды из CRM, потом leftover JSON (standalone). Один ключ — один раз. */
export function mergeKanbanStageDueCards(
  fromOrders: readonly KanbanCard[],
  fromJson: readonly KanbanCard[],
): KanbanCard[] {
  const seen = new Set<string>();
  const out: KanbanCard[] = [];
  const keyOf = (card: KanbanCard) =>
    String(card.linkedOrderId || card.id || "").trim();
  for (const card of [...fromOrders, ...fromJson]) {
    const key = keyOf(card);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(card);
  }
  out.sort((a, b) => {
    const da = getKanbanStageDue(a);
    const db = getKanbanStageDue(b);
    if (da !== db) return da.localeCompare(db);
    return kanbanCardTelegramLabel(a).localeCompare(kanbanCardTelegramLabel(b), "ru");
  });
  return out;
}
