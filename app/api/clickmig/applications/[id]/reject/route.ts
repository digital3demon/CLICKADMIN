import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { rejectClickMigApplication } from "@/lib/clickmig/accept-application.server";

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
  const body = (await req.json()) as { reason?: string };
  const reason = body.reason?.trim() ?? "";
  if (!reason) {
    return NextResponse.json({ error: "Укажите причину отказа" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  try {
    await rejectClickMigApplication(prisma, tenantId, id, reason, session.sub);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    const status = msg === "APPLICATION_NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ error: msg }, { status });
  }
}
