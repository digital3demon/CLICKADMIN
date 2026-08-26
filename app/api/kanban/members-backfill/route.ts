import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import {
  countKanbanMembersBackfillOrders,
  KANBAN_MEMBERS_BACKFILL_BATCH_SIZE,
  runKanbanMembersBackfillBatch,
} from "@/lib/kanban/kaiten-members-backfill";

export const dynamic = "force-dynamic";
/** Не держать пакет дольше прокси — клиент шлёт следующие сам. */
export const maxDuration = 60;

type Body = {
  action?: unknown;
  afterOrderId?: unknown;
  limit?: unknown;
};

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }

  const moduleAccess = await getEffectiveModuleAccess(
    tenantId,
    session.role as UserRole,
  );
  if (
    moduleAccess.KANBAN_MANAGE_ASSIGNEES === false &&
    moduleAccess.KANBAN_MANAGE_PARTICIPANTS === false &&
    session.role !== "OWNER"
  ) {
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });
  }

  const auth = getKaitenRestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Kaiten не настроен" }, { status: 503 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const action = typeof body.action === "string" ? body.action.trim() : "batch";

  if (action === "count") {
    const total = await countKanbanMembersBackfillOrders(tenantId);
    return NextResponse.json({ total });
  }

  const ordersPrisma = await getOrdersPrisma();

  const afterOrderId =
    typeof body.afterOrderId === "string" && body.afterOrderId.trim()
      ? body.afterOrderId.trim()
      : null;
  const limitRaw =
    typeof body.limit === "number"
      ? body.limit
      : typeof body.limit === "string"
        ? Number.parseInt(body.limit, 10)
        : KANBAN_MEMBERS_BACKFILL_BATCH_SIZE;
  const limit = Number.isFinite(limitRaw) ? limitRaw : KANBAN_MEMBERS_BACKFILL_BATCH_SIZE;

  const result = await runKanbanMembersBackfillBatch(ordersPrisma, auth, {
    tenantId,
    afterOrderId,
    limit,
  });

  return NextResponse.json(result);
}
