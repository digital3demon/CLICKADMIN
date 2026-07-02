import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { moveClickMigOrderColumn } from "@/lib/clickmig/kanban-actions.server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const { id } = await params;
  const body = (await req.json()) as { kanbanColumnId?: string };
  if (!body.kanbanColumnId) {
    return NextResponse.json({ error: "kanbanColumnId required" }, { status: 400 });
  }
  const prisma = await getOrdersPrisma();
  await moveClickMigOrderColumn(prisma, tenantId, id, body.kanbanColumnId);
  return NextResponse.json({ ok: true });
}
