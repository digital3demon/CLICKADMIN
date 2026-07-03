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

/** Нормализация тела для схлопывания дублей CRM/Kaiten с одним текстом. */
export function commentBodyDedupKey(text: string): string {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function commentKeepScore(row: CardComment): number {
  if (row.source === "CRM" && row.syncStatus === "synced") return 5;
  if (row.source === "CRM" && String(row.externalCommentId || "").trim()) return 4;
  if (row.source === "KAITEN" && row.syncStatus === "synced") return 3;
  if (String(row.id || "").startsWith("kt-")) return 2;
  if (row.source === "CRM") return 1;
  return 0;
}

function commentsNearDuplicate(a: CardComment, b: CardComment): boolean {
  const bodyA = commentBodyDedupKey(a.text);
  const bodyB = commentBodyDedupKey(b.text);
  if (!bodyA || bodyA !== bodyB) return false;
  if ((a.authorLabel || "").trim() !== (b.authorLabel || "").trim()) return false;
  const ta = new Date(a.createdAt || "").getTime();
  const tb = new Date(b.createdAt || "").getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return true;
  return Math.abs(ta - tb) <= 20 * 60 * 1000;
}

/** CRM pending без external id ↔ readback Kaiten с тем же телом, автором и окном времени. */
function orphanCrmMatchesIncoming(
  crm: CardComment,
  incoming: KaitenCommentForSync,
): boolean {
  if (crm.source !== "CRM") return false;
  if (String(crm.externalCommentId || "").trim()) return false;

  const bodyKey = commentBodyDedupKey(crm.text);
  const incomingKey = commentBodyDedupKey(incoming.text ?? "");
  if (!bodyKey || bodyKey !== incomingKey) return false;

  const crmAuthor = (crm.authorLabel || "").trim();
  const incomingAuthor = (incoming.authorName || "").trim();
  if (crmAuthor && incomingAuthor && crmAuthor !== incomingAuthor) return false;

  const ta = new Date(crm.createdAt || "").getTime();
  const tb = new Date(createdIso(incoming.created)).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return true;
  return Math.abs(ta - tb) <= 20 * 60 * 1000;
}

/**
 * Убирает дубли: один externalCommentId, схлопывает повторы CRM без external id
 * с уже известным Kaiten-комментарием (тот же текст и автор, ±20 мин).
 */
export function compactCardComments(comments: CardComment[]): CardComment[] {
  const rows = (comments || []).map((row) => normalizeCardComment(row));
  const byExternalId = new Map<string, CardComment>();
  const withoutExternal: CardComment[] = [];

  for (const row of rows) {
    if (row.imageFileId) {
      withoutExternal.push(row);
      continue;
    }
    const ext = String(row.externalCommentId || "").trim();
    if (!ext && String(row.id || "").startsWith("kt-")) {
      const fromId = row.id.slice(3);
      if (fromId) {
        row.externalCommentId = fromId;
        row.source = "KAITEN";
        row.syncStatus = "synced";
      }
    }
    const extResolved = String(row.externalCommentId || "").trim();
    if (extResolved) {
      const prev = byExternalId.get(extResolved);
      if (!prev || commentKeepScore(row) > commentKeepScore(prev)) {
        byExternalId.set(extResolved, row);
      }
      continue;
    }
    withoutExternal.push(row);
  }

  const kept = [...byExternalId.values()];
  const out: CardComment[] = [...kept];

  for (const row of withoutExternal) {
    if (row.imageFileId) {
      const dupImg = out.some((x) => x.imageFileId === row.imageFileId);
      if (!dupImg) out.push(row);
      continue;
    }
    const duplicate = out.some((existing) => commentsNearDuplicate(existing, row));
    if (duplicate) continue;
    out.push(row);
  }

  out.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  const final: CardComment[] = [];
  for (const row of out) {
    if (row.imageFileId) {
      final.push(row);
      continue;
    }
    const dupeIdx = final.findIndex((existing) => commentsNearDuplicate(existing, row));
    if (dupeIdx < 0) {
      final.push(row);
      continue;
    }
    const prev = final[dupeIdx]!;
    const rowScore = commentKeepScore(row);
    const prevScore = commentKeepScore(prev);
    if (rowScore > prevScore) {
      final[dupeIdx] = row;
      continue;
    }
    if (
      rowScore === prevScore &&
      String(row.externalCommentId || row.id) <
        String(prev.externalCommentId || prev.id)
    ) {
      final[dupeIdx] = row;
    }
  }
  final.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  return final;
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
      const nextSource = existing.source === "CRM" ? "CRM" : "KAITEN";
      if (
        existing.text !== nextText ||
        existing.createdAt !== nextCreatedAt ||
        (existing.authorLabel || "") !== (nextAuthor || "") ||
        (existing.externalParentId || null) !== nextParentExt ||
        existing.source !== nextSource ||
        existing.syncStatus !== "synced"
      ) {
        existing.text = nextText;
        existing.createdAt = nextCreatedAt;
        existing.authorLabel = nextAuthor;
        existing.externalParentId = nextParentExt;
        existing.source = nextSource;
        existing.syncStatus = "synced";
        existing.syncedAt = new Date().toISOString();
        changed = true;
      }
      continue;
    }
    const orphanCrm = next.find((c) => orphanCrmMatchesIncoming(c, row));
    if (orphanCrm) {
      orphanCrm.externalCommentId = extId;
      orphanCrm.externalParentId = row.parentId != null ? String(row.parentId) : null;
      orphanCrm.authorLabel = row.authorName?.trim() || orphanCrm.authorLabel;
      orphanCrm.createdAt = createdIso(row.created);
      orphanCrm.syncStatus = "synced";
      orphanCrm.syncedAt = new Date().toISOString();
      byExternalId.set(extId, orphanCrm);
      changed = true;
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

  const compacted = compactCardComments(next);
  if (compacted.length !== next.length) changed = true;
  return { next: compacted, changed };
}

/** Снапшот Kaiten (poll) → merge в локальные комментарии карточки без слепой замены. */
export function mergeKaitenSnapshotIntoCardComments(
  existing: CardComment[],
  snapshot: CardComment[],
): CardComment[] {
  const incoming: KaitenCommentForSync[] = [];
  for (const row of snapshot || []) {
    const fromExt = String(row.externalCommentId || "").trim();
    const fromId =
      fromExt ||
      (String(row.id || "").startsWith("kt-") ? String(row.id).slice(3) : "");
    const kid = Number(fromId);
    if (!Number.isFinite(kid)) continue;
    incoming.push({
      id: Math.trunc(kid),
      text: row.text ?? "",
      created: row.createdAt,
      authorName: row.authorLabel,
      parentId: row.externalParentId ? Number(row.externalParentId) : null,
    });
  }
  return upsertKaitenCommentsToCard(existing, incoming).next;
}
