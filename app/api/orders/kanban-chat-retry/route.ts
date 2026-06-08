import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import type { CardComment, KanbanAppState } from "@/lib/kanban/types";
import {
  buildKaitenCommentTextWithCrmAuthor,
  kaitenJsonIntId,
} from "@/lib/kaiten-comment-parse";
import { getKaitenRestAuth, kaitenCreateComment } from "@/lib/kaiten-rest";

const KANBAN_STATE_KEY = "kanbanAppStateV3";

type Body = { orderIds?: unknown };

function parseState(raw: unknown): KanbanAppState | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Partial<KanbanAppState>;
  if (!Array.isArray(v.boards) || typeof v.activeBoardId !== "string") return null;
  return v as KanbanAppState;
}

function findCardByOrderId(state: KanbanAppState, orderId: string) {
  const oid = String(orderId || "").trim();
  if (!oid) return null;
  for (const board of state.boards || []) {
    for (const col of board.columns || []) {
      for (const card of col.cards || []) {
        if (String(card.linkedOrderId || "").trim() === oid) return card;
      }
    }
  }
  return null;
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const orderIds = Array.isArray(body.orderIds)
    ? body.orderIds
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
  if (orderIds.length === 0) {
    return NextResponse.json({ ok: true, retried: 0, synced: 0 });
  }
  const auth = getKaitenRestAuth();
  if (!auth) {
    return NextResponse.json({ ok: true, retried: 0, synced: 0 });
  }
  const prisma = await getPrisma();
  const ordersPrisma = await getOrdersPrisma();
  const stateRow = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
    select: { value: true, updatedAt: true },
  });
  const state = parseState(stateRow?.value ?? null);
  if (!state || !stateRow) {
    return NextResponse.json({ ok: true, retried: 0, synced: 0 });
  }
  const orders = await ordersPrisma.order.findMany({
    where: { id: { in: orderIds }, tenantId },
    select: { id: true, kaitenCardId: true },
  });
  const kaitenByOrderId = new Map(
    orders
      .filter((o) => o.kaitenCardId != null && Number.isFinite(o.kaitenCardId))
      .map((o) => [o.id, o.kaitenCardId as number]),
  );
  let retried = 0;
  let synced = 0;
  for (const orderId of orderIds) {
    const card = findCardByOrderId(state, orderId);
    const kaitenCardId = kaitenByOrderId.get(orderId);
    if (!card || kaitenCardId == null) continue;
    const list = card.comments || [];
    for (let i = 0; i < list.length; i += 1) {
      const cm = list[i] as CardComment;
      if (cm.source !== "CRM") continue;
      if (!(cm.syncStatus === "failed" || cm.syncStatus === "pending")) continue;
      if (cm.externalCommentId) continue;
      const parentExternalId = cm.externalParentId ? kaitenJsonIntId(cm.externalParentId) : null;
      cm.syncStatus = "retried";
      retried += 1;
      const posted = await kaitenCreateComment(
        auth,
        kaitenCardId,
        buildKaitenCommentTextWithCrmAuthor(cm.authorLabel || "CRM", cm.text || ""),
        parentExternalId,
        { burst: true },
      );
      if (!posted.ok) {
        cm.syncStatus = "failed";
        continue;
      }
      const ext = kaitenJsonIntId(posted.comment?.id);
      cm.syncStatus = "synced";
      cm.syncedAt = new Date().toISOString();
      cm.externalCommentId = ext != null ? String(ext) : null;
      synced += 1;
    }
  }
  if (retried > 0) {
    await prisma.tenantClientState.updateMany({
      where: {
        tenantId,
        key: KANBAN_STATE_KEY,
        updatedAt: stateRow.updatedAt,
      },
      data: { value: state as never },
    });
  }
  return NextResponse.json({ ok: true, retried, synced });
}
