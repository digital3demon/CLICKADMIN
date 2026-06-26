import type { DemoKanbanColumn } from "@prisma/client";
import type { KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import { crmKanbanLinkedCardId } from "@/lib/kanban-order-card-url";
import { isHandedToAdminsKaitenColumnTitle } from "@/lib/sticker-public-client-copy";
import {
  KANBAN_MOVE_TO_COLUMN_RE,
  milestonesFromKanbanActivity,
  type StickerPublicMilestones,
} from "@/lib/sticker-public-milestones";

export const KANBAN_STATE_KEY = "kanbanAppStateV3" as const;

export function demoKanbanColumnRu(v: DemoKanbanColumn | null | undefined): string | null {
  if (v == null) return null;
  if (v === "NEW") return "Канбан CRM: Новые";
  if (v === "IN_PROGRESS") return "Канбан CRM: В работе";
  if (v === "DONE") return "Канбан CRM: Готово";
  return `Канбан CRM: ${String(v)}`;
}

function userNameById(board: KanbanBoard, userId: string): string {
  const u = board.users?.find((x) => x.id === userId);
  return (u?.name || "").trim() || userId;
}

function findCardInBoard(board: KanbanBoard, orderId: string): KanbanCard | null {
  const wantId = crmKanbanLinkedCardId(orderId);
  for (const col of board.columns || []) {
    for (const c of col.cards || []) {
      if (c.id === wantId || c.linkedOrderId === orderId) return c;
    }
  }
  for (const ac of board.archivedCards || []) {
    const c = ac.card;
    if (c.id === wantId || c.linkedOrderId === orderId) return c;
  }
  return null;
}

export type KanbanOrderPublicSnippet = {
  boardTitle: string | null;
  columnTitle: string | null;
  assignees: string[];
  participants: string[];
  activity: { at: string; text: string; label: string }[];
};

export function kanbanSnippetForLinkedOrder(
  rawState: unknown,
  orderId: string,
): KanbanOrderPublicSnippet | null {
  const oid = String(orderId || "").trim();
  if (!oid) return null;
  const st = rawState as { boards?: unknown } | null;
  const boards = st?.boards;
  if (!Array.isArray(boards)) return null;

  for (const b of boards as KanbanBoard[]) {
    const card = findCardInBoard(b, oid);
    if (!card) continue;
    const col =
      b.columns?.find((c) => (c.cards || []).some((x) => x.id === card.id)) ?? null;
    const assignees = (card.assignees || [])
      .map((id) => userNameById(b, id))
      .filter(Boolean);
    const participants = (card.participants || [])
      .map((id) => userNameById(b, id))
      .filter(Boolean);
    const activity = (card.activity || [])
      .slice(-24)
      .map((a) => ({
        at: a.at,
        text: (a.text || "").trim(),
        label: ((a.actorLabel || "").trim() || userNameById(b, a.userId)).trim() || "—",
      }))
      .filter((x) => x.text);
    return {
      boardTitle: (b.title || "").trim() || null,
      columnTitle: (col?.title || "").trim() || null,
      assignees,
      participants,
      activity,
    };
  }
  return null;
}

/** «Перемещена в «…»» / с опциональным хвостом «(Kaiten)» — кириллические кавычки «». */
export { KANBAN_MOVE_TO_COLUMN_RE };

/**
 * Первый момент по журналу карточки CRM-канбана, когда колонка назначения — «сдана админам».
 * Активность хранится от новых к старым (`unshift`); обход с конца массива = по времени по возрастанию.
 */
export function firstHandedToAdminsAtFromLinkedOrderKanbanState(
  rawState: unknown,
  orderId: string,
): string | null {
  const oid = String(orderId || "").trim();
  if (!oid) return null;
  const st = rawState as { boards?: unknown } | null;
  const boards = st?.boards;
  if (!Array.isArray(boards)) return null;

  for (const b of boards as KanbanBoard[]) {
    const card = findCardInBoard(b, oid);
    if (!card) continue;
    const act = card.activity || [];
    for (let i = act.length - 1; i >= 0; i--) {
      const text = (act[i]?.text || "").trim();
      const m = text.match(KANBAN_MOVE_TO_COLUMN_RE);
      if (!m) continue;
      const colTitle = (m[1] || "").trim();
      if (!isHandedToAdminsKaitenColumnTitle(colTitle)) continue;
      const at = act[i]?.at;
      if (!at) continue;
      const d = new Date(at);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    return null;
  }
  return null;
}

/** Согласование→производство и уход из сборки по журналу CRM-канбана. */
export function milestonesFromLinkedOrderKanbanState(
  rawState: unknown,
  orderId: string,
): StickerPublicMilestones {
  const oid = String(orderId || "").trim();
  if (!oid) return { agreedAt: null, producedAt: null };
  const st = rawState as { boards?: unknown } | null;
  const boards = st?.boards;
  if (!Array.isArray(boards)) return { agreedAt: null, producedAt: null };

  let agreedAt: string | null = null;
  let producedAt: string | null = null;
  for (const b of boards as KanbanBoard[]) {
    const card = findCardInBoard(b, oid);
    if (!card) continue;
    const m = milestonesFromKanbanActivity(card.activity);
    if (m.agreedAt && (!agreedAt || m.agreedAt < agreedAt)) agreedAt = m.agreedAt;
    if (m.producedAt && (!producedAt || m.producedAt < producedAt)) producedAt = m.producedAt;
  }
  return { agreedAt, producedAt };
}

/** Журнал активности карточки, привязанной к наряду (все доски). */
export function kanbanActivityForLinkedOrder(
  rawState: unknown,
  orderId: string,
): Array<{ at?: string; text?: string }> {
  const oid = String(orderId || "").trim();
  if (!oid) return [];
  const st = rawState as { boards?: unknown } | null;
  const boards = st?.boards;
  if (!Array.isArray(boards)) return [];
  const merged: Array<{ at?: string; text?: string }> = [];
  for (const b of boards as KanbanBoard[]) {
    const card = findCardInBoard(b, oid);
    if (!card?.activity?.length) continue;
    merged.push(...card.activity);
  }
  return merged;
}

/** Доски CRM-канбана из tenant state (для сопоставления «следующая колонка»). */
export function kanbanBoardsFromState(rawState: unknown): KanbanBoard[] {
  const st = rawState as { boards?: unknown } | null;
  const boards = st?.boards;
  if (!Array.isArray(boards)) return [];
  return boards as KanbanBoard[];
}
