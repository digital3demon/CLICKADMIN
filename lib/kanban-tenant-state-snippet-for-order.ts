import type { DemoKanbanColumn } from "@prisma/client";
import type { KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import { crmKanbanLinkedCardId } from "@/lib/kanban-order-card-url";

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
