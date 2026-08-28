/**
 * Плитки одной доски CRM из Order.
 * q нет — живой список; since — дельта. Без description/files и без Kaiten.
 */
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import {
  listCrmBoardTiles,
  listCrmMyTiles,
} from "@/lib/kanban/crm-board-fields.server";
import { isCrmAggregateMyQuery } from "@/lib/kanban/crm-board-tile";
import { loadKanbanTenantState } from "@/lib/kanban/kanban-tenant-state-write.server";
import {
  canUserAccessBoard,
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  KANBAN_BOARD_PRODUCTION_ID,
  kanbanAggregateMode,
} from "@/lib/kanban/model";

export const dynamic = "force-dynamic";

function parseSince(raw: string | null): Date | null {
  const s = (raw || "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }
  const url = new URL(request.url);
  const boardId = (url.searchParams.get("boardId") || "").trim();
  if (!boardId) {
    return NextResponse.json({ error: "Нужен boardId" }, { status: 400 });
  }
  const since = parseSince(url.searchParams.get("since"));
  try {
    const systemBoard =
      boardId === KANBAN_BOARD_ORTHOPEDICS_ID ||
      boardId === KANBAN_BOARD_ORTHODONTICS_ID ||
      boardId === KANBAN_BOARD_PRODUCTION_ID;
    if (!isCrmAggregateMyQuery(boardId) && !systemBoard) {
      const { state } = await loadKanbanTenantState(tenantId);
      const board = state?.boards.find((b) => b.id === boardId);
      if (
        board &&
        !canUserAccessBoard(board, session.sub, session.role as UserRole)
      ) {
        return NextResponse.json({ error: "Нет доступа к доске" }, { status: 403 });
      }
    }
    if (isCrmAggregateMyQuery(boardId)) {
      const mode = kanbanAggregateMode(boardId) ?? "my";
      const { tiles, asOf } = await listCrmMyTiles({
        tenantId,
        viewerRole: session.role as UserRole,
        viewerUserId: session.sub,
        mode,
        since,
      });
      return NextResponse.json({ tiles, asOf, boardId });
    }
    const { tiles, asOf } = await listCrmBoardTiles({
      tenantId,
      viewerRole: session.role as UserRole,
      viewerUserId: session.sub,
      boardId,
      since,
    });
    return NextResponse.json({ tiles, asOf, boardId });
  } catch (e) {
    console.error("[kanban/board-tiles]", e);
    return NextResponse.json({ error: "Не удалось загрузить доску" }, { status: 500 });
  }
}
