import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { clickMigStageCheckmark } from "@/lib/clickmig/kanban-actions.server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const { id } = await params;
  const body = (await req.json()) as { action?: "checkmark" | "cross" };
  const prisma = await getOrdersPrisma();

  if (body.action === "checkmark") {
    await clickMigStageCheckmark(prisma, tenantId, id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Используйте /block для крестика" }, { status: 400 });
}
