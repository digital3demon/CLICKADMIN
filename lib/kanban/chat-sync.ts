import type { CardComment, KanbanAppState } from "@/lib/kanban/types";

export const KANBAN_CHAT_STATE_KEY = "kanbanAppStateV3";

export type KaitenCommentForSync = {
  id: number;
  text: string;
  created?: string;
  authorName?: string;
  parentId?: number | null;
};

export type CardLocation = {
  boardIndex: number;
  columnIndex: number;
  cardIndex: number;
};

function normalizeSyncStatus(v: unknown): CardComment["syncStatus"] {
  if (
    v === "pending" ||
    v === "synced" ||
    v === "failed" ||
    v === "retried" ||
    v === "local"
  ) {
    return v;
  }
  return "local";
}

export function normalizeCardComment(row: CardComment): CardComment {
  return {
    ...row,
    parentId: row.parentId ?? null,
    externalCommentId: row.externalCommentId ?? null,
    externalParentId: row.externalParentId ?? null,
    source: row.source === "KAITEN" ? "KAITEN" : "CRM",
    syncStatus: normalizeSyncStatus(row.syncStatus),
    syncedAt: row.syncedAt ?? null,
  };
}

export function parseKanbanAppState(raw: unknown): KanbanAppState | null {
  if (!raw || typeof raw !== "object") return null;
  const state = raw as Partial<KanbanAppState>;
  if (!Array.isArray(state.boards)) return null;
  if (typeof state.activeBoardId !== "string") return null;
  return state as KanbanAppState;
}

export function findCardByLinkedOrderId(
  state: KanbanAppState,
  orderId: string,
): CardLocation | null {
  const orderIdTrim = String(orderId || "").trim();
  if (!orderIdTrim) return null;
  for (let bi = 0; bi < state.boards.length; bi += 1) {
    const board = state.boards[bi]!;
    for (let ci = 0; ci < board.columns.length; ci += 1) {
      const col = board.columns[ci]!;
      for (let i = 0; i < col.cards.length; i += 1) {
        const card = col.cards[i]!;
        if (String(card.linkedOrderId || "").trim() !== orderIdTrim) continue;
        return { boardIndex: bi, columnIndex: ci, cardIndex: i };
      }
    }
  }
  return null;
}

function createdIso(value: string | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

/**
 * Upsert комментариев из Kaiten в CRM-карточку.
 * Anti-loop: сообщения с source=CRM и тем же externalCommentId не дублируются.
 */
export function upsertKaitenCommentsToCard(
  comments: CardComment[],
  incoming: KaitenCommentForSync[],
): { next: CardComment[]; changed: boolean } {
  const next = (comments || []).map((row) => normalizeCardComment(row));
  const byExternalId = new Map<string, CardComment>();
  const byId = new Map<string, CardComment>();
  for (const row of next) {
    byId.set(String(row.id), row);
    const ext = String(row.externalCommentId || "").trim();
    if (ext) byExternalId.set(ext, row);
  }
  let changed = false;
  for (const row of incoming) {
    const extId = String(row.id);
    const existing = byExternalId.get(extId);
    if (existing) {
      const nextText = row.text ?? "";
      const nextCreatedAt = createdIso(row.created);
      const nextAuthor = row.authorName?.trim() || existing.authorLabel;
      const nextParentExt = row.parentId != null ? String(row.parentId) : null;
      if (
        existing.text !== nextText ||
        existing.createdAt !== nextCreatedAt ||
        (existing.authorLabel || "") !== (nextAuthor || "") ||
        (existing.externalParentId || null) !== nextParentExt ||
        existing.source !== "KAITEN" ||
        existing.syncStatus !== "synced"
      ) {
        existing.text = nextText;
        existing.createdAt = nextCreatedAt;
        existing.authorLabel = nextAuthor;
        existing.externalParentId = nextParentExt;
        existing.source = "KAITEN";
        existing.syncStatus = "synced";
        existing.syncedAt = new Date().toISOString();
        changed = true;
      }
      continue;
    }
    const created: CardComment = {
      id: `kt-${extId}`,
      userId: "",
      text: row.text ?? "",
      createdAt: createdIso(row.created),
      parentId: null,
      authorLabel: row.authorName?.trim() || undefined,
      externalCommentId: extId,
      externalParentId: row.parentId != null ? String(row.parentId) : null,
      source: "KAITEN",
      syncStatus: "synced",
      syncedAt: new Date().toISOString(),
    };
    next.push(created);
    byExternalId.set(extId, created);
    byId.set(created.id, created);
    changed = true;
  }

  // Resolve local parentId by external ids after upsert.
  for (const row of next) {
    const parentExt = String(row.externalParentId || "").trim();
    if (!parentExt) {
      if (row.parentId != null) {
        row.parentId = null;
        changed = true;
      }
      continue;
    }
    const parent = byExternalId.get(parentExt);
    const targetParentId = parent?.id ?? null;
    if ((row.parentId || null) !== targetParentId) {
      row.parentId = targetParentId;
      changed = true;
    }
  }

  next.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  return { next, changed };
}
