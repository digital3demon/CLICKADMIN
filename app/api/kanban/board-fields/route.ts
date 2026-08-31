/**
 * PATCH полей плитки CRM на наряде (люди, колонка, срок). Не Kaiten.
 */
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { persistCrmBoardFieldsOnOrder } from "@/lib/kanban/crm-board-fields.server";

export const dynamic = "force-dynamic";

type Body = {
  orderId?: unknown;
  assignees?: unknown;
  participants?: unknown;
  stageDueYmd?: unknown;
  columnTitle?: unknown;
  sortOrder?: unknown;
  trackLane?: unknown;
  timerStartedAt?: unknown;
  timerDurationMs?: unknown;
  timerFrozenAt?: unknown;
  timerStartedByUserId?: unknown;
  timerParkedAt?: unknown;
  timerParkedRemainingMs?: unknown;
  blocked?: unknown;
  blockReason?: unknown;
  blockedAt?: unknown;
  checklist?: unknown;
};

function asIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((x) => String(x || "").trim()).filter(Boolean);
}

export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId) {
    return NextResponse.json({ error: "Нужен orderId" }, { status: 400 });
  }
  const sortRaw = body.sortOrder;
  const sortOrder =
    typeof sortRaw === "number"
      ? sortRaw
      : typeof sortRaw === "string"
        ? Number.parseFloat(sortRaw)
        : undefined;
  const ok = await persistCrmBoardFieldsOnOrder({
    tenantId,
    orderId,
    assignees: asIds(body.assignees),
    participants: asIds(body.participants),
    stageDueYmd:
      body.stageDueYmd === null
        ? null
        : typeof body.stageDueYmd === "string"
          ? body.stageDueYmd
          : undefined,
    columnTitle:
      typeof body.columnTitle === "string" || body.columnTitle === null
        ? (body.columnTitle as string | null)
        : undefined,
    sortOrder: sortOrder !== undefined && Number.isFinite(sortOrder) ? sortOrder : undefined,
    trackLane: typeof body.trackLane === "string" ? body.trackLane : undefined,
    timerStartedAt:
      body.timerStartedAt === null
        ? null
        : typeof body.timerStartedAt === "string"
          ? body.timerStartedAt
          : undefined,
    timerDurationMs:
      body.timerDurationMs === null
        ? null
        : typeof body.timerDurationMs === "number"
          ? body.timerDurationMs
          : undefined,
    timerFrozenAt:
      body.timerFrozenAt === null
        ? null
        : typeof body.timerFrozenAt === "string"
          ? body.timerFrozenAt
          : undefined,
    timerStartedByUserId:
      body.timerStartedByUserId === null
        ? null
        : typeof body.timerStartedByUserId === "string"
          ? body.timerStartedByUserId
          : undefined,
    timerParkedAt:
      body.timerParkedAt === null
        ? null
        : typeof body.timerParkedAt === "string"
          ? body.timerParkedAt
          : undefined,
    timerParkedRemainingMs:
      body.timerParkedRemainingMs === null
        ? null
        : typeof body.timerParkedRemainingMs === "number"
          ? body.timerParkedRemainingMs
          : undefined,
    blocked: typeof body.blocked === "boolean" ? body.blocked : undefined,
    blockReason:
      body.blockReason === null
        ? null
        : typeof body.blockReason === "string"
          ? body.blockReason
          : undefined,
    blockedAt:
      body.blockedAt === null
        ? null
        : typeof body.blockedAt === "string"
          ? body.blockedAt
          : undefined,
    checklist: body.checklist !== undefined ? body.checklist : undefined,
  });
  if (!ok) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
