import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import type { KanbanCard } from "@/lib/kanban/types";
import type { StandaloneRow } from "@/lib/kanban/standalone-board-sync";

export const dynamic = "force-dynamic";

function rejectLinkedPayload(card: KanbanCard): string | null {
  if (card.linkedOrderId?.trim()) {
    return "Карточка с нарядом не должна попадать в синхрон локальных карточек";
  }
  return null;
}

/** GET: все локальные карточки организации (ортопедия / ортодонтия). */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (session.demo) {
    return NextResponse.json({ rows: [] satisfies StandaloneRow[] });
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }

  const prisma = await getPrisma();
  const dbRows = await prisma.kanbanStandaloneCard.findMany({
    where: { tenantId },
    orderBy: [{ boardId: "asc" }, { columnId: "asc" }, { sortIndex: "asc" }],
  });

  const rows: StandaloneRow[] = dbRows.map((r) => ({
    id: r.id,
    boardId: r.boardId,
    columnId: r.columnId,
    sortIndex: r.sortIndex,
    payload: r.payload as KanbanCard,
  }));

  return NextResponse.json(
    { rows },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/** PUT: полная замена набора локальных карточек организации. */
export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (session.demo) {
    return NextResponse.json({ ok: true, skipped: "demo" });
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const rowsUnknown = (body as { rows?: unknown })?.rows;
  if (!Array.isArray(rowsUnknown)) {
    return NextResponse.json({ error: "Ожидается { rows: [...] }" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const uid = session.sub;

  const normalized: Array<{
    id: string;
    boardId: string;
    columnId: string;
    sortIndex: number;
    payload: KanbanCard;
  }> = [];

  for (const item of rowsUnknown) {
    if (!item || typeof item !== "object") {
      return NextResponse.json({ error: "Некорректный элемент rows" }, { status: 400 });
    }
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const boardId = typeof o.boardId === "string" ? o.boardId.trim() : "";
    const columnId = typeof o.columnId === "string" ? o.columnId.trim() : "";
    const sortIndex = typeof o.sortIndex === "number" && Number.isFinite(o.sortIndex) ? o.sortIndex : 0;
    const payload = o.payload;
    if (!id || !boardId || !columnId || !payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Пропуск id/boardId/columnId/payload" }, { status: 400 });
    }
    const card = payload as KanbanCard;
    const err = rejectLinkedPayload(card);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
    normalized.push({ id, boardId, columnId, sortIndex, payload: card });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.kanbanStandaloneCard.deleteMany({ where: { tenantId } });
      if (normalized.length === 0) return;
      const now = new Date();
      await tx.kanbanStandaloneCard.createMany({
        data: normalized.map((r) => ({
          id: r.id,
          tenantId,
          boardId: r.boardId,
          columnId: r.columnId,
          sortIndex: r.sortIndex,
          payload: r.payload as object,
          updatedAt: now,
          updatedByUserId: uid,
        })),
      });
    });
  } catch (e) {
    console.error("[kanban/standalone-cards PUT]", e);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
